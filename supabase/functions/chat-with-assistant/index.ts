
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const founderWisdomAssistantId = Deno.env.get('FOUNDER_WISDOM_ASSISTANT_ID');
const notivatorAssistantId = Deno.env.get('NOTIVATOR_ASSISTANT_ID');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, assistantType, threadId } = await req.json();

    // Select the appropriate assistant ID based on the type
    const assistantId = assistantType === 'frameworks' 
      ? notivatorAssistantId 
      : founderWisdomAssistantId;

    if (!assistantId) {
      throw new Error(`Assistant ID not found for type: ${assistantType}`);
    }

    // Create or retrieve thread
    let thread;
    if (threadId) {
      const threadResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1'
        },
      });
      thread = await threadResponse.json();
    } else {
      const createThreadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1'
        },
      });
      thread = await createThreadResponse.json();
    }

    // Add message to thread
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      }),
    });

    // Run assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        assistant_id: assistantId
      }),
    });

    const runData = await runResponse.json();

    // Poll for completion
    let runStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${runData.id}`,
        {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v1'
          },
        }
      );
      runStatus = await statusResponse.json();
      console.log('Run status:', runStatus.status);
    } while (runStatus.status === 'in_progress' || runStatus.status === 'queued');

    if (runStatus.status === 'completed') {
      // Get messages
      const messagesResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v1'
          },
        }
      );
      const messagesData = await messagesResponse.json();
      const lastMessage = messagesData.data[0];

      return new Response(
        JSON.stringify({
          response: lastMessage.content[0].text.value,
          thread_id: thread.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(`Run ended with status: ${runStatus.status}`);
    }

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
