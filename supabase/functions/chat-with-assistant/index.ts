
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, assistantType, attachments } = await req.json();
    console.log('Received request:', {
      messageLength: message?.length,
      assistantType,
      attachmentsCount: attachments?.length
    });

    if (!attachments || attachments.length === 0) {
      throw new Error('No attachments provided');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Download file from Supabase Storage
    const attachment = attachments[0];
    console.log('Processing attachment:', {
      fileName: attachment.file_name,
      fileType: attachment.content_type,
      url: attachment.url
    });

    const fileResponse = await fetch(attachment.url);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    // Upload file to OpenAI
    const formData = new FormData();
    const blob = await fileResponse.blob();
    formData.append('purpose', 'assistants');
    formData.append('file', blob, attachment.file_name);

    console.log('Uploading file to OpenAI...');
    const uploadResponse = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('OpenAI file upload error:', errorText);
      throw new Error(`Failed to upload file to OpenAI: ${uploadResponse.statusText}`);
    }

    const uploadData = await uploadResponse.json();
    console.log('File uploaded to OpenAI:', uploadData);

    // Get the appropriate assistant ID based on type
    const assistantId = {
      knowledge: Deno.env.get('FOUNDER_WISDOM_ASSISTANT_ID'),
      frameworks: Deno.env.get('FRAMEWORKS_ASSISTANT_ID'),
      benchmarks: Deno.env.get('BENCHMARKS_ASSISTANT_ID')
    }[assistantType];

    if (!assistantId) {
      throw new Error(`Invalid assistant type: ${assistantType}`);
    }

    // Create a thread
    console.log('Creating thread...');
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
    });

    if (!threadResponse.ok) {
      throw new Error('Failed to create thread');
    }

    const threadData = await threadResponse.json();
    console.log('Thread created:', threadData);

    // Add message to thread
    console.log('Adding message to thread...');
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        role: 'user',
        content: message,
        file_ids: [uploadData.id]
      })
    });

    if (!messageResponse.ok) {
      throw new Error('Failed to add message to thread');
    }

    console.log('Message added to thread');

    // Run the assistant
    console.log('Running assistant...');
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });

    if (!runResponse.ok) {
      throw new Error('Failed to run assistant');
    }

    const runData = await runResponse.json();
    console.log('Run created:', runData);

    // Poll for completion
    let runStatus = runData.status;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Assistant run timed out');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${threadData.id}/runs/${runData.id}`,
        {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'assistants=v1'
          }
        }
      );

      if (!statusResponse.ok) {
        throw new Error('Failed to check run status');
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus}`);
    }

    // Get messages
    const messagesResponse = await fetch(
      `https://api.openai.com/v1/threads/${threadData.id}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      }
    );

    if (!messagesResponse.ok) {
      throw new Error('Failed to retrieve messages');
    }

    const messagesData = await messagesResponse.json();
    const assistantMessage = messagesData.data[0];

    // Clean up - delete the uploaded file
    await fetch(`https://api.openai.com/v1/files/${uploadData.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      }
    });

    return new Response(
      JSON.stringify({
        response: assistantMessage.content[0].text.value,
        thread_id: threadData.id,
        assistant_id: assistantId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
