
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
    console.log('Starting function execution...');
    const requestText = await req.text();
    console.log('Raw request body:', requestText);

    let requestData;
    try {
      requestData = JSON.parse(requestText);
      console.log('Parsed request data:', requestData);
    } catch (parseError) {
      console.error('Error parsing request:', parseError);
      throw new Error(`Failed to parse request: ${parseError.message}`);
    }

    const { message, assistantType } = requestData;
    console.log('Extracted message and assistantType:', { message, assistantType });

    // Get the appropriate assistant ID
    const assistantId = {
      knowledge: Deno.env.get('FOUNDER_WISDOM_ASSISTANT_ID'),
      frameworks: Deno.env.get('FRAMEWORKS_ASSISTANT_ID'),
      benchmarks: Deno.env.get('BENCHMARKS_ASSISTANT_ID')
    }[assistantType];
    
    console.log('Retrieved assistant ID:', assistantId);

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OpenAI API key retrieved:', !!openAiApiKey);

    const openAiHeaders = {
      'Authorization': `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    };

    // Create a thread
    console.log('Creating thread...');
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: openAiHeaders
    });

    const threadResponseText = await threadResponse.text();
    console.log('Thread response:', threadResponseText);

    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${threadResponseText}`);
    }

    const threadData = JSON.parse(threadResponseText);
    console.log('Thread created:', threadData);

    // Add message to thread
    console.log('Adding message to thread...');
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
      method: 'POST',
      headers: openAiHeaders,
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    });

    const messageResponseText = await messageResponse.text();
    console.log('Message response:', messageResponseText);

    if (!messageResponse.ok) {
      throw new Error(`Failed to add message: ${messageResponseText}`);
    }

    const messageData = JSON.parse(messageResponseText);
    console.log('Message added:', messageData);

    // Run the assistant
    console.log('Running assistant...');
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs`, {
      method: 'POST',
      headers: openAiHeaders,
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });

    const runResponseText = await runResponse.text();
    console.log('Run response:', runResponseText);

    if (!runResponse.ok) {
      throw new Error(`Failed to run assistant: ${runResponseText}`);
    }

    const runData = JSON.parse(runResponseText);
    console.log('Run created:', runData);

    // Poll for completion with increased timeout and delay
    let runStatus = runData.status;
    let attempts = 0;
    const maxAttempts = 120; // Doubled from 60 to 120 attempts
    const pollingDelay = 2000; // Increased delay to 2 seconds between attempts
    
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Assistant run timed out');
      }

      console.log(`Waiting ${pollingDelay}ms before next status check...`);
      await new Promise(resolve => setTimeout(resolve, pollingDelay));
      
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadData.id}/runs/${runData.id}`,
        {
          headers: openAiHeaders
        }
      );

      const statusResponseText = await statusResponse.text();
      console.log(`Status check attempt ${attempts + 1}:`, statusResponseText);

      if (!statusResponse.ok) {
        throw new Error(`Failed to check run status: ${statusResponseText}`);
      }

      const statusData = JSON.parse(statusResponseText);
      runStatus = statusData.status;
      console.log(`Current status: ${runStatus}`);
      attempts++;
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus}`);
    }

    // Get messages
    console.log('Retrieving messages...');
    const messagesResponse = await fetch(
      `https://api.openai.com/v1/threads/${threadData.id}/messages`,
      {
        headers: openAiHeaders
      }
    );

    const messagesResponseText = await messagesResponse.text();
    console.log('Messages response:', messagesResponseText);

    if (!messagesResponse.ok) {
      throw new Error(`Failed to retrieve messages: ${messagesResponseText}`);
    }

    const messagesData = JSON.parse(messagesResponseText);
    console.log('Messages received:', messagesData);

    const assistantMessage = messagesData.data[0];
    
    const responseData = {
      response: assistantMessage.content[0].text.value,
      thread_id: threadData.id,
      assistant_id: assistantId,
      visualizations: []
    };

    console.log('Sending final response:', responseData);

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        cause: error.cause
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
