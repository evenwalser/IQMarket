
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { parse as parseCSV } from "https://deno.land/std@0.181.0/encoding/csv.ts";
import { decode as base64Decode } from "https://deno.land/std@0.181.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FileData {
  arr?: number;
  growth?: number;
  nrr?: number;
  cacPayback?: number;
}

async function processExcelOrCSV(fileContent: Uint8Array, fileName: string): Promise<FileData> {
  console.log('Processing file:', fileName);
  
  let data: any[] = [];
  if (fileName.toLowerCase().endsWith('.csv')) {
    const text = new TextDecoder().decode(fileContent);
    data = await parseCSV(text, { skipFirstRow: true });
  } else if (fileName.toLowerCase().endsWith('.xlsx')) {
    // For Excel files, we'll ask the user to convert to CSV for now
    throw new Error('Excel files are currently not supported. Please convert to CSV format.');
  }

  console.log('Parsed data:', data);

  const metrics: FileData = {};
  const requiredColumns = ['ARR', 'Growth', 'NRR', 'CAC Payback'];
  const missingColumns: string[] = [];

  // Check for columns with different possible names
  const columnMappings = {
    'ARR': ['ARR', 'Annual Recurring Revenue', 'Revenue'],
    'Growth': ['Growth', 'Growth Rate', 'YoY Growth'],
    'NRR': ['NRR', 'Net Revenue Retention', 'Net Dollar Retention'],
    'CAC Payback': ['CAC Payback', 'CAC', 'Customer Acquisition Cost Payback']
  };

  for (const [metric, possibleNames] of Object.entries(columnMappings)) {
    let found = false;
    for (const name of possibleNames) {
      const value = data[0]?.[name];
      if (value !== undefined) {
        metrics[metric.toLowerCase().replace(' ', 'Payback') as keyof FileData] = parseFloat(value);
        found = true;
        break;
      }
    }
    if (!found) {
      missingColumns.push(metric);
    }
  }

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  console.log('Extracted metrics:', metrics);
  return metrics;
}

async function processPDF(fileContent: Uint8Array): Promise<FileData> {
  console.log('Processing PDF file');
  
  // For PDF processing, we'll use regex patterns to find metrics
  const text = new TextDecoder().decode(fileContent);
  
  const metrics: FileData = {};
  const patterns = {
    arr: /ARR:?\s*\$?(\d+(?:\.\d+)?)\s*(?:M|Million)?/i,
    growth: /Growth:?\s*(\d+(?:\.\d+)?)\s*%?/i,
    nrr: /NRR:?\s*(\d+(?:\.\d+)?)\s*%?/i,
    cacPayback: /CAC\s*Payback:?\s*(\d+(?:\.\d+)?)/i
  };

  for (const [metric, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      let value = parseFloat(match[1]);
      // Convert millions to actual value if 'M' or 'Million' is present
      if (match[0].includes('M') || match[0].toLowerCase().includes('million')) {
        value *= 1000000;
      }
      metrics[metric as keyof FileData] = value;
    }
  }

  const missingMetrics = Object.entries(patterns)
    .filter(([metric]) => metrics[metric as keyof FileData] === undefined)
    .map(([metric]) => metric.toUpperCase());

  if (missingMetrics.length > 0) {
    throw new Error(`Data not found in file for: ${missingMetrics.join(', ')}`);
  }

  console.log('Extracted metrics from PDF:', metrics);
  return metrics;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, assistantType, attachments } = await req.json();
    console.log('Received request:', { message, assistantType, attachments });

    if (!attachments || attachments.length === 0) {
      throw new Error('No attachments provided');
    }

    // Process the first attachment
    const attachment = attachments[0];
    console.log('Processing attachment:', attachment);

    // Download the file from storage
    const response = await fetch(attachment.url);
    const fileContent = new Uint8Array(await response.arrayBuffer());

    // Extract metrics based on file type
    let metrics: FileData;
    if (attachment.file_name.toLowerCase().endsWith('.pdf')) {
      metrics = await processPDF(fileContent);
    } else if (attachment.file_name.toLowerCase().match(/\.(xlsx|csv)$/)) {
      metrics = await processExcelOrCSV(fileContent, attachment.file_name);
    } else {
      throw new Error('Unsupported file type. Please upload a PDF or CSV file.');
    }

    console.log('Final extracted metrics:', metrics);

    // Get the appropriate assistant ID based on type
    const assistantId = {
      knowledge: Deno.env.get('FOUNDER_WISDOM_ASSISTANT_ID'),
      frameworks: Deno.env.get('FRAMEWORKS_ASSISTANT_ID'),
      benchmarks: Deno.env.get('BENCHMARKS_ASSISTANT_ID')
    }[assistantType];

    if (!assistantId) {
      throw new Error('Invalid assistant type');
    }

    // Create OpenAI client
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a SaaS metrics analyst. Use the following exact metrics in your response:
              ARR: $${metrics.arr?.toLocaleString()}
              Growth Rate: ${metrics.growth}%
              NRR: ${metrics.nrr}%
              CAC Payback: ${metrics.cacPayback} months
              
              Do not use any placeholder values. If any metric is missing, explicitly state "Data not found" for that metric.
              Always include the actual values in your response, formatted with appropriate units.`
          },
          {
            role: 'user',
            content: message
          }
        ],
      })
    });

    const aiData = await openAIResponse.json();
    
    if (!aiData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    return new Response(
      JSON.stringify({
        response: aiData.choices[0].message.content,
        metrics: metrics,
        assistant_id: assistantId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
