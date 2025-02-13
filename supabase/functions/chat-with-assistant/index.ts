
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://deno.land/x/openai@1.4.2/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const ASSISTANT_IDS = {
  knowledge: "Founder Wisdom",
  frameworks: "The Notivator - SBS"
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, assistantType } = await req.json();
    
    const openai = new OpenAI(openAIApiKey);
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Create a thread
    const thread = await openai.beta.threads.create();
    
    // Add the message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });
    
    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_IDS[assistantType],
    });
    
    // Poll for the completion
    let response;
    while (true) {
      const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (runStatus.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(thread.id);
        response = messages.data[0].content[0].text.value;
        break;
      }
      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed');
      }
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Store the conversation in the database
    const { error: dbError } = await supabase
      .from('conversations')
      .insert({
        query: message,
        response,
        assistant_type: assistantType,
        thread_id: thread.id
      });

    if (dbError) {
      console.error('Error storing conversation:', dbError);
    }
    
    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-with-assistant function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
