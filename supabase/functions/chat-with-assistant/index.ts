
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

  const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  try {
    const { message, assistantType, attachments, threadId } = await req.json();
    console.log('Received request:', { message, assistantType, attachmentCount: attachments?.length, threadId });

    // Step 1: Upload files to OpenAI if there are attachments
    let openAiFileIds: string[] = [];
    if (attachments && attachments.length > 0) {
      console.log('Processing attachments:', attachments);
      
      for (const attachment of attachments) {
        // Fetch file from Supabase storage
        const fileResponse = await fetch(`${attachment.url}`);
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file from storage: ${fileResponse.statusText}`);
        }
        const fileBlob = await fileResponse.blob();
        
        // Create form data for OpenAI file upload
        const formData = new FormData();
        formData.append('file', fileBlob, attachment.file_name);
        formData.append('purpose', 'assistants');

        console.log('Uploading file to OpenAI:', {
          name: attachment.file_name,
          size: fileBlob.size,
          type: fileBlob.type
        });

        // Upload to OpenAI
        const openAiUploadResponse = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiApiKey}`,
            // Note: Don't set Content-Type header when sending FormData
          },
          body: formData
        });

        const uploadResult = await openAiUploadResponse.json();
        console.log('OpenAI file upload response:', uploadResult);

        if (!openAiUploadResponse.ok) {
          throw new Error(`Failed to upload file to OpenAI: ${JSON.stringify(uploadResult)}`);
        }

        openAiFileIds.push(uploadResult.id);
      }
    }

    // Step 2: Create or use existing thread
    let currentThreadId = threadId;
    if (!currentThreadId) {
      console.log('Creating new thread with message:', message);
      const createThreadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: message,
            file_ids: openAiFileIds
          }]
        })
      });

      const threadData = await createThreadResponse.json();
      console.log('Thread creation response:', threadData);

      if (!createThreadResponse.ok) {
        throw new Error(`Failed to create thread: ${JSON.stringify(threadData)}`);
      }

      currentThreadId = threadData.id;
    } else {
      // Add message to existing thread
      console.log('Adding message to existing thread:', currentThreadId);
      const addMessageResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: message,
          file_ids: openAiFileIds
        })
      });

      const messageData = await addMessageResponse.json();
      console.log('Message addition response:', messageData);

      if (!addMessageResponse.ok) {
        throw new Error(`Failed to add message: ${JSON.stringify(messageData)}`);
      }
    }

    // Step 3: Create a run
    const assistantId = Deno.env.get(`${assistantType.toUpperCase()}_ASSISTANT_ID`);
    console.log('Creating run with assistant:', assistantId);

    const createRunResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        model: 'gpt-4o-mini'
      })
    });

    const runData = await createRunResponse.json();
    console.log('Run creation response:', runData);

    if (!createRunResponse.ok) {
      throw new Error(`Failed to create run: ${JSON.stringify(runData)}`);
    }

    // Step 4: Poll for completion
    let runStatus = runData.status;
    let attempts = 0;
    const maxAttempts = 60;

    while (runStatus === 'queued' || runStatus === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Run timed out');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const checkStatusResponse = await fetch(
        `https://api.openai.com/v1/threads/${currentThreadId}/runs/${runData.id}`,
        {
          headers: {
            'Authorization': `Bearer ${openAiApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );

      const statusData = await checkStatusResponse.json();
      console.log(`Run status check attempt ${attempts + 1}:`, statusData);

      if (!checkStatusResponse.ok) {
        throw new Error(`Failed to check run status: ${JSON.stringify(statusData)}`);
      }

      runStatus = statusData.status;
      attempts++;
    }

    if (runStatus !== 'completed') {
      throw new Error(`Run failed with status: ${runStatus}`);
    }

    // Step 5: Retrieve messages
    const messagesResponse = await fetch(
      `https://api.openai.com/v1/threads/${currentThreadId}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      }
    );

    const messagesData = await messagesResponse.json();
    console.log('Messages retrieval response:', messagesData);

    if (!messagesResponse.ok) {
      throw new Error(`Failed to retrieve messages: ${JSON.stringify(messagesData)}`);
    }

    // Get the latest assistant message
    const assistantMessages = messagesData.data.filter((msg: any) => msg.role === 'assistant');
    const latestMessage = assistantMessages[0];

    if (!latestMessage) {
      throw new Error('No assistant response found');
    }

    // Clean up OpenAI files after use
    for (const fileId of openAiFileIds) {
      try {
        const deleteResponse = await fetch(`https://api.openai.com/v1/files/${fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${openAiApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        console.log(`File cleanup response for ${fileId}:`, await deleteResponse.json());
      } catch (error) {
        console.error(`Failed to delete file ${fileId}:`, error);
        // Continue even if file deletion fails
      }
    }

    return new Response(
      JSON.stringify({
        response: latestMessage.content[0].text.value,
        thread_id: currentThreadId,
        assistant_id: assistantId,
        run_id: runData.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

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
