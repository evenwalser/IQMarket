
// Import specific modules we need rather than the entire OpenAI SDK
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get request body
    const { message, assistantType, attachments = [], structuredOutput = false, threadId } = await req.json();

    console.log("Request received:", { message, assistantType, attachmentsCount: attachments.length, structuredOutput, threadId });

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get our assistant ID based on the type from our database function
    const { data: assistantId, error: assistantError } = await supabase.rpc(
      'get_assistant_id',
      { assistant_type: assistantType }
    );

    if (assistantError) {
      throw new Error(`Error fetching assistant ID: ${assistantError.message}`);
    }

    // If no assistant ID was returned, throw an error
    if (!assistantId) {
      throw new Error(`No assistant ID found for type: ${assistantType}`);
    }

    console.log("Using assistant ID:", assistantId);

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error("OpenAI API key is not set");
    }
    
    // Instead of using the OpenAI SDK, we'll use direct API calls
    // Create or retrieve thread
    let threadId2 = threadId;
    if (!threadId2) {
      console.log("Creating new thread via direct API call");
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1'
        },
        body: JSON.stringify({})
      });
      
      if (!threadResponse.ok) {
        const errorData = await threadResponse.json();
        throw new Error(`Failed to create thread: ${JSON.stringify(errorData)}`);
      }
      
      const threadData = await threadResponse.json();
      threadId2 = threadData.id;
    }
    
    console.log("Using thread ID:", threadId2);
    
    // Add message to thread
    console.log("Adding message to thread");
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId2}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    });
    
    if (!messageResponse.ok) {
      const errorData = await messageResponse.json();
      throw new Error(`Failed to add message: ${JSON.stringify(errorData)}`);
    }
    
    // Run the assistant
    console.log("Running assistant");
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId2}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        instructions: structuredOutput 
          ? "Please provide structured data for visualization when relevant. Format data as clean arrays of objects for tables and charts. Include clear, descriptive headers."
          : undefined
      })
    });
    
    if (!runResponse.ok) {
      const errorData = await runResponse.json();
      throw new Error(`Failed to start run: ${JSON.stringify(errorData)}`);
    }
    
    const runData = await runResponse.json();
    const runId = runData.id;
    console.log("Started run:", runId);
    
    // Poll for run completion
    let currentRun;
    let runStatus = 'in_progress';
    
    while (runStatus !== 'completed' && runStatus !== 'failed') {
      console.log("Checking run status...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const runCheckResponse = await fetch(`https://api.openai.com/v1/threads/${threadId2}/runs/${runId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      
      if (!runCheckResponse.ok) {
        const errorData = await runCheckResponse.json();
        throw new Error(`Failed to check run status: ${JSON.stringify(errorData)}`);
      }
      
      currentRun = await runCheckResponse.json();
      runStatus = currentRun.status;
      console.log("Run status:", runStatus);
    }
    
    if (runStatus === 'failed') {
      throw new Error(`Run failed with reason: ${currentRun?.last_error?.message || 'Unknown error'}`);
    }
    
    // Get messages
    console.log("Run completed, retrieving messages");
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId2}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      }
    });
    
    if (!messagesResponse.ok) {
      const errorData = await messagesResponse.json();
      throw new Error(`Failed to retrieve messages: ${JSON.stringify(errorData)}`);
    }
    
    const messagesData = await messagesResponse.json();
    const assistantMessages = messagesData.data.filter(msg => msg.role === 'assistant');
    
    if (assistantMessages.length === 0) {
      throw new Error("No assistant messages found in thread");
    }
    
    const latestMessage = assistantMessages[0];
    
    // Process the response
    let responseText = '';
    let visualizations = [];
    
    for (const content of latestMessage.content) {
      if (content.type === 'text') {
        responseText += content.text.value;
      }
    }
    
    // Process structured data for visualization
    const jsonRegex = /```json\n([\s\S]*?)\n```/g;
    let match;
    while ((match = jsonRegex.exec(responseText)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        
        if (jsonData.type && (jsonData.type === 'table' || jsonData.type === 'chart') && jsonData.data) {
          const vizId = crypto.randomUUID();
          const visualization = {
            id: vizId,
            ...jsonData
          };
          visualizations.push(visualization);
        }
      } catch (e) {
        console.error('Error parsing JSON in response:', e);
      }
    }
    
    // Clean up the response
    responseText = responseText.replace(jsonRegex, '');
    
    console.log("Successfully processed response with visualizations:", visualizations.length);
    
    // Return the response
    return new Response(
      JSON.stringify({
        thread_id: threadId2,
        assistant_id: assistantId,
        response: responseText,
        visualizations: visualizations.length > 0 ? visualizations : []
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
