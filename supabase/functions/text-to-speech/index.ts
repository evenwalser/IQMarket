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

interface TextToSpeechOptions {
  rate?: number;
  pitch?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = 'nova', options = {} } = await req.json();
    
    if (!text || typeof text !== 'string') {
      console.error('Invalid or missing text parameter');
      throw new Error('Text is required and must be a string');
    }

    // Extract options with defaults
    const { 
      rate = 1.0,
      pitch = 1.0
    } = options as TextToSpeechOptions;
    
    // Validate rate (OpenAI supports 0.25 to 4.0)
    const validatedRate = Math.max(0.25, Math.min(4.0, rate));
    if (validatedRate !== rate) {
      console.warn(`Speech rate adjusted from ${rate} to ${validatedRate} (valid range: 0.25-4.0)`);
    }

    // Truncate very long inputs to prevent memory issues
    const truncatedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;
    const wasTruncated = text.length > 4000;
    
    console.log(`Generating speech for: "${truncatedText.substring(0, 100)}${truncatedText.length > 100 ? '...' : ''}" with voice: ${voice}, rate: ${validatedRate}`);
    
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
        speed: validatedRate, // OpenAI parameter for speech rate
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    // Get the audio data as an ArrayBuffer
    const audioData = await response.arrayBuffer();
    
    // Convert to base64 for transmission
    const base64Audio = arrayBufferToBase64(audioData);
    
    console.log(`Generated ${audioData.byteLength} bytes of audio data`);
    
    return new Response(
      JSON.stringify({
        audio: base64Audio,
        wasTruncated,
        byteLength: audioData.byteLength,
        appliedRate: validatedRate
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Text-to-speech error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'An unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
