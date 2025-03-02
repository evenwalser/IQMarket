
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = 'nova' } = await req.json();
    
    if (!text || typeof text !== 'string') {
      console.error('Invalid or missing text parameter');
      throw new Error('Text is required and must be a string');
    }

    console.log(`Generating speech for: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}" with voice: ${voice}`);
    
    // Use streaming mode for OpenAI TTS
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.substring(0, 4096), // Safety limit for very long inputs
        voice: voice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    // Get audio binary data
    const audioArrayBuffer = await response.arrayBuffer();
    
    // Convert to base64 for sending over JSON
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
    
    console.log(`Successfully generated audio, size: ${Math.round(base64Audio.length / 1024)}KB`);
    
    // Check if text was truncated
    const wasTruncated = text.length > 4096;
    
    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        wasTruncated: wasTruncated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
