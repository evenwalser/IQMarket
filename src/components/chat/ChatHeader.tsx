
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ChatHeaderProps {
  onClear: () => void;
}

export const ChatHeader = ({ onClear }: ChatHeaderProps) => {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <img 
          src="/lovable-uploads/a0d0f1b5-2c6e-40c6-a503-fb5a3d773811.png" 
          alt="AI Advisor" 
          className="w-5 h-5"
        />
        <h2 className="text-lg font-semibold text-gray-900">AI Advisor</h2>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="text-gray-500 hover:text-gray-700"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
