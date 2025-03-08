import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { AssistantType } from "@/lib/types";
import { BookOpen, BarChart3, LayoutGrid } from 'lucide-react';
import { ModePopover } from "./ModePopover";

// CSS for animation
const styles = `
.mode-button {
  position: relative;
  overflow: hidden;
}

.mode-button.selected::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: currentColor;
  transform: scaleX(1);
  transition: transform 0.3s ease;
}

.mode-button:not(.selected)::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: currentColor;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.mode-button:hover:not(.selected)::after {
  transform: scaleX(0.3);
}

.mode-button:active {
  transform: scale(0.98);
}

.selected-mode {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
`;

interface ModeSelectorProps {
  selectedMode: AssistantType;
  onModeSelect: (mode: AssistantType) => void;
  disabled?: boolean;
}

export const ModeSelector = ({
  selectedMode,
  onModeSelect,
  disabled = false
}: ModeSelectorProps) => {
  // Filter out the 'assistant' mode as it's not shown in the UI
  const visibleModes = ['knowledge', 'benchmarks', 'frameworks'] as AssistantType[];
  
  // Add the CSS to the document
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Mode icons and classes
  const modeConfig = {
    knowledge: {
      icon: <BookOpen className="w-4 h-4 mr-2" />,
      hoverClass: "hover:bg-purple-50",
      activeClass: "bg-purple-100 border-purple-300 text-purple-700"
    },
    benchmarks: {
      icon: <BarChart3 className="w-4 h-4 mr-2" />,
      hoverClass: "hover:bg-red-50",
      activeClass: "bg-red-100 border-red-300 text-red-700"
    },
    frameworks: {
      icon: <LayoutGrid className="w-4 h-4 mr-2" />,
      hoverClass: "hover:bg-green-50",
      activeClass: "bg-green-100 border-green-300 text-green-700"
    }
  };
  
  // State for tracking which popover is visible
  const [activePopover, setActivePopover] = useState<string | null>(null);
  
  // Timeout ref for delayed closing
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Show popover on hover
  const handleMouseEnter = (mode: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActivePopover(mode);
  };
  
  // Hide popover when mouse leaves
  const handleMouseLeave = () => {
    // Delayed hiding to allow moving to popover
    timeoutRef.current = setTimeout(() => {
      setActivePopover(null);
    }, 100);
  };

  // Handle mode selection with additional visual feedback
  const handleModeSelect = (mode: AssistantType) => {
    console.log(`ModeSelector: Clicked on mode: ${mode}, current selectedMode: ${selectedMode}`);
    
    // Call the parent component's handler
    onModeSelect(mode);
  };
  
  return (
    <div className="flex w-full max-w-md mx-auto bg-gray-100 rounded-lg p-1">
      {visibleModes.map((mode) => {
        const isSelected = selectedMode === mode;
        return (
          <div 
            key={mode}
            className="relative flex-1"
            onMouseEnter={() => handleMouseEnter(mode)}
            onMouseLeave={handleMouseLeave}
          >
            <Button
              variant={isSelected ? "default" : "ghost"}
              className={`mode-button w-full rounded-md py-2 px-4 capitalize flex items-center justify-center ${
                isSelected 
                  ? `bg-white shadow-md font-semibold border-2 ${modeConfig[mode].activeClass} selected` 
                  : `bg-transparent ${modeConfig[mode].hoverClass} text-gray-600 border-transparent hover:border hover:border-gray-200`
              } transition-all duration-200`}
              onClick={() => handleModeSelect(mode)}
              disabled={disabled}
              data-selected={isSelected ? "true" : "false"}
              data-mode={mode}
              aria-pressed={isSelected}
            >
              {modeConfig[mode].icon}
              <span>{mode}</span>
            </Button>
            
            {/* Hover popover */}
            {activePopover === mode && (
              <div 
                className="absolute z-50 top-full left-1/2 transform -translate-x-1/2 mt-1"
                onMouseEnter={() => handleMouseEnter(mode)} 
                onMouseLeave={handleMouseLeave}
              >
                <ModePopover mode={mode} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
