
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://esm.sh/openai@4.20.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_TEXT_LENGTH = 4000;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Text-to-speech function called')
    const { text, voice = 'nova' } = await req.json()

    if (!text) {
      console.error('No text provided')
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      console.error('OpenAI API key not found')
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    // Check text length and truncate if necessary
    let processedText = text;
    let wasTruncated = false;
    
    if (text.length > MAX_TEXT_LENGTH) {
      console.log(`Text exceeds ${MAX_TEXT_LENGTH} chars (${text.length}), truncating...`);
      processedText = text.substring(0, MAX_TEXT_LENGTH) + "... [truncated due to length]";
      wasTruncated = true;
    }

    console.log(`Generating speech with voice: ${voice}, text length: ${processedText.length} characters`);

    // Generate speech from text
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: processedText,
        voice: voice,
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      try {
        const error = JSON.parse(errorText);
        return new Response(
          JSON.stringify({ error: error.error?.message || 'Failed to generate speech' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      } catch (e) {
        return new Response(
          JSON.stringify({ error: `Failed to generate speech: ${errorText}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Convert audio buffer to base64
    const arrayBuffer = await response.arrayBuffer()
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    )

    console.log('Speech generated successfully, returning audio content');

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        wasTruncated: wasTruncated
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Text-to-speech function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
