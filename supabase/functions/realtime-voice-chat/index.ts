
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check for WebSocket upgrade request
  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    console.error("Not a WebSocket request, rejecting");
    return new Response(
      JSON.stringify({ error: "Expected WebSocket connection" }), 
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Upgrade the connection to WebSocket
    const { socket, response } = Deno.upgradeWebSocket(req);
    console.log("WebSocket connection established");

    // Connection event handlers
    socket.onopen = () => {
      console.log("Client WebSocket connection opened");
      socket.send(JSON.stringify({ type: "connection_established", message: "Connected to Supabase Edge Function" }));
    };

    socket.onmessage = async (event) => {
      try {
        console.log("Received message:", event.data);
        const message = JSON.parse(event.data);

        // Handle different message types
        if (message.type === "ping") {
          socket.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        } else if (message.type === "test") {
          socket.send(JSON.stringify({ 
            type: "test_response", 
            message: "Test message received", 
            receivedData: message.data 
          }));
        }
        // More message handlers will be added later
      } catch (error) {
        console.error("Error processing message:", error);
        socket.send(JSON.stringify({ type: "error", message: "Failed to process message", error: error.message }));
      }
    };

    socket.onerror = (event) => {
      console.error("WebSocket error:", event);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return response;
  } catch (error) {
    console.error("WebSocket setup error:", error);
    return new Response(
      JSON.stringify({ error: "WebSocket setup failed", details: error.message }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
