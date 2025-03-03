
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Add CORS headers to all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

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

    // Connection event handlers
    socket.onopen = () => {
      console.log("Server-side WebSocket connection opened");
      try {
        socket.send(JSON.stringify({ 
          type: "connection_established", 
          message: "Connected to Supabase Edge Function",
          timestamp: Date.now()
        }));
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
          socket.send(JSON.stringify({ 
            type: "pong", 
            timestamp: Date.now() 
          }));
        } else if (message.type === "test") {
          socket.send(JSON.stringify({ 
            type: "test_response", 
            message: "Test message received", 
            receivedData: message.data,
            timestamp: Date.now()
          }));
        } else {
          // Echo back unknown message types for debugging
          socket.send(JSON.stringify({
            type: "echo",
            originalType: message.type,
            message: "Unknown message type echoed back",
            data: message.data,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error("Error processing message:", error);
        try {
          socket.send(JSON.stringify({ 
            type: "error", 
            message: "Failed to process message", 
            error: error.message,
            timestamp: Date.now()
          }));
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
