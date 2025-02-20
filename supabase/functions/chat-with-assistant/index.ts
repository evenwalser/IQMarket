
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

function parseMetrics(text: string) {
  const metrics: any[] = [];
  const lines = text.split('\n');
  let isInMetricsSection = false;
  let currentMetric: any = {};

  for (const line of lines) {
    // Skip empty lines and code blocks
    if (!line.trim() || line.includes('```') || line.includes('import') || line.includes('plt.')) {
      continue;
    }

    // Check for metrics section headers
    if (line.toLowerCase().includes('metrics:') || line.toLowerCase().includes('comparison:')) {
      isInMetricsSection = true;
      continue;
    }

    if (isInMetricsSection && line.includes(':')) {
      const [key, valueStr] = line.split(':').map(s => s.trim());
      if (key && valueStr) {
        // Clean the value string
        const cleanValue = valueStr
          .replace('$', '')
          .replace('M', '000000')
          .replace('K', '000')
          .replace('%', '')
          .replace('months', '')
          .replace('~', '')
          .replace('x', '')
          .trim();

        // Try to parse as number if possible
        const value = !isNaN(parseFloat(cleanValue)) ? parseFloat(cleanValue) : cleanValue;

        if (value !== '') {
          currentMetric = { Metric: key };
          
          // Determine the type of value and assign to appropriate column
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

    // Prepare the messages array with the system message and user query
    const messages = [
      {
        role: "system",
        content: `You are an AI advisor specializing in ${assistantType}. When discussing metrics or comparisons, always present them in a clear format like:

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
`
      },
      {
        role: "user",
        content: message
      }
    ];

    // Add attachments to the message if present
    if (attachments && attachments.length > 0) {
      messages[1].content += "\n\nAttachments:\n" + 
        attachments.map(att => `- ${att.name}: ${att.url}`).join('\n');
    }

    console.log('Sending request to OpenAI:', { messages });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
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

    // Parse metrics from the response
    const metrics = parseMetrics(assistantResponse);
    console.log('Parsed metrics:', metrics);

    let visualizations = [];
    
    if (metrics.length > 0) {
      // Create table visualization
      visualizations.push({
        type: 'table',
        data: metrics,
        headers: Object.keys(metrics[0])
      });

      // Create chart visualization for comparing metrics
      // Filter metrics that have numerical values
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
