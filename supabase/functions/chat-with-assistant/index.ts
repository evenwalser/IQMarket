
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

function generateThreadId() {
  return 'thread_' + crypto.randomUUID();
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

    let systemMessage = `You are a data analyst specializing in SaaS benchmarks and metrics analysis. Your role is to:
1. Extract and analyze metrics from both text and PDF documents
2. Generate Python code for data analysis
3. Present comparative analysis with industry benchmarks
4. Generate clear, data-driven insights

When analyzing PDFs or documents:
1. First extract and list all key metrics found
2. Then generate Python code to analyze those metrics
3. Finally provide benchmark comparisons

Format metrics like this:
Metrics:
ARR: $1.5M
Growth Rate: 150%
NRR: 120%

For each metric, provide benchmark comparisons:
Metric: Current Value
Bottom Quartile: value
Median: value
Top Quartile: value

Always include Python code for analysis:
\`\`\`python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

metrics = {
    'Metric': ['ARR', 'Growth Rate', 'NRR'],
    'Value': [1.5, 150, 120],
    'Bottom_Quartile': [1.0, 80, 100],
    'Median': [2.0, 120, 110],
    'Top_Quartile': [5.0, 200, 130]
}
df = pd.DataFrame(metrics)

# Visualization code...
\`\`\``;

    let userContent = message;
    if (attachments && attachments.length > 0) {
      const attachmentDescriptions = attachments.map(att => {
        if (att.type === 'image') {
          return `Image: ${att.name}\nURL: ${att.url}\n`;
        } else {
          return `PDF Document: ${att.name}\nURL: ${att.url}\nPlease analyze this PDF document thoroughly and extract all relevant metrics and data points.\n`;
        }
      }).join('\n');

      userContent += `\n\nPlease analyze the following documents and provide a comprehensive analysis:\n${attachmentDescriptions}\n\nFor PDFs, please extract and analyze all relevant metrics, then provide Python code for visualization and analysis.`;
    }

    console.log('Preparing messages for OpenAI');

    const apiMessages = [
      {
        role: "system",
        content: systemMessage
      },
      {
        role: "user",
        content: attachments?.some(att => att.type === "image")
          ? [
              { type: "text", text: userContent },
              ...attachments
                .filter(att => att.type === "image")
                .map(att => ({
                  type: "image_url",
                  image_url: { url: att.url }
                }))
            ]
          : userContent
      }
    ];

    console.log('Sending request to OpenAI:', { messages: apiMessages });

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
    console.log('OpenAI response data:', data);

    const assistantResponse = data.choices[0].message.content;
    console.log('Assistant response:', assistantResponse);

    // Parse metrics from the response
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
