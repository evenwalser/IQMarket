
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

function generateThreadId() {
  return 'thread_' + crypto.randomUUID();
}

async function fetchAndEncodeFile(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64String = base64Encode(new Uint8Array(arrayBuffer));
  return base64String;
}

function parseMetrics(text: string) {
  const metrics: any[] = [];
  const lines = text.split('\n');
  let isInMetricsSection = false;
  let currentMetric: any = {};

  for (const line of lines) {
    if (!line.trim() || line.includes('```')) {
      continue;
    }

    if (line.toLowerCase().includes('metrics:')) {
      isInMetricsSection = true;
      continue;
    }

    if (isInMetricsSection && line.includes(':')) {
      const [key, valueStr] = line.split(':').map(s => s.trim());
      if (key && valueStr) {
        const cleanValue = valueStr
          .replace('$', '')
          .replace('M', '000000')
          .replace('K', '000')
          .replace('%', '')
          .replace('months', '')
          .replace('~', '')
          .replace('x', '')
          .trim();

        const value = !isNaN(parseFloat(cleanValue)) ? parseFloat(cleanValue) : cleanValue;

        if (value !== '') {
          currentMetric = { Metric: key };
          
          if (valueStr.toLowerCase().includes('quartile')) {
            if (valueStr.toLowerCase().includes('top')) {
              currentMetric['Top Quartile'] = value;
            } else if (valueStr.toLowerCase().includes('bottom')) {
              currentMetric['Bottom Quartile'] = value;
            }
          } else if (valueStr.toLowerCase().includes('median')) {
            currentMetric['Median'] = value;
          } else if (valueStr.toLowerCase().includes('decile')) {
            if (valueStr.toLowerCase().includes('top')) {
              currentMetric['Top Decile'] = value;
            }
          } else {
            currentMetric['Value'] = value;
          }

          metrics.push(currentMetric);
        }
      }
    }
  }

  return metrics;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, assistantType, attachments } = await req.json();
    console.log('Processing request:', { message, assistantType, attachments });

    const threadId = generateThreadId();
    const assistantId = `${assistantType}_assistant`;

    let systemMessage = `You are a data analyst specializing in SaaS benchmarks and metrics analysis. 
Your role is to analyze financial metrics and provide benchmark comparisons. Focus on:
1. Extracting key metrics from documents
2. Comparing with industry benchmarks
3. Providing Python code for visualization
4. Generating actionable insights

Format all metrics consistently:
Metrics:
ARR: $1.5M
Growth Rate: 150%
NRR: 120%

Include benchmark comparisons:
Metric | Current | Bottom Quartile | Median | Top Quartile
------|---------|----------------|--------|-------------
ARR   | $1.5M   | $1.0M          | $2.0M  | $5.0M

Always provide Python visualization code:
\`\`\`python
import pandas as pd
import matplotlib.pyplot as plt
metrics_df = pd.DataFrame({
    'Metric': ['ARR', 'Growth'],
    'Value': [1.5, 150],
    'Benchmark': [2.0, 120]
})
\`\`\``;

    let userContent = message;

    // Process attachments if present
    const contentParts: any[] = [{ type: "text", text: userContent }];

    if (attachments && attachments.length > 0) {
      console.log('Processing attachments:', attachments);

      for (const attachment of attachments) {
        if (attachment.type === 'image') {
          contentParts.push({
            type: "image_url",
            image_url: { url: attachment.url }
          });
        } else {
          // For PDFs, fetch and encode the content
          try {
            console.log('Fetching PDF:', attachment.url);
            const base64Content = await fetchAndEncodeFile(attachment.url);
            contentParts.push({
              type: "text",
              text: `PDF Content (${attachment.name}):\n[base64 encoded PDF content]`
            });
            
            // Add the actual PDF content as base64
            userContent += `\n\nPDF Content (${attachment.name}):\n${base64Content}`;
          } catch (error) {
            console.error('Error fetching PDF:', error);
            throw new Error(`Failed to fetch PDF content: ${error.message}`);
          }
        }
      }
    }

    console.log('Preparing messages for OpenAI');

    const apiMessages = [
      {
        role: "system",
        content: systemMessage
      },
      {
        role: "user",
        content: contentParts.length > 1 ? contentParts : userContent
      }
    ];

    console.log('Sending request to OpenAI');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: apiMessages,
        max_tokens: 4096,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI error:', errorData);
      throw new Error(`Failed to get response from OpenAI: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const assistantResponse = data.choices[0].message.content;
    console.log('Parsing metrics from response');

    const metrics = parseMetrics(assistantResponse);
    console.log('Parsed metrics:', metrics);

    let visualizations = [];
    
    if (metrics.length > 0) {
      visualizations.push({
        type: 'table',
        data: metrics,
        headers: Object.keys(metrics[0])
      });

      const chartData = metrics.map(metric => {
        const chartPoint: any = {
          category: metric.Metric,
          value: metric.Value,
          bottomQuartile: metric['Bottom Quartile'],
          median: metric.Median,
          topQuartile: metric['Top Quartile']
        };
        return chartPoint;
      }).filter(point => typeof point.value === 'number');

      if (chartData.length > 0) {
        visualizations.push({
          type: 'chart',
          chartType: 'bar',
          data: chartData,
          xKey: 'category',
          yKeys: ['value', 'bottomQuartile', 'median', 'topQuartile'],
          height: 400
        });
      }
    }

    console.log('Created visualizations:', visualizations);

    return new Response(
      JSON.stringify({
        response: assistantResponse,
        thread_id: threadId,
        assistant_id: assistantId,
        visualizations: visualizations
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
