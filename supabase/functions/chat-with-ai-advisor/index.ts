
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const aiAdvisorAssistantId = Deno.env.get('AI_ADVISOR_ASSISTANT_ID');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIHeaders = {
  'Authorization': `Bearer ${openAIApiKey}`,
  'Content-Type': 'application/json',
  'OpenAI-Beta': 'assistants=v2'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, threadId, attachments } = await req.json();
    console.log('Received request:', { 
      messagePreview: message?.substring(0, 50), 
      threadId, 
      attachmentsCount: attachments?.length 
    });

    if (!aiAdvisorAssistantId) {
      throw new Error('AI Advisor Assistant ID not found');
    }

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
    }

    console.log('Thread:', thread);

    // Prepare message content
    const messageContent = [];
    
    // Add text content if present
    if (message?.trim()) {
      messageContent.push({
        type: 'text',
        text: message
      });
    }

    // Add image attachments if present
    if (attachments?.length > 0) {
      for (const attachment of attachments) {
        if (attachment.type === 'image') {
          messageContent.push({
            type: 'image_url',
            image_url: {
              url: attachment.url
            }
          });
        } else {
          // For non-image files, add them as links in the text
          messageContent.push({
            type: 'text',
            text: `\nAttached file: ${attachment.name} - ${attachment.url}`
          });
        }
      }
    }

    // Add message to thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: openAIHeaders,
      body: JSON.stringify({
        role: 'user',
        content: messageContent
      }),
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.text();
      console.error('Message creation error:', error);
      throw new Error(`Failed to create message: ${error}`);
    }

    // Run assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: openAIHeaders,
      body: JSON.stringify({
        assistant_id: aiAdvisorAssistantId
      }),
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error('Run creation error:', error);
      throw new Error(`Failed to create run: ${error}`);
    }

    const runData = await runResponse.json();
    console.log('Run created:', runData);

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

      return new Response(
        JSON.stringify({
          response: lastMessage.content[0].text.value,
          thread_id: thread.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (runStatus.status === 'failed') {
      console.error('Run failed with details:', runStatus.last_error);
      throw new Error(`Run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    } else {
      console.error('Run ended with unexpected status:', runStatus);
      throw new Error(`Run ended with status: ${runStatus.status}`);
    }

  } catch (error) {
    console.error('Error in chat-with-ai-advisor:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
