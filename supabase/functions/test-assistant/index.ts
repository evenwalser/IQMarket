
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    const assistantId = Deno.env.get('BENCHMARKS_ASSISTANT_ID'); // Using benchmarks assistant for testing

    console.log('Starting API test...');

    // First create a thread
    const threadResponse = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      }
    });

    const threadData = await threadResponse.json();
    console.log('Thread created:', threadData);

    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${JSON.stringify(threadData)}`);
    }

    // Add a message to the thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        role: "user",
        content: "What is the average series A valuation for SaaS companies?"
      })
    });

    const messageData = await messageResponse.json();
    console.log('Message added:', messageData);

    if (!messageResponse.ok) {
      throw new Error(`Failed to add message: ${JSON.stringify(messageData)}`);
    }

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });

    const runData = await runResponse.json();
    console.log('Run created:', runData);

    if (!runResponse.ok) {
      throw new Error(`Failed to run assistant: ${JSON.stringify(runData)}`);
    }

    return new Response(
      JSON.stringify({ 
        threadId: threadData.id,
        messageId: messageData.id,
        runId: runData.id,
        status: 'Test completed successfully'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
