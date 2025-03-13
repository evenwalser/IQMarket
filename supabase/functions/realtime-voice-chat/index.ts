
// This edge function creates a proxy WebSocket connection to OpenAI's API
// It handles the WebSocket connection and proxies messages between the client and OpenAI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.1.0";

// CORS headers for browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Active WebSocket connections
const activeConnections = new Map();

// Connect to OpenAI API
async function connectToOpenAI(sessionId, clientWs) {
  try {
    console.log(`Connecting to OpenAI for session: ${sessionId}`);
    
    // Get API key from environment
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'OpenAI API key is not configured on the server'
      }));
      return null;
    }

    // Create a new OpenAI session
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: 'Initializing voice assistant.',
        voice: 'alloy',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      clientWs.send(JSON.stringify({
        type: 'error',
        message: `OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`
      }));
      return null;
    }

    // Send connection ready status to client
    clientWs.send(JSON.stringify({
      type: 'connection_ready',
      sessionId: sessionId
    }));

    // Create new OpenAI session for chat completions with audio
    const sessionResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: 'Voice assistant ready.',
        voice: 'alloy',
      }),
    });

    const audioData = await sessionResponse.arrayBuffer();
    
    // Send session created notification
    clientWs.send(JSON.stringify({
      type: 'session.created',
      session: {
        id: sessionId
      }
    }));

    return {
      sessionId
    };
  } catch (error) {
    console.error('Error connecting to OpenAI:', error);
    clientWs.send(JSON.stringify({
      type: 'error',
      message: `Connection error: ${error.message}`
    }));
    return null;
  }
}

