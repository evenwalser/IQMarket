
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, voice = 'nova' } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    console.log(`Converting to speech: "${text.substring(0, 100)}..." using voice ${voice}`);

    // Check if API key exists
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      console.error('OpenAI API key is missing');
      throw new Error('OpenAI API key is not configured');
    }

    // For very long text, we'll use chunking instead of streaming
    // OpenAI TTS has a 4096 character limit
    if (text.length > 4000) {
      console.log(`Text is long (${text.length} chars), processing in chunks`);
      
      // Process the first chunk only (we'll send a summary/truncated version)
      // A more complex implementation could process multiple chunks and concatenate them
      const trimmedText = text.substring(0, 4000) + "... (text truncated due to length)";
      
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: trimmedText,
          voice: voice, // Options: alloy, echo, fable, onyx, nova, shimmer
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI TTS API error response:', errorText);
        
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
        } catch (e) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
      }

      // Convert audio buffer to base64
      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      );

      console.log("Successfully generated speech audio for truncated text");
      return new Response(
        JSON.stringify({ 
          audioContent: base64Audio,
          wasTruncated: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    } else {
      // For shorter text, proceed normally
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voice,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI TTS API error response:', errorText);
        
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
        } catch (e) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
      }

      // Convert audio buffer to base64
      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      );

      console.log("Successfully generated speech audio");
      return new Response(
        JSON.stringify({ audioContent: base64Audio }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  } catch (error) {
    console.error('Text-to-speech error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error in text-to-speech function' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
