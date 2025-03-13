
import { Button } from "@/components/ui/button";
import { ModeExplainer } from "@/components/ModeExplainer";
import type { AssistantType } from "@/lib/types";
import { useState } from "react";

interface ModeSelectorProps {
  selectedMode: AssistantType;
  setSelectedMode: (mode: AssistantType) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  selectedMode,
  setSelectedMode
}) => {
  const [showModeExplainer, setShowModeExplainer] = useState<AssistantType | null>(null);
  
  return (
    <div className="flex-1">
      <div className="flex gap-3 relative">
        {['knowledge', 'benchmarks', 'frameworks'].map((mode) => (
          <div key={mode} className="flex-1 relative">
            <Button
              variant="outline"
              className={`w-full py-4 px-4 flex items-center justify-between border-2 ${
                selectedMode === mode ? 'border-gray-900 bg-gray-50' : ''
              }`}
              onClick={() => setSelectedMode(mode as AssistantType)}
              onMouseEnter={() => setShowModeExplainer(mode as AssistantType)}
              onMouseLeave={() => setShowModeExplainer(null)}
            >
              <span className="text-sm font-medium capitalize">{mode}</span>
            </Button>
            
            {showModeExplainer === mode && (
              <div className="absolute z-10 bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-72 mt-2 left-0 right-0">
                <ModeExplainer mode={mode as AssistantType} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
