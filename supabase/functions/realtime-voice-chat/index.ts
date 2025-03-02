
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenAI API key from environment
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Active connections store
const activeConnections = new Map();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // For WebSocket connections
  const upgradeHeader = req.headers.get('upgrade') || '';

  if (upgradeHeader.toLowerCase() === 'websocket') {
    try {
      const { socket, response } = Deno.upgradeWebSocket(req);
      const connectionId = crypto.randomUUID();
      let userSessionId = null;
      let openAIWs = null;

      console.log(`New WebSocket connection: ${connectionId}`);

      // Store the connection
      activeConnections.set(connectionId, { socket, openAIWs });

      // Handle messages from the client
      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log(`Received message type: ${message.type}`);

          // Handle initial connection setup
          if (message.type === 'init') {
            userSessionId = message.sessionId || crypto.randomUUID();

            // Create a connection to OpenAI's Realtime API
            openAIWs = new WebSocket(
              "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
            );
            
            openAIWs.onopen = () => {
              console.log(`Connected to OpenAI Realtime API for session: ${userSessionId}`);
              
              // Send initial authentication message to OpenAI
              const authMessage = {
                type: "auth",
                api_key: openAIApiKey,
              };
              openAIWs.send(JSON.stringify(authMessage));
              
              // Let the client know we're ready
              socket.send(JSON.stringify({
                type: 'connection_ready',
                sessionId: userSessionId
              }));
            };

            // Relay messages from OpenAI to client
            openAIWs.onmessage = (openAIEvent) => {
              socket.send(openAIEvent.data);
              
              // Log selected events (but not audio data)
              const openAIData = JSON.parse(openAIEvent.data);
              if (openAIData.type !== 'response.audio.delta') {
                console.log(`OpenAI event: ${openAIData.type}`);
              }
            };

            openAIWs.onerror = (error) => {
              console.error(`OpenAI WebSocket error: ${error}`);
              socket.send(JSON.stringify({
                type: 'error',
                message: 'OpenAI connection error'
              }));
            };

            openAIWs.onclose = () => {
              console.log(`OpenAI connection closed for session: ${userSessionId}`);
              socket.send(JSON.stringify({
                type: 'openai_connection_closed'
              }));
            };

            activeConnections.set(connectionId, { socket, openAIWs, userSessionId });
          } 
          // Forward audio data to OpenAI
          else if (message.type === 'input_audio_buffer.append' && openAIWs) {
            openAIWs.send(event.data);
          }
          // Forward all other messages to OpenAI
          else if (openAIWs) {
            openAIWs.send(event.data);
          }
        } catch (error) {
          console.error(`Error processing message: ${error}`);
          socket.send(JSON.stringify({
            type: 'error',
            message: `Error processing message: ${error.message}`
          }));
        }
      };

      // Handle socket close
      socket.onclose = () => {
        console.log(`WebSocket connection closed: ${connectionId}`);
        const connection = activeConnections.get(connectionId);
        
        // Close OpenAI connection if it exists
        if (connection?.openAIWs) {
          try {
            connection.openAIWs.close();
          } catch (e) {
            console.error(`Error closing OpenAI connection: ${e}`);
          }
        }
        
        activeConnections.delete(connectionId);
      };

      // Handle socket errors
      socket.onerror = (error) => {
        console.error(`WebSocket error: ${error}`);
        activeConnections.delete(connectionId);
      };

      return response;
    } catch (error) {
      console.error(`Error handling WebSocket: ${error}`);
      return new Response(`WebSocket upgrade error: ${error.message}`, { status: 500 });
    }
  }

  // For regular HTTP requests (non-WebSocket)
  return new Response('This endpoint requires a WebSocket connection.', {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
  });
});

// Handle function shutdown
addEventListener('beforeunload', (ev) => {
  console.log('Function shutdown, closing all connections');
  for (const [id, { socket, openAIWs }] of activeConnections.entries()) {
    try {
      if (openAIWs) openAIWs.close();
      if (socket) socket.close();
    } catch (e) {
      console.error(`Error closing connection ${id}: ${e}`);
    }
  }
});
