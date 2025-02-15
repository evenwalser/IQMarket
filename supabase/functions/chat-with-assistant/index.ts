
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    console.log('Received request:', { message, assistantType });

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the assistant ID using the database function
    const { data: assistantData, error: assistantError } = await supabase
      .rpc('get_assistant_id', { assistant_type: assistantType });

    if (assistantError) {
      console.error('Error getting assistant ID:', assistantError);
      throw new Error(`Failed to get assistant ID: ${assistantError.message}`);
    }

    const assistantId = assistantData;
    if (!assistantId) {
      throw new Error(`No assistant ID found for type: ${assistantType}`);
    }

    console.log('Using assistant ID:', assistantId);

    // Create a thread
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

    // Add message to thread
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

    // Run assistant
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

    // Poll for completion
    let runStatus;
    let attempts = 0;
    const maxAttempts = 30; // Maximum 30 seconds wait time
    
    do {
      if (attempts >= maxAttempts) {
        throw new Error('Run timed out after 30 seconds');
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
      // Get messages
      const messagesResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/messages`,
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
      const lastMessage = messagesData.data[0];

      if (!lastMessage?.content?.[0]?.text?.value) {
        throw new Error('No response content found in the message');
      }

      return new Response(
        JSON.stringify({
          response: lastMessage.content[0].text.value,
          thread_id: thread.id,
          assistant_id: assistantId
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
