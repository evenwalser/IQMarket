
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
    console.log('Fetch response status:', req.status);
    const requestText = await req.text();
    console.log('Raw request body:', requestText);

    const requestData = JSON.parse(requestText);
    console.log('Parsed request data:', requestData);

    const { message, assistantType } = requestData;

    if (!message || !assistantType) {
      console.error('Missing required fields:', { message, assistantType });
      throw new Error('Missing required fields: message and assistantType are required');
    }

    // Get the appropriate assistant ID based on type
    const assistantId = {
      knowledge: Deno.env.get('FOUNDER_WISDOM_ASSISTANT_ID'),
      frameworks: Deno.env.get('FRAMEWORKS_ASSISTANT_ID'),
      benchmarks: Deno.env.get('BENCHMARKS_ASSISTANT_ID')
    }[assistantType];

    if (!assistantId) {
      console.error('Invalid assistant type:', assistantType);
      throw new Error(`Invalid assistant type: ${assistantType}`);
    }

    console.log('Using assistant:', { assistantType, assistantId });

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create a thread
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      }
    });

    if (!threadResponse.ok) {
      const errorText = await threadResponse.text();
      console.error('Thread creation failed:', errorText);
      throw new Error(`Failed to create thread: ${errorText}`);
    }

    const threadData = await threadResponse.json();
    console.log('Thread created:', threadData);

    // Add message to thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      console.error('Message creation failed:', errorText);
      throw new Error(`Failed to add message: ${errorText}`);
    }

    const messageData = await messageResponse.json();
    console.log('Message added:', messageData);

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error('Run creation failed:', errorText);
      throw new Error(`Failed to run assistant: ${errorText}`);
    }

    const runData = await runResponse.json();
    console.log('Run created:', runData);

    // Poll for completion
    let runStatus = runData.status;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Assistant run timed out');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadData.id}/runs/${runData.id}`,
        {
          headers: {
            'Authorization': `Bearer ${openAiApiKey}`,
            'OpenAI-Beta': 'assistants=v1'
          }
        }
      );

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Status check failed:', errorText);
        throw new Error(`Failed to check run status: ${errorText}`);
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;

      console.log('Run status:', runStatus);
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus}`);
    }

    // Get messages
    const messagesResponse = await fetch(
      `https://api.openai.com/v1/threads/${threadData.id}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      }
    );

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error('Messages retrieval failed:', errorText);
      throw new Error(`Failed to retrieve messages: ${errorText}`);
    }

    const messagesData = await messagesResponse.json();
    console.log('Messages received:', messagesData);

    if (!messagesData.data || messagesData.data.length === 0) {
      throw new Error('No messages received from assistant');
    }

    const assistantMessage = messagesData.data[0];
    
    if (!assistantMessage.content || assistantMessage.content.length === 0) {
      throw new Error('Empty message content received from assistant');
    }

    const responseData = {
      response: assistantMessage.content[0].text.value,
      thread_id: threadData.id,
      assistant_id: assistantId,
      visualizations: []
    };

    console.log('Sending response:', responseData);

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
    console.error('Error in chat-with-assistant function:', error);
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
