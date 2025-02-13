
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  message: string;
  assistantType: 'knowledge' | 'frameworks' | 'benchmarks' | 'assistant';
  threadId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const { message, assistantType, threadId } = await req.json() as RequestBody;

    // Different handling based on assistant type
    let response;
    
    if (assistantType === 'benchmarks' || assistantType === 'assistant') {
      // Use GPT-4 directly for benchmarks and general assistant
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: assistantType === 'benchmarks' 
                ? 'You are a benchmarking expert helping analyze and compare metrics.'
                : 'You are a startup scaling expert providing guidance on growth and operations.',
            },
            { role: 'user', content: message }
          ],
        }),
      });

      const data = await response.json();
      return new Response(
        JSON.stringify({
          response: data.choices[0].message.content,
          thread_id: 'direct'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Use Assistants API for knowledge and frameworks
      const assistantId = assistantType === 'frameworks' 
        ? Deno.env.get('NOTIVATOR_ASSISTANT_ID')
        : Deno.env.get('FOUNDER_WISDOM_ASSISTANT_ID');

      if (!assistantId) {
        throw new Error(`Assistant ID not found for type: ${assistantType}`);
      }

      // Create or retrieve thread
      let thread;
      if (threadId) {
        thread = await fetch(`https://api.openai.com/v1/threads/${threadId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v1'
          },
        });
      } else {
        thread = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v1'
          },
        });
      }

      const threadData = await thread.json();

      // Add message to thread
      await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1'
        },
        body: JSON.stringify({
          role: 'user',
          content: message
        }),
      });

      // Run assistant
      const run = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1'
        },
        body: JSON.stringify({
          assistant_id: assistantId
        }),
      });

      const runData = await run.json();

      // Poll for completion
      let runStatus;
      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await fetch(
          `https://api.openai.com/v1/threads/${threadData.id}/runs/${runData.id}`,
          {
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v1'
            },
          }
        );
        runStatus = await statusResponse.json();
      } while (runStatus.status === 'in_progress');

      if (runStatus.status === 'completed') {
        // Get messages
        const messages = await fetch(
          `https://api.openai.com/v1/threads/${threadData.id}/messages`,
          {
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v1'
            },
          }
        );
        const messagesData = await messages.json();
        const lastMessage = messagesData.data[0];

        return new Response(
          JSON.stringify({
            response: lastMessage.content[0].text.value,
            thread_id: threadData.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        throw new Error(`Run ended with status: ${runStatus.status}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
