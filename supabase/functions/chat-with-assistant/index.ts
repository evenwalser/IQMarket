
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { parse as parseCSV } from "https://deno.land/std@0.181.0/encoding/csv.ts";
import { read, utils } from 'https://esm.sh/xlsx-js-style@1.2.0';
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
  try {
    if (fileName.toLowerCase().endsWith('.csv')) {
      const text = new TextDecoder().decode(fileContent);
      data = await parseCSV(text, { skipFirstRow: true });
      console.log('Successfully parsed CSV data:', data);
    } else if (fileName.toLowerCase().endsWith('.xlsx')) {
      const workbook = read(fileContent);
      console.log('Excel sheets available:', workbook.SheetNames);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      data = utils.sheet_to_json(firstSheet);
      console.log('Successfully parsed Excel data:', data);
    }
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error(`Failed to process ${fileName}: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No data found in the file');
  }

  console.log('Processing data:', data);

  const metrics: FileData = {};
  const columnMappings = {
    'ARR': ['ARR', 'Annual Recurring Revenue', 'Revenue'],
    'Growth': ['Growth', 'Growth Rate', 'YoY Growth'],
    'NRR': ['NRR', 'Net Revenue Retention', 'Net Dollar Retention'],
    'CAC Payback': ['CAC Payback', 'CAC', 'Customer Acquisition Cost Payback']
  };

  for (const [metric, possibleNames] of Object.entries(columnMappings)) {
    for (const name of possibleNames) {
      const value = data[0]?.[name];
      if (value !== undefined) {
        const numValue = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
        if (!isNaN(numValue)) {
          metrics[metric.toLowerCase().replace(' ', 'Payback') as keyof FileData] = numValue;
          console.log(`Found ${metric}:`, numValue);
          break;
        }
      }
    }
  }

  const missingMetrics = Object.entries(columnMappings)
    .filter(([metric]) => metrics[metric.toLowerCase().replace(' ', 'Payback') as keyof FileData] === undefined)
    .map(([metric]) => metric);

  if (missingMetrics.length > 0) {
    throw new Error(`Missing required metrics: ${missingMetrics.join(', ')}`);
  }

  console.log('Final extracted metrics:', metrics);
  return metrics;
}

async function processPDF(fileContent: Uint8Array): Promise<FileData> {
  console.log('Processing PDF file');
  
  const text = new TextDecoder().decode(fileContent);
  console.log('PDF content length:', text.length);
  
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
      if (match[0].includes('M') || match[0].toLowerCase().includes('million')) {
        value *= 1000000;
      }
      metrics[metric as keyof FileData] = value;
      console.log(`Found ${metric}:`, value);
    }
  }

  const missingMetrics = Object.entries(patterns)
    .filter(([metric]) => metrics[metric as keyof FileData] === undefined)
    .map(([metric]) => metric.toUpperCase());

  if (missingMetrics.length > 0) {
    throw new Error(`Data not found in PDF for: ${missingMetrics.join(', ')}`);
  }

  console.log('Final extracted metrics from PDF:', metrics);
  return metrics;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, assistantType, attachments } = await req.json();
    console.log('Received request:', {
      messageLength: message?.length,
      assistantType,
      attachmentsCount: attachments?.length
    });

    if (!attachments || attachments.length === 0) {
      throw new Error('No attachments provided');
    }

    const attachment = attachments[0];
    console.log('Processing attachment:', {
      fileName: attachment.file_name,
      fileType: attachment.content_type,
      url: attachment.url
    });

    const response = await fetch(attachment.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const fileContent = new Uint8Array(await response.arrayBuffer());
    console.log('File content length:', fileContent.length);

    let metrics: FileData;
    if (attachment.file_name.toLowerCase().endsWith('.pdf')) {
      metrics = await processPDF(fileContent);
    } else if (attachment.file_name.toLowerCase().match(/\.(xlsx|csv)$/)) {
      metrics = await processExcelOrCSV(fileContent, attachment.file_name);
    } else {
      throw new Error('Unsupported file type. Please upload a PDF, XLSX, or CSV file.');
    }

    const assistantId = {
      knowledge: Deno.env.get('FOUNDER_WISDOM_ASSISTANT_ID'),
      frameworks: Deno.env.get('FRAMEWORKS_ASSISTANT_ID'),
      benchmarks: Deno.env.get('BENCHMARKS_ASSISTANT_ID')
    }[assistantType];

    if (!assistantId) {
      throw new Error(`Invalid assistant type: ${assistantType}`);
    }

    console.log('Using assistant:', assistantId);

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} ${openAIResponse.statusText}`);
    }

    const aiData = await openAIResponse.json();
    console.log('OpenAI response received:', {
      hasChoices: !!aiData.choices,
      choicesLength: aiData.choices?.length
    });
    
    if (!aiData.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response:', aiData);
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
