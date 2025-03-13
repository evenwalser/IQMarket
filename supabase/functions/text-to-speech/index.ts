
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Efficient base64 encoding for binary data
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

    // Truncate very long inputs to prevent memory issues
    const truncatedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;
    const wasTruncated = text.length > 4000;
    
    console.log(`Generating speech for: "${truncatedText.substring(0, 100)}${truncatedText.length > 100 ? '...' : ''}" with voice: ${voice}`);
    
    // Use streaming mode for OpenAI TTS
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: truncatedText,
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
    
    // Use the safe base64 conversion function
    const base64Audio = arrayBufferToBase64(audioArrayBuffer);
    
    const audioSizeKB = Math.round(base64Audio.length / 1024);
    console.log(`Successfully generated audio, size: ${audioSizeKB}KB`);
    
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
