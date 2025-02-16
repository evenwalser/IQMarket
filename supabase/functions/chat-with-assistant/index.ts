import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper function to extract metrics data from text
function extractMetricsData(text: string) {
  const metrics: Record<string, any>[] = [];
  const lines = text.split('\n');
  let currentData: Record<string, any> = {};
  let isInCodeBlock = false;
  let dataFound = false;

  for (const line of lines) {
    // Skip code blocks
    if (line.includes('```')) {
      isInCodeBlock = !isInCodeBlock;
      continue;
    }
    if (isInCodeBlock || line.includes('import') || line.includes('plt.')) {
      continue;
    }

    // Look for metric declarations
    if (line.includes('=')) {
      const parts = line.split('=').map(part => part.trim());
      if (parts.length === 2) {
        let values: number[] = [];
        // Try to extract array of numbers
        const match = parts[1].match(/\[([\d., ]+)\]/);
        if (match) {
          values = match[1].split(',').map(v => parseFloat(v.trim()));
          if (!isNaN(values[0])) {
            const key = parts[0]
              .replace('_values', '')
              .replace('_medians', '')
              .replace('_', ' ')
              .trim();
            currentData[key] = values;
            dataFound = true;
          }
        }
      }
    } else if (line.includes(':')) {
      // Handle key-value pair format
      const [key, valueStr] = line.split(':').map(s => s.trim());
      if (key && valueStr) {
        const value = valueStr
          .replace('$', '')
          .replace('M', '')
          .replace('%', '')
          .replace('months', '')
          .replace('x', '')
          .replace('~', '')
          .trim();
        
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          if (!currentData.metrics) {
            currentData.metrics = [];
          }
          currentData.metrics.push({
            name: key,
            value: numValue
          });
          dataFound = true;
        }
      }
    }
  }

  if (dataFound) {
    metrics.push(currentData);
  }

  return metrics;
}

