import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, assistantType } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: assistantId, error: assistantError } = await supabase
      .rpc('get_assistant_id', { assistant_type: assistantType });

    if (assistantError || !assistantId) {
      console.error('Error getting assistant ID:', assistantError);
      throw new Error(`Failed to get assistant ID for type ${assistantType}`);
    }

    console.log('Using assistant ID:', assistantId);

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

    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId
      }),
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error('Run creation error:', error);
      throw new Error(`Failed to create run: ${error}`);
    }

    const runData = await runResponse.json();
    console.log('Run created:', runData);

    let runStatus;
    let attempts = 0;
    const maxAttempts = 60;

    do {
      if (attempts >= maxAttempts) {
        throw new Error('Run timed out after 60 seconds');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${runData.id}`,
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
        const error = await messagesResponse.text();
        console.error('Messages retrieval error:', error);
        throw new Error(`Failed to retrieve messages: ${error}`);
      }

      const messagesData = await messagesResponse.json();
      console.log('Messages data:', messagesData);

      if (!messagesData.data || messagesData.data.length === 0) {
        throw new Error('No messages found in the response');
      }

      const lastMessage = messagesData.data[0];
      console.log('Last message:', lastMessage);

      let responseText = '';
      if (lastMessage.content && Array.isArray(lastMessage.content)) {
        for (const content of lastMessage.content) {
          if (content.type === 'text') {
            responseText += content.text.value + ' ';
          }
        }
        responseText = responseText.trim();
      }

      if (!responseText) {
        throw new Error('No text content found in the message');
      }

      const benchmarkData = [
        { category: 'Bottom Quartile (80-85%)', value: 82.5 },
        { category: 'Median (91%)', value: 91 },
        { category: 'Top Quartile (95%)', value: 95 },
        { category: 'Top Decile (99-100%)', value: 99.5 },
        { category: 'Your GRR (78%)', value: 78 }
      ];

      const visualization = {
        type: 'chart',
        data: benchmarkData,
        chartType: 'bar',
        xKey: 'value',
        yKeys: ['category'],
        height: 400
      };

      return new Response(
        JSON.stringify({
          response: responseText,
          thread_id: thread.id,
          assistant_id: assistantId,
          visualizations: [visualization]
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
