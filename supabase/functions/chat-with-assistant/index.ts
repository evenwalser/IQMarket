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
    if (!line.trim() || line.includes('```') || line.includes('import') || line.includes('plt.')) {
      continue;
    }

    if (line.toLowerCase().includes('metrics:') || line.toLowerCase().includes('comparison:')) {
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

    let systemMessage = `You are an AI advisor specializing in ${assistantType}. Your role is to:
1. Analyze both text input and any provided attachments
2. Extract and present key metrics in a structured format
3. Provide insights and recommendations

When discussing metrics or comparisons, always present them in a clear format like:

Metrics:
ARR: $1.5M
Growth Rate: 150%
NRR: 120%
CAC Payback: 18 months

For benchmarks, use this format:
Metric: Value
Bottom Quartile: value
Median: value
Top Quartile: value
Top Decile: value (if available)

If files are provided, analyze their content and include relevant insights in your response.`;

    let userContent = message;

    if (attachments && attachments.length > 0) {
      const attachmentDescriptions = attachments.map(att => {
        const type = att.type === 'image' ? 'Image' : 'Document';
        return `${type}: ${att.name}\nURL: ${att.url}\n`;
      }).join('\n');

      userContent += `\n\nPlease analyze the following attachments:\n${attachmentDescriptions}`;
      
      const images = attachments.filter(att => att.type === 'image');
      if (images.length > 0) {
        userContent += "\n\nThe images above show relevant information that should be included in the analysis.";
      }
    }

    console.log('Preparing messages for OpenAI');

    const messages = [
      {
        role: "system",
        content: systemMessage
      },
      {
        role: "user",
        content: userContent
      }
    ];

    const apiMessages = messages.map(msg => {
      if (msg.role === "user" && attachments?.some(att => att.type === "image")) {
        return {
          role: msg.role,
          content: [
            { type: "text", text: msg.content },
            ...attachments
              .filter(att => att.type === "image")
              .map(att => ({
                type: "image_url",
                image_url: { url: att.url }
              }))
          ]
        };
      }
      return msg;
    });

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
        max_tokens: 4096
      })
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI error:', errorData);
      throw new Error(`Failed to get response from OpenAI: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('OpenAI response data:', data);

    const assistantResponse = data.choices[0].message.content;
    console.log('Assistant response:', assistantResponse);

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
        };
        
        if (typeof metric.Value === 'number') {
          chartPoint.value = metric.Value;
        }
        if (typeof metric['Bottom Quartile'] === 'number') {
          chartPoint.value = metric['Bottom Quartile'];
        }
        if (typeof metric.Median === 'number') {
          chartPoint.value = metric.Median;
        }
        if (typeof metric['Top Quartile'] === 'number') {
          chartPoint.value = metric['Top Quartile'];
        }
        if (typeof metric['Top Decile'] === 'number') {
          chartPoint.value = metric['Top Decile'];
        }
        
        return chartPoint;
      }).filter(point => typeof point.value === 'number');

      if (chartData.length > 0) {
        visualizations.push({
          type: 'chart',
          chartType: 'bar',
          data: chartData,
          xKey: 'category',
          yKeys: ['value'],
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
