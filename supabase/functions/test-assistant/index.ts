
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
    const assistantId = Deno.env.get('BENCHMARKS_ASSISTANT_ID');

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

    // Poll for completion
    let runStatus = runData.status;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Assistant run timed out');
      }

      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
      
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadData.id}/runs/${runData.id}`,
        {
          headers: {
            "Authorization": `Bearer ${openAiApiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2"
          }
        }
      );

      const statusData = await statusResponse.json();
      console.log(`Status check attempt ${attempts + 1}:`, statusData);

      if (!statusResponse.ok) {
        throw new Error(`Failed to check run status: ${JSON.stringify(statusData)}`);
      }

      runStatus = statusData.status;
      attempts++;
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus}`);
    }

    // Get the final message
    const messagesResponse = await fetch(
      `https://api.openai.com/v1/threads/${threadData.id}/messages`,
      {
        headers: {
          "Authorization": `Bearer ${openAiApiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    const messagesData = await messagesResponse.json();
    console.log('Final messages:', messagesData);

    if (!messagesResponse.ok) {
      throw new Error(`Failed to retrieve messages: ${JSON.stringify(messagesData)}`);
    }

    return new Response(
      JSON.stringify({ 
        threadId: threadData.id,
        messageId: messageData.id,
        runId: runData.id,
        status: 'Test completed successfully',
        finalMessage: messagesData.data[0]?.content[0]?.text?.value || 'No response received'
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