// Process a client message
async function processClientMessage(message, sessionInfo, clientWs) {
  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Handle different message types
    if (message.type === 'session.update') {
      // Acknowledge session update
      clientWs.send(JSON.stringify({
        type: 'session.updated'
      }));
      return;
    } 
    else if (message.type === 'speech.interrupt') {
      // Handle speech interruption
      clientWs.send(JSON.stringify({
        type: 'speech_stopped'
      }));
      return;
    }
    else if (message.type === 'input_audio_buffer.append') {
      // Handle audio buffer (implement speech-to-text)
      if (message.audio) {
        // Transcribe audio using Whisper API
        const audioBuffer = Uint8Array.from(atob(message.audio), c => c.charCodeAt(0));
        
        // Create file blob for Whisper API
        const formData = new FormData();
        formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'audio.wav');
        formData.append('model', 'whisper-1');
        
        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: formData
        });
        
        if (transcriptionResponse.ok) {
          const transcriptionData = await transcriptionResponse.json();
          
          if (transcriptionData.text && transcriptionData.text.trim()) {
            // Send partial transcription to client
            clientWs.send(JSON.stringify({
              type: 'input_text.transcription.delta',
              delta: transcriptionData.text
            }));
            
            // Send complete transcription
            clientWs.send(JSON.stringify({
              type: 'input_text.transcription.complete',
              text: transcriptionData.text
            }));
            
            // Generate response using chat completions
            const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                  { role: 'system', content: 'You are a helpful assistant. Keep your responses concise but informative.' },
                  { role: 'user', content: transcriptionData.text }
                ]
              })
            });
            
            if (chatResponse.ok) {
              const chatData = await chatResponse.json();
              const responseText = chatData.choices[0]?.message?.content || 'I didn\'t understand that. Can you try again?';
              
              // Send start of assistant message
              clientWs.send(JSON.stringify({
                type: 'response.message.delta',
                role: 'assistant',
                delta: responseText
              }));
              
              // Generate speech from response
              clientWs.send(JSON.stringify({
                type: 'speech_started'
              }));
              
              const speechResponse = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: 'tts-1',
                  voice: 'alloy',
                  input: responseText
                })
              });
              
              if (speechResponse.ok) {
                const audioArrayBuffer = await speechResponse.arrayBuffer();
                const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
                
                // Send audio to client
                clientWs.send(JSON.stringify({
                  type: 'response.audio.delta',
                  delta: audioBase64
                }));
                
                // Signal completion
                clientWs.send(JSON.stringify({
                  type: 'speech_stopped'
                }));
                
                clientWs.send(JSON.stringify({
                  type: 'response.done'
                }));
              }
            }
          }
        }
      }
      return;
    }
    else if (message.type === 'conversation.item.create') {
      // Handle text messages for chat completions
      if (message.item?.content && message.item.content[0]?.text) {
        const userText = message.item.content[0].text;
        
        // Generate response using chat completions
        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are a helpful assistant. Keep your responses concise but informative.' },
              { role: 'user', content: userText }
            ]
          })
        });
        
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          const responseText = chatData.choices[0]?.message?.content || 'I didn\'t understand that. Can you try again?';
          
          // Send start of assistant message
          clientWs.send(JSON.stringify({
            type: 'response.message.delta',
            role: 'assistant',
            delta: responseText
          }));
          
          // Generate speech from response
          clientWs.send(JSON.stringify({
            type: 'speech_started'
          }));
          
          const speechResponse = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'tts-1',
              voice: 'alloy',
              input: responseText
            })
          });
          
          if (speechResponse.ok) {
            const audioArrayBuffer = await speechResponse.arrayBuffer();
            const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
            
            // Send audio to client
            clientWs.send(JSON.stringify({
              type: 'response.audio.delta',
              delta: audioBase64
            }));
            
            // Signal completion
            clientWs.send(JSON.stringify({
              type: 'speech_stopped'
            }));
            
            clientWs.send(JSON.stringify({
              type: 'response.done'
            }));
          }
        }
      }
      return;
    }
    else if (message.type === 'response.create') {
      // This is handled above in conversation.item.create
      return;
    }
    
    // Unknown message type
    console.warn('Unknown message type:', message.type);
  } catch (error) {
    console.error('Error processing message:', error);
    clientWs.send(JSON.stringify({
      type: 'error',
      message: `Error processing message: ${error.message}`
    }));
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders 
    });
  }

  // Check for WebSocket upgrade
  const upgradeHeader = req.headers.get('upgrade') || '';
  if (upgradeHeader.toLowerCase() !== 'websocket') {
    // Handle regular HTTP requests
    try {
      // Allow a ping request for connection testing
      if (req.method === 'POST') {
        const body = await req.json();
        
        if (body && body.action === 'ping') {
          return new Response(JSON.stringify({ 
            success: true, 
            project: 'nmfhetqfewbjwqyoxqkd' 
          }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      }
      
      return new Response('This endpoint requires a WebSocket connection', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    } catch (e) {
      console.error('Error processing HTTP request:', e);
      return new Response('This endpoint requires a WebSocket connection', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }
  }

  // Set up WebSocket connection
  const { socket, response } = Deno.upgradeWebSocket(req);
  const sessionId = crypto.randomUUID();
  
  // Handle WebSocket events
  socket.onopen = async () => {
    console.log(`WebSocket connection opened for session: ${sessionId}`);
    
    // Create session with OpenAI
    const sessionInfo = await connectToOpenAI(sessionId, socket);
    if (sessionInfo) {
      activeConnections.set(sessionId, { 
        socket,
        sessionInfo
      });
    }
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`Received message of type ${message.type}`);
      
      const connection = activeConnections.get(sessionId);
      if (connection) {
        await processClientMessage(message, connection.sessionInfo, socket);
      } else {
        console.warn(`No active connection found for session ${sessionId}`);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Session not initialized'
        }));
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: `Error processing message: ${error.message}`
      }));
    }
  };

  socket.onclose = () => {
    console.log(`WebSocket connection closed for session: ${sessionId}`);
    // Clean up session
    activeConnections.delete(sessionId);
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error for session ${sessionId}:`, error);
  };

  return response;
});
