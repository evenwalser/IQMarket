
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setOpenAIKey } from "@/services/chatService";
import { Loader } from "lucide-react";

export const APIKeyForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsLoading(true);
    try {
      const success = await setOpenAIKey(apiKey);
      if (success && onSuccess) {
        onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-md bg-white shadow-sm">
      <h2 className="text-lg font-medium mb-4">Enter OpenAI API Key</h2>
      <p className="text-sm text-gray-600 mb-4">
        To use the chat feature, you need to provide your OpenAI API key. 
        Your key will be securely stored in Supabase.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full"
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save API Key"
            )}
          </Button>
        </div>
      </form>
      <p className="mt-4 text-xs text-gray-500">
        Don't have an API key? <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Get one here</a>
      </p>
    </div>
  );
};
