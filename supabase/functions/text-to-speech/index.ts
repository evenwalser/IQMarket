
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

    // Trim the text if it's too long for OpenAI's TTS API
    const trimmedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;
    console.log(`Converting to speech: "${trimmedText.substring(0, 100)}..." using voice ${voice}`);

    // Check if API key exists
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      console.error('OpenAI API key is missing');
      throw new Error('OpenAI API key is not configured');
    }

    // Generate speech from text using OpenAI API
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

    console.log("Successfully generated speech audio");
    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
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
