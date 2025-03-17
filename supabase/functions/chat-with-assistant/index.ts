
// Version 2.0.0 - FIXED ATTACHMENT HANDLING WITH OPENAI ASSISTANTS API V2
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, threadId, assistantType, attachments = [], structuredOutput = false } = await req.json();
    
    console.log('Processing request:', { 
      messagePreview: message?.substring(0, 50), 
      threadId, 
      assistantType, 
      attachmentsCount: attachments?.length, 
      structuredOutput 
    });

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found in environment variables');
    }

    // Get assistant ID based on type
    const assistantId = getAssistantId(assistantType);
    if (!assistantId) {
      throw new Error(`Invalid assistant type: ${assistantType}`);
    }

    console.log(`Using assistant: ${assistantId} (${assistantType})`);

    // Set up OpenAI API headers
    const openAIHeaders = {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    };

    // Create or retrieve thread
    let thread;
    if (threadId) {
      const threadResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}`, {
        method: 'GET',
        headers: openAIHeaders,
      });
      
      if (!threadResponse.ok) {
        const error = await threadResponse.text();
        console.error('Thread retrieval error:', error);
        throw new Error(`Failed to retrieve thread: ${error}`);
      }
      
      thread = await threadResponse.json();
      console.log(`Retrieved existing thread: ${thread.id}`);
    } else {
      const createThreadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: openAIHeaders,
      });
      
      if (!createThreadResponse.ok) {
        const error = await createThreadResponse.text();
        console.error('Thread creation error:', error);
        throw new Error(`Failed to create thread: ${error}`);
      }
      
      thread = await createThreadResponse.json();
      console.log(`Created new thread: ${thread.id}`);
    }

    // Step 1: Create a message in the thread (without file attachments first)
    const createMessageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: openAIHeaders,
      body: JSON.stringify({
        role: 'user',
        content: message
      }),
    });

    if (!createMessageResponse.ok) {
      const error = await createMessageResponse.text();
      console.error('Message creation error:', error);
      throw new Error(`Failed to create message: ${error}`);
    }
    
    const createdMessage = await createMessageResponse.json();
    console.log(`Created message: ${createdMessage.id}`);

    // Step 2: Attach files separately if any attachments are provided
    const processingResults = [];
    
    if (attachments && attachments.length > 0) {
      console.log(`Processing ${attachments.length} file attachments...`);
      
      for (const attachment of attachments) {
        try {
          // Get the file content if we have a URL
          if (!attachment.url) {
            processingResults.push({
              status: 'error',
              message: 'Missing URL for attachment',
              file: attachment.file_name
            });
            continue;
          }
          
          console.log(`Downloading file from URL: ${attachment.url}`);
          const fileResponse = await fetch(attachment.url);
          
          if (!fileResponse.ok) {
            processingResults.push({
              status: 'error',
              message: `Failed to download file: ${fileResponse.statusText}`,
              file: attachment.file_name
            });
            continue;
          }
          
          const fileBlob = await fileResponse.blob();
          
          // Create a file in the OpenAI API
          const formData = new FormData();
          formData.append('purpose', 'assistants');
          formData.append('file', fileBlob, attachment.file_name);
          
          console.log(`Uploading file to OpenAI: ${attachment.file_name}`);
          const uploadResponse = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`
            },
            body: formData
          });
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(`Error uploading file to OpenAI: ${errorText}`);
            processingResults.push({
              status: 'error',
              message: `Failed to upload file to OpenAI: ${errorText}`,
              file: attachment.file_name
            });
            continue;
          }
          
          const uploadData = await uploadResponse.json();
          console.log(`File uploaded to OpenAI with ID: ${uploadData.id}`);
          
          // Attach the file to the message
          const attachFileResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages/${createdMessage.id}/attachments`, {
            method: 'POST',
            headers: openAIHeaders,
            body: JSON.stringify({
              file_id: uploadData.id
            })
          });
          
          if (!attachFileResponse.ok) {
            const errorText = await attachFileResponse.text();
            console.error(`Error attaching file to message: ${errorText}`);
            processingResults.push({
              status: 'error',
              message: `Failed to attach file to message: ${errorText}`,
              file: attachment.file_name
            });
            continue;
          }
          
          const attachData = await attachFileResponse.json();
          console.log(`File attached to message: ${attachData.id}`);
          
          processingResults.push({
            status: 'success',
            message: 'File attached successfully',
            file: attachment.file_name,
            attachment_id: attachData.id
          });
        } catch (err) {
          console.error(`Error processing attachment ${attachment.file_name}:`, err);
          processingResults.push({
            status: 'error',
            message: err.message,
            file: attachment.file_name
          });
        }
      }
    }

    // Run assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: openAIHeaders,
      body: JSON.stringify({
        assistant_id: assistantId,
        instructions: structuredOutput ? 
          "Please provide your response in a clear, structured format. When presenting data, provide it as properly formatted tables and visualizations. Extract all relevant metrics, numbers, and statistics from user's query and attachments." : 
          "Respond in a clear, helpful manner with proper formatting."
      }),
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error('Run creation error:', error);
      throw new Error(`Failed to create run: ${error}`);
    }

    const runData = await runResponse.json();
    console.log('Run created:', runData.id);

    // Poll for completion
    let runStatus;
    let attempts = 0;
    const maxAttempts = 30; // Maximum 30 seconds wait time
    
    do {
      if (attempts >= maxAttempts) {
        throw new Error('Run timed out after 30 seconds');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${runData.id}`,
        {
          headers: openAIHeaders,
        }
      );

      if (!statusResponse.ok) {
        const error = await statusResponse.text();
        console.error('Status check error:', error);
        throw new Error(`Failed to check run status: ${error}`);
      }

      runStatus = await statusResponse.json();
      console.log('Run status:', runStatus.status);
      attempts++;
    } while (runStatus.status === 'in_progress' || runStatus.status === 'queued');

    if (runStatus.status === 'completed') {
      // Get messages
      const messagesResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/messages`,
        {
          headers: openAIHeaders,
        }
      );

      if (!messagesResponse.ok) {
        const error = await messagesResponse.text();
        console.error('Messages retrieval error:', error);
        throw new Error(`Failed to retrieve messages: ${error}`);
      }

      const messagesData = await messagesResponse.json();
      const lastMessage = messagesData.data[0];

      if (!lastMessage?.content?.[0]?.text?.value) {
        throw new Error('No response content found in the message');
      }

      console.log('Run completed successfully, returning response');
      
      return new Response(
        JSON.stringify({
          response: lastMessage.content[0].text.value,
          thread_id: thread.id,
          assistant_id: assistantId,
          file_processing_results: processingResults
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Run failed with status:', runStatus);
      throw new Error(`Run ended with status: ${runStatus.status}`);
    }

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

// Helper function to get the correct assistant ID based on type
function getAssistantId(assistantType) {
  switch (assistantType) {
    case 'knowledge':
      return Deno.env.get('KNOWLEDGE_ASSISTANT_ID');
    case 'frameworks':
      return Deno.env.get('FRAMEWORKS_ASSISTANT_ID');
    case 'benchmarks':
      return Deno.env.get('BENCHMARKS_ASSISTANT_ID');
    case 'assistant':
      return Deno.env.get('AI_ADVISOR_ASSISTANT_ID');
    default:
      return null;
  }
}
