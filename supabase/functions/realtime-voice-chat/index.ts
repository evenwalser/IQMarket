import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { OpenAI } from 'https://esm.sh/openai@4.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Active WebSocket connections
const activeConnections = new Map();

// Helper to send messages to client
function sendMessage(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

// Handle WebSocket connection
async function handleWebSocket(req) {
  const { socket, response } = Deno.upgradeWebSocket(req);
  const sessionId = crypto.randomUUID();
  let voiceId = 'alloy'; // Default voice
  let audioStream = null;
  let isProcessing = false;
  
  console.log(`New WebSocket connection established: ${sessionId}`);
  
  // Store connection
  activeConnections.set(sessionId, {
    socket,
    lastActivity: Date.now(),
    voiceId
  });
  
  // Set up event handlers
  socket.onopen = () => {
    console.log(`WebSocket connection opened: ${sessionId}`);
    sendMessage(socket, {
      type: 'status',
      status: 'connected',
      message: 'Connection established'
    });
  };
  
  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log(`Received message from client ${sessionId}:`, data.action);
      
      // Update last activity timestamp
      const connection = activeConnections.get(sessionId);
      if (connection) {
        connection.lastActivity = Date.now();
      }
      
      switch (data.action) {
        case 'configure':
          if (data.voiceId) {
            voiceId = data.voiceId;
            if (connection) {
              connection.voiceId = voiceId;
            }
            console.log(`Voice ID set to ${voiceId} for session ${sessionId}`);
          }
          break;
          
        case 'start_listening':
          if (!isProcessing) {
            sendMessage(socket, {
              type: 'status',
              status: 'listening',
              message: 'Listening for speech'
            });
          }
          break;
          
        case 'speech_data':
          if (data.audio) {
            // Process speech data (implementation depends on your speech-to-text solution)
            // This is a placeholder for actual speech processing
            try {
              const base64Audio = data.audio.split(',')[1];
              const audioBuffer = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
              
              // Example: Use OpenAI's Whisper API for transcription
              const formData = new FormData();
              const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
              formData.append('file', audioBlob, 'audio.webm');
              formData.append('model', 'whisper-1');
              
              const transcription = await openai.audio.transcriptions.create({
                file: audioBlob,
                model: 'whisper-1',
              });
              
              if (transcription.text) {
                sendMessage(socket, {
                  type: 'transcript',
                  text: transcription.text,
                  final: data.final || false
                });
                
                // If this is the final chunk, process with AI
                if (data.final) {
                  isProcessing = true;
                  sendMessage(socket, {
                    type: 'status',
                    status: 'processing',
                    message: 'Processing your request'
                  });
                  
                  // Process with AI
                  const completion = await openai.chat.completions.create({
                    model: 'gpt-4-turbo',
                    messages: [
                      { role: 'system', content: 'You are a helpful voice assistant. Keep responses concise and conversational.' },
                      { role: 'user', content: transcription.text }
                    ],
                    max_tokens: 300
                  });
                  
                  const aiResponse = completion.choices[0].message.content;
                  
                  // Send the AI response as a message
                  sendMessage(socket, {
                    type: 'message',
                    role: 'assistant',
                    content: aiResponse
                  });
                  
                  // Convert to speech
                  sendMessage(socket, {
                    type: 'status',
                    status: 'speaking',
                    message: 'Speaking response'
                  });
                  
                  // Use OpenAI TTS
                  const mp3 = await openai.audio.speech.create({
                    model: 'tts-1',
                    voice: voiceId,
                    input: aiResponse
                  });
                  
                  // Convert to base64
                  const buffer = await mp3.arrayBuffer();
                  const base64Audio = btoa(
                    new Uint8Array(buffer).reduce(
                      (data, byte) => data + String.fromCharCode(byte),
                      ''
                    )
                  );
                  
                  // Send audio in chunks to avoid large messages
                  const chunkSize = 16000; // Adjust based on your needs
                  for (let i = 0; i < base64Audio.length; i += chunkSize) {
                    const chunk = base64Audio.slice(i, i + chunkSize);
                    sendMessage(socket, {
                      type: 'audio',
                      data: chunk,
                      isLast: i + chunkSize >= base64Audio.length
                    });
                    
                    // Small delay to prevent overwhelming the client
                    await new Promise(resolve => setTimeout(resolve, 50));
                  }
                  
                  isProcessing = false;
                  sendMessage(socket, {
                    type: 'status',
                    status: 'connected',
                    message: 'Ready for next input'
                  });
                }
              }
            } catch (error) {
              console.error('Error processing speech:', error);
              sendMessage(socket, {
                type: 'error',
                message: 'Failed to process speech'
              });
              isProcessing = false;
            }
          }
          break;
          
        case 'stop_listening':
          // Handle stop listening request
          sendMessage(socket, {
            type: 'status',
            status: 'connected',
            message: 'Stopped listening'
          });
          break;
          
        case 'stop_playback':
          // Stop any ongoing audio playback
          if (audioStream) {
            try {
              // Close the stream if applicable
              audioStream = null;
            } catch (error) {
              console.error('Error stopping playback:', error);
            }
          }
          
          isProcessing = false;
          sendMessage(socket, {
            type: 'status',
            status: 'connected',
            message: 'Playback stopped'
          });
          break;
          
        default:
          console.warn(`Unknown action: ${data.action}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendMessage(socket, {
        type: 'error',
        message: 'Failed to process request'
      });
    }
  };
  
  socket.onclose = () => {
    console.log(`WebSocket connection closed: ${sessionId}`);
    activeConnections.delete(sessionId);
    
    // Clean up any resources
    if (audioStream) {
      try {
        // Close the stream if applicable
        audioStream = null;
      } catch (error) {
        console.error('Error cleaning up resources:', error);
      }
    }
  };
  
  socket.onerror = (error) => {
    console.error(`WebSocket error for ${sessionId}:`, error);
    activeConnections.delete(sessionId);
  };
  
  return response;
}

// Clean up inactive connections periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, connection] of activeConnections.entries()) {
    // Close connections inactive for more than 10 minutes
    if (now - connection.lastActivity > 10 * 60 * 1000) {
      console.log(`Closing inactive connection: ${sessionId}`);
      try {
        connection.socket.close();
      } catch (error) {
        console.error(`Error closing socket: ${error}`);
      }
      activeConnections.delete(sessionId);
    }
  }
}, 60 * 1000); // Check every minute

// Main handler
serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle WebSocket upgrade requests
  if (req.headers.get('upgrade') === 'websocket') {
    try {
      return await handleWebSocket(req);
    } catch (error) {
      console.error('WebSocket upgrade error:', error);
      return new Response('WebSocket upgrade failed', { status: 500 });
    }
  }
  
  // Handle HTTP requests
  return new Response(
    JSON.stringify({ error: 'This endpoint requires a WebSocket connection' }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    }
  );
});