// Function to create visualizations from metrics data
function createVisualizations(metricsData: Record<string, any>[]) {
  const visualizations = [];

  for (const data of metricsData) {
    if (data.metrics) {
      // Create table visualization
      visualizations.push({
        type: 'table',
        data: data.metrics,
        headers: ['Metric', 'Value']
      });

      // Create bar chart visualization
      visualizations.push({
        type: 'chart',
        chartType: 'bar',
        data: data.metrics,
        xKey: 'name',
        yKeys: ['value'],
        height: 400
      });
    } else {
      // Handle array data format
      const metrics = Object.keys(data).filter(key => Array.isArray(data[key]));
      if (metrics.length > 0) {
        const chartData = [];
        const categories = ['Current', 'Median', 'Top Quartile'];
        
        metrics.forEach((metric, index) => {
          const values = data[metric];
          if (Array.isArray(values)) {
            values.forEach((value, i) => {
              chartData.push({
                metric,
                category: categories[i],
                value
              });
            });
          }
        });

        if (chartData.length > 0) {
          // Create comparison table
          visualizations.push({
            type: 'table',
            data: chartData,
            headers: ['Metric', 'Category', 'Value']
          });

          // Create grouped bar chart
          visualizations.push({
            type: 'chart',
            chartType: 'bar',
            data: chartData,
            xKey: 'metric',
            yKeys: categories.map(cat => `${cat} Value`),
            height: 400
          });
        }
      }
    }
  }

  return visualizations;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, assistantType, attachments } = await req.json();
    console.log('Received request:', { message, assistantType, attachments });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the assistant ID
    const { data: assistantId, error: assistantError } = await supabase
      .rpc('get_assistant_id', { assistant_type: assistantType });

    if (assistantError || !assistantId) {
      console.error('Error getting assistant ID:', assistantError);
      throw new Error(`Failed to get assistant ID for type ${assistantType}`);
    }

    console.log('Using assistant ID:', assistantId);

    // Create a thread first
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
    });

    if (!threadResponse.ok) {
      const error = await threadResponse.text();
      console.error('Thread creation error:', error);
      throw new Error(`Failed to create thread: ${error}`);
    }

    const thread = await threadResponse.json();
    console.log('Thread created:', thread);

    // Upload files to OpenAI and add them to the thread
    const uploadedFiles = [];
    if (attachments && attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments...`);
      
      for (const attachment of attachments) {
        console.log('Processing attachment:', {
          name: attachment.name,
          url: attachment.url,
          type: attachment.type
        });
        
        try {
          // Fetch the file from the Supabase URL
          const response = await fetch(attachment.url);
          console.log('Fetch response status:', response.status);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
          }

          // Get the file data
          const fileBlob = await response.blob();
          console.log('File blob size:', fileBlob.size);
          
          // Create form data
          const formData = new FormData();
          formData.append('file', fileBlob, attachment.name);
          formData.append('purpose', 'assistants');
          
          // Upload to OpenAI
          console.log('Uploading to OpenAI...');
          const uploadResponse = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`
            },
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('OpenAI upload error:', errorText);
            throw new Error(`Failed to upload file to OpenAI: ${errorText}`);
          }
          
          const fileData = await uploadResponse.json();
          console.log('File uploaded successfully to OpenAI:', fileData);
          
          // Add file to thread
          const fileAttachmentResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({
              role: 'user',
              content: '',
              file_ids: [fileData.id]
            }),
          });

          if (!fileAttachmentResponse.ok) {
            const errorText = await fileAttachmentResponse.text();
            console.error('File attachment error:', errorText);
            throw new Error(`Failed to attach file to thread: ${errorText}`);
          }

          uploadedFiles.push(fileData.id);
        } catch (error) {
          console.error('Error processing attachment:', error);
        }
      }
    }

    // Send the user's message to the thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      }),
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.text();
      console.error('Message creation error:', error);
      throw new Error(`Failed to create message: ${error}`);
    }

    const messageResult = await messageResponse.json();
    console.log('Message created:', messageResult);

    // Start the run
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error('Run creation error:', error);
      throw new Error(`Failed to create run: ${error}`);
    }

    const run = await runResponse.json();
    console.log('Run created:', run);

    // Poll for completion
    let runStatus;
    let attempts = 0;
    const maxAttempts = 60;

    do {
      if (attempts >= maxAttempts) {
        throw new Error('Run timed out after 60 seconds');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
        {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
        }
      );

      if (!statusResponse.ok) {
        const error = await statusResponse.text();
        console.error('Status check error:', error);
        throw new Error(`Failed to check run status: ${error}`);
      }

      runStatus = await statusResponse.json();
      console.log('Run status:', runStatus.status);
      attempts++;
    } while (runStatus.status === 'in_progress' || runStatus.status === 'queued');

    if (runStatus.status === 'completed') {
      const messagesResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/messages?limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
        }
      );

      if (!messagesResponse.ok) {
        throw new Error('Failed to retrieve messages');
      }

      const messagesData = await messagesResponse.json();
      const lastMessage = messagesData.data[0];
      let responseText = '';
      let visualizations = [];

      if (lastMessage.content && Array.isArray(lastMessage.content)) {
        for (const content of lastMessage.content) {
          if (content.type === 'text') {
            const text = content.text.value;
            responseText = text;

            // Extract metrics and create visualizations
            const metricsData = extractMetricsData(text);
            console.log('Extracted metrics data:', metricsData);
            
            if (metricsData.length > 0) {
              visualizations = createVisualizations(metricsData);
              console.log('Created visualizations:', visualizations);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          response: responseText,
          thread_id: thread.id,
          assistant_id: assistantId,
          visualizations
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Run failed with status:', runStatus);
      throw new Error(`Run ended with status: ${runStatus.status}`);
    }

  } catch (error) {
    console.error('Error in chat-with-assistant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
