
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip } from "lucide-react";

interface MessageInputProps {
  message: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  hasAttachments: boolean;
}

export const MessageInput = ({ 
  message, 
  onChange, 
  onSend, 
  onFileSelect,
  isLoading,
  hasAttachments
}: MessageInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          className="hidden"
          multiple
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          className="flex-1"
          disabled={isLoading}
        />
        <Button
          onClick={onSend}
          disabled={(!message.trim() && !hasAttachments) || isLoading}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
