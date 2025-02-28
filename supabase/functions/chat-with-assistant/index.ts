
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { OpenAI } from 'https://esm.sh/openai@4.0.0';

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

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get OpenAI client
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    });

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

    // Use existing thread or create a new one
    let thread;
    if (threadId) {
      thread = await openai.beta.threads.retrieve(threadId);
    } else {
      thread = await openai.beta.threads.create();
    }

    // Upload any file attachments
    let fileIds = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        const { fileId } = attachment;
        if (fileId) {
          fileIds.push(fileId);
        }
      }
    }

    // Create the message in the thread
    const messageParams = {
      role: "user",
      content: message,
      ...(fileIds.length > 0 && { file_ids: fileIds }),
    };

    await openai.beta.threads.messages.create(thread.id, messageParams);

    // Run the assistant on the thread
    let run;
    if (structuredOutput) {
      run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
        instructions: "Please provide structured data for visualization when relevant. Format data as clean arrays of objects for tables and charts. Include clear, descriptive headers.",
      });
    } else {
      run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
      });
    }

    // Poll for the run completion
    while (run.status !== 'completed' && run.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (run.status === 'failed') {
      throw new Error(`Run failed with reason: ${run.last_error?.message || 'Unknown error'}`);
    }

    // Get all messages from the thread
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
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

    // Store the conversation in the database
    const sessionId = crypto.randomUUID();
    
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        thread_id: thread.id,
        assistant_id: assistantId,
        assistant_type: assistantType,
        query: message,
        response: responseText,
        visualizations: visualizations.length > 0 ? visualizations : null,
        session_id: sessionId
      })
      .select()
      .single();

    if (conversationError) {
      throw new Error(`Error storing conversation: ${conversationError.message}`);
    }

    // Return the response
    return new Response(
      JSON.stringify({
        threadId: thread.id,
        response: responseText,
        visualizations,
        conversationId: conversation.id
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
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
