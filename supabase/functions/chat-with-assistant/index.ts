
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import OpenAI from 'https://cdn.skypack.dev/openai@3.3.0';

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
    
    // Create OpenAI client with the specific version that works with assistants
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log("API Key available:", !!openAIApiKey);
    
    if (!openAIApiKey) {
      throw new Error("OpenAI API key is not set");
    }
    
    // Initialize OpenAI with the API key
    const openai = new OpenAI(openAIApiKey);

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

    // Use existing thread or create a new one
    let thread;
    if (threadId) {
      console.log("Using existing thread:", threadId);
      thread = await openai.beta.threads.retrieve(threadId);
    } else {
      console.log("Creating new thread");
      thread = await openai.beta.threads.create();
    }

    // Create the message in the thread
    console.log("Creating message in thread");
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });

    // Handle file attachments if needed
    if (attachments && attachments.length > 0) {
      console.log("Attachments provided but not processed in this version");
    }

    // Run the assistant on the thread
    console.log("Running assistant");
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
      instructions: structuredOutput 
        ? "Please provide structured data for visualization when relevant. Format data as clean arrays of objects for tables and charts. Include clear, descriptive headers."
        : undefined
    });
    
    console.log("Started run:", run.id);

    // Poll for the run completion
    let currentRun = run;
    while (currentRun.status !== 'completed' && currentRun.status !== 'failed') {
      console.log("Run status:", currentRun.status);
      
      // Add a delay between polling attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        currentRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      } catch (error) {
        console.error("Error retrieving run status:", error);
        throw new Error(`Failed to retrieve run status: ${error.message}`);
      }
    }

    if (currentRun.status === 'failed') {
      throw new Error(`Run failed with reason: ${currentRun.last_error?.message || 'Unknown error'}`);
    }

    // Get all messages from the thread
    console.log("Run completed, retrieving messages");
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
    
    if (assistantMessages.length === 0) {
      throw new Error("No assistant messages found in thread");
    }
    
    const latestMessage = assistantMessages[0];

    // Process the response
    let responseText = '';
    let visualizations = [];

    // Safety check before processing content
    if (!latestMessage.content || !Array.isArray(latestMessage.content)) {
      throw new Error("Invalid message structure received from OpenAI");
    }

    for (const content of latestMessage.content) {
      if (content.type === 'text') {
        responseText += content.text.value;
      }
    }

    // Process structured data for visualization
    // First, check for JSON code blocks in the response
    const jsonRegex = /```json\n([\s\S]*?)\n```/g;
    let match;
    while ((match = jsonRegex.exec(responseText)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        
        // Check if this is visualization data
        if (jsonData.type && (jsonData.type === 'table' || jsonData.type === 'chart') && jsonData.data) {
          // Add a unique ID to the visualization
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

    // Clean up the response by removing JSON blocks that we've processed
    responseText = responseText.replace(jsonRegex, '');

    console.log("Successfully processed response with visualizations:", visualizations.length);

    // Return the response
    return new Response(
      JSON.stringify({
        thread_id: thread.id,
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
