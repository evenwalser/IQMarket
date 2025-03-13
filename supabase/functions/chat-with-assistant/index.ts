
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

    console.log("Request received:", { 
      message, 
      assistantType, 
      attachmentsCount: attachments.length, 
      attachments: attachments.map(a => ({ url: a.url, name: a.file_name })),
      structuredOutput, 
      threadId 
    });

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
    
    // Create or retrieve thread using v2 API
    let threadId2 = threadId;
    if (!threadId2) {
      console.log("Creating new thread via direct API call");
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
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
    
    // Process attachments for OpenAI
    let messageContent = [];
    
    // Add the text message
    messageContent.push({
      type: 'text',
      text: message
    });
    
    // Add file attachments if present
    if (attachments && attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments for OpenAI`);
      
      // First upload the files to OpenAI
      const fileIds = [];
      
      for (const attachment of attachments) {
        try {
          // Get the file from the public URL
          console.log(`Fetching file from URL: ${attachment.url}`);
          const fileResponse = await fetch(attachment.url);
          
          if (!fileResponse.ok) {
            console.error(`Failed to fetch file from URL: ${attachment.url}, status: ${fileResponse.status}`);
            continue;
          }
          
          // Get the file as blob
          const fileBlob = await fileResponse.blob();
          
          // Create a FormData object for the file upload
          const formData = new FormData();
          formData.append('purpose', 'assistants');
          formData.append('file', fileBlob, attachment.file_name || 'attachment');
          
          // Upload file to OpenAI
          console.log(`Uploading file to OpenAI: ${attachment.file_name}`);
          const uploadResponse = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`
            },
            body: formData
          });
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            console.error(`Failed to upload file to OpenAI: ${JSON.stringify(errorData)}`);
            continue;
          }
          
          const uploadData = await uploadResponse.json();
          console.log(`File uploaded to OpenAI successfully with ID: ${uploadData.id}`);
          
          // Add the file ID to our list
          fileIds.push(uploadData.id);
          
          // Also include the file attachment in the message content
          messageContent.push({
            type: 'file_attachment',
            file_id: uploadData.id
          });
        } catch (fileError) {
          console.error(`Error processing attachment: ${fileError.message}`);
        }
      }
      
      console.log(`Successfully processed ${fileIds.length} files for OpenAI`);
    }
    
    // Add message to thread with v2 API - now using the messageContent array
    console.log("Adding message to thread with content:", JSON.stringify(messageContent));
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId2}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: messageContent
      })
    });
    
    if (!messageResponse.ok) {
      const errorData = await messageResponse.json();
      throw new Error(`Failed to add message: ${JSON.stringify(errorData)}`);
    }
    
    // Run the assistant with v2 API
    console.log("Running assistant");
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId2}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        instructions: `IMPORTANT: You must ONLY provide information that is available in your vector database. Do not generate or provide information from your general knowledge. If the answer is not in your vector database, explicitly state that the information is not available in your knowledge base. ${structuredOutput ? "Please provide structured data for visualization when relevant. Format data as clean arrays of objects for tables and charts. Include clear, descriptive headers." : ""}`
      })
    });
    
    if (!runResponse.ok) {
      const errorData = await runResponse.json();
      throw new Error(`Failed to start run: ${JSON.stringify(errorData)}`);
    }
    
    const runData = await runResponse.json();
    const runId = runData.id;
    console.log("Started run:", runId);
    
    // Poll for run completion with v2 API
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
          'OpenAI-Beta': 'assistants=v2'
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
    
    // Get messages with v2 API
    console.log("Run completed, retrieving messages");
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId2}/messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
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
