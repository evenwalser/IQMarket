
import { Sparkles } from "lucide-react";

export const PageHeader = () => {
  return (
    <div className="text-center mb-8 relative">
      <div className="inline-flex items-center gap-3 group">
        <Sparkles className="w-7 h-7 text-purple-500 group-hover:text-purple-600 transition-colors animate-pulse" />
        <div className="flex items-center gap-2">
          <img 
            src="/lovable-uploads/8440a119-0b53-46c9-a6c7-4bcef311d38f.png" 
            alt="Notion" 
            className="w-32 h-auto object-cover"
          />
          <h1 className="font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-gradient relative hover:scale-[1.02] transition-transform tracking-tight text-4xl">
            Intelligence
          </h1>
        </div>
        <Sparkles className="w-7 h-7 text-purple-500 group-hover:text-purple-600 transition-colors animate-pulse" />
      </div>
    </div>
  );
};
