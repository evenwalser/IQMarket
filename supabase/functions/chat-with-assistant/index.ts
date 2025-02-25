
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, assistantType, attachments, threadId } = await req.json();
    console.log('Received request:', { message, assistantType, attachmentCount: attachments?.length, threadId });

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Step 1: Upload files to OpenAI
    let openAiFileIds: string[] = [];
    if (attachments && attachments.length > 0) {
      console.log('Processing attachments:', attachments);

      for (const attachment of attachments) {
        // Download file from Supabase
        const { data: fileBuffer, error: downloadError } = await supabase.storage
          .from('chat-attachments')
          .download(attachment.file_path);

        if (downloadError) {
          throw new Error(`Failed to download file from Supabase: ${downloadError.message}`);
        }

        // Create form data with the actual file
        const formData = new FormData();
        formData.append('file', new Blob([fileBuffer], { type: attachment.content_type }), attachment.file_name);
        formData.append('purpose', 'assistants');

        console.log('Uploading file to OpenAI:', {
          name: attachment.file_name,
          type: attachment.content_type,
          size: fileBuffer.size
        });

        const openAiUploadResponse = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
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
      // Create the thread with just the message
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
            content: message
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
      // For existing threads, add new message
      const addMessageResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: message
        })
      });

      const messageData = await addMessageResponse.json();
      console.log('Message addition response:', messageData);

      if (!addMessageResponse.ok) {
        throw new Error(`Failed to add message: ${JSON.stringify(messageData)}`);
      }
    }

    // Step 3: Create a run with the correct model and attach files
    const assistantId = Deno.env.get(`${assistantType.toUpperCase()}_ASSISTANT_ID`);
    const createRunResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        model: 'gpt-4o-mini-2024-07-18',
        file_ids: openAiFileIds // Attach files during run creation
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
