import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Add CORS headers to all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Message queue for reliable delivery
class MessageQueue {
  private queue: any[] = [];
  private processing = false;
  private socket: WebSocket;
  
  constructor(socket: WebSocket) {
    this.socket = socket;
  }
  
  add(message: any) {
    this.queue.push(message);
    this.processQueue();
  }
  
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    try {
      while (this.queue.length > 0) {
        const message = this.queue[0];
        
        // Only proceed if the socket is open
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify(message));
          this.queue.shift(); // Remove the message after sending
        } else {
          // If socket is not open, stop processing and retry later
          break;
        }
        
        // Small delay to prevent overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (error) {
      console.error("Error processing message queue:", error);
    } finally {
      this.processing = false;
      
      // If there are still messages and the socket is open, continue processing
      if (this.queue.length > 0 && this.socket.readyState === WebSocket.OPEN) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }
}

serve(async (req) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  // Check for WebSocket upgrade request
  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    console.error("Not a WebSocket request, rejecting");
    return new Response(
      JSON.stringify({ error: "Expected WebSocket connection" }), 
      { 
        status: 400, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }

  try {
    console.log("Attempting to upgrade connection to WebSocket");
    
    // Upgrade the connection to WebSocket
    const { socket, response } = Deno.upgradeWebSocket(req);
    console.log("WebSocket connection established successfully");
    
    // Create a message queue for this connection
    const messageQueue = new MessageQueue(socket);

    // Connection event handlers
    socket.onopen = () => {
      console.log("Server-side WebSocket connection opened");
      try {
        messageQueue.add({ 
          type: "connection_established", 
          message: "Connected to Supabase Edge Function",
          timestamp: Date.now()
        });
      } catch (err) {
        console.error("Error sending connection established message:", err);
      }
    };

    socket.onmessage = async (event) => {
      try {
        console.log("Received message:", event.data);
        const message = JSON.parse(event.data);

        // Handle different message types
        if (message.type === "ping") {
          messageQueue.add({ 
            type: "pong", 
            timestamp: Date.now() 
          });
        } else if (message.type === "test") {
          messageQueue.add({ 
            type: "test_response", 
            message: "Test message received", 
            receivedData: message.data,
            timestamp: Date.now()
          });
        } else if (message.type === "voice_data") {
          // Process voice data
          try {
            const voiceData = message.data;
            
            // Send to voice-to-text function
            const transcriptionResponse = await fetch(
              'https://nmfhetqfewbjwqyoxqkd.supabase.co/functions/v1/voice-to-text',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': req.headers.get('Authorization') || '',
                },
                body: JSON.stringify({ audio: voiceData }),
              }
            );
            
            if (!transcriptionResponse.ok) {
              throw new Error(`Transcription failed: ${await transcriptionResponse.text()}`);
            }
            
            const { text } = await transcriptionResponse.json();
            
            // Return the transcribed text
            messageQueue.add({
              type: "transcription",
              text,
              timestamp: Date.now()
            });
            
            // If enabled, also send to chat assistant
            if (message.processWithAssistant) {
              const assistantResponse = await fetch(
                'https://nmfhetqfewbjwqyoxqkd.supabase.co/functions/v1/chat-with-assistant',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.get('Authorization') || '',
                  },
                  body: JSON.stringify({
                    message: text,
                    assistantType: message.assistantType || 'assistant',
                    threadId: message.threadId || null,
                    structuredOutput: message.structuredOutput || false,
                  }),
                }
              );
              
              if (!assistantResponse.ok) {
                throw new Error(`Assistant processing failed: ${await assistantResponse.text()}`);
              }
              
              const assistantData = await assistantResponse.json();
              
              // Return the assistant response
              messageQueue.add({
                type: "assistant_response",
                response: assistantData.response,
                thread_id: assistantData.thread_id,
                visualizations: assistantData.visualizations,
                timestamp: Date.now()
              });
              
              // If text-to-speech is enabled, convert the response to audio
              if (message.textToSpeech) {
                const ttsResponse = await fetch(
                  'https://nmfhetqfewbjwqyoxqkd.supabase.co/functions/v1/text-to-speech',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': req.headers.get('Authorization') || '',
                    },
                    body: JSON.stringify({ text: assistantData.response }),
                  }
                );
                
                if (!ttsResponse.ok) {
                  throw new Error(`Text-to-speech failed: ${await ttsResponse.text()}`);
                }
                
                const { audio } = await ttsResponse.json();
                
                // Return the audio data
                messageQueue.add({
                  type: "speech_response",
                  audio,
                  timestamp: Date.now()
                });
              }
            }
          } catch (error) {
            console.error("Error processing voice data:", error);
            messageQueue.add({
              type: "error",
              message: "Failed to process voice data",
              error: error.message,
              timestamp: Date.now()
            });
          }
        } else {
          // Echo back unknown message types for debugging
          messageQueue.add({
            type: "echo",
            originalType: message.type,
            message: "Unknown message type echoed back",
            data: message.data,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error("Error processing message:", error);
        try {
          messageQueue.add({ 
            type: "error", 
            message: "Failed to process message", 
            error: error.message,
            timestamp: Date.now()
          });
        } catch (sendError) {
          console.error("Error sending error message:", sendError);
        }
      }
    };

    socket.onerror = (event) => {
      console.error("WebSocket error:", event);
    };

    socket.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    };

    // All headers from the original response will be preserved
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers([...response.headers.entries(), ...Object.entries(corsHeaders)])
    });
  } catch (error) {
    console.error("WebSocket setup error:", error);
    return new Response(
      JSON.stringify({ error: "WebSocket setup failed", details: error.message }), 
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
