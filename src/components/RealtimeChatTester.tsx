
import { useState, useEffect } from "react";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Radio, WifiOff } from "lucide-react";

export const RealtimeChatTester = () => {
  const { 
    connect, 
    disconnect, 
    sendPing, 
    sendTestMessage, 
    isConnected, 
    isConnecting, 
    messages, 
    latency,
    connectionAttempts
  } = useRealtimeChat();
  
  const [testMessage, setTestMessage] = useState("");
  const [autoConnect, setAutoConnect] = useState(true);
  
  useEffect(() => {
    // Auto-connect when component mounts if autoConnect is true
    if (autoConnect) {
      connect();
    }
    
    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, autoConnect]);
  
  const handleSendTest = () => {
    if (testMessage.trim()) {
      sendTestMessage({ text: testMessage });
      setTestMessage("");
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          WebSocket Connection Tester
          <Badge 
            variant={isConnected ? "default" : "destructive"}
            className="ml-2"
          >
            {isConnected ? (
              <span className="flex items-center">
                <Radio className="w-3 h-3 mr-1 animate-pulse" />
                Connected
              </span>
            ) : isConnecting ? (
              <span className="flex items-center">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Connecting...
              </span>
            ) : (
              <span className="flex items-center">
                <WifiOff className="w-3 h-3 mr-1" />
                Disconnected
              </span>
            )}
          </Badge>
        </CardTitle>
        <CardDescription>
          Test the WebSocket connection to validate bidirectional communication.
          {latency !== null && isConnected && (
            <span className="ml-2 text-xs text-muted-foreground">
              Latency: {latency}ms
            </span>
          )}
          {connectionAttempts > 0 && !isConnected && (
            <div className="mt-2 text-xs flex items-center text-destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              Connection attempts: {connectionAttempts}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Button 
            onClick={() => connect()}
            disabled={isConnected || isConnecting}
            variant="outline"
          >
            Connect
          </Button>
          <Button 
            onClick={disconnect} 
            disabled={!isConnected}
            variant="outline"
          >
            Disconnect
          </Button>
          <Button 
            onClick={sendPing} 
            disabled={!isConnected}
            variant="outline"
          >
            Ping
          </Button>
        </div>
        
        <div className="bg-muted rounded-md p-3 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-medium mb-2">Messages:</h3>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No messages yet</p>
          ) : (
            <ul className="space-y-2">
              {messages.map((msg, index) => (
                <li key={index} className="text-sm border-l-2 pl-2 border-primary/20">
                  <span className="font-medium">{msg.type}</span>: 
                  <span className="text-muted-foreground ml-1">
                    {msg.message || JSON.stringify(msg.data || {})}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex w-full space-x-2">
          <Input
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter test message..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendTest();
            }}
            disabled={!isConnected}
          />
          <Button 
            onClick={handleSendTest} 
            disabled={!isConnected || !testMessage.trim()}
          >
            Send Test
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
