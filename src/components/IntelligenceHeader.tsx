import { Sparkles } from "lucide-react";

export const IntelligenceHeader = () => {
  return (
    <div className="py-8 flex justify-center items-center space-x-3">
      <Sparkles className="w-8 h-8 text-purple-500" />
      <div className="flex items-center">
        <img 
          src="/lovable-uploads/c043db32-f19c-4f34-8153-6fbc96dab40a.png" 
          alt="Notion" 
          className="h-[3.75rem] mr-3" 
        />
        <span className="text-3xl font-semibold text-purple-600">Intelligence</span>
      </div>
      <Sparkles className="w-8 h-8 text-purple-500" />
    </div>
  );
}; 