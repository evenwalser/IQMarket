
import { BookOpen, Code, BookCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssistantType } from "@/lib/types";

interface SearchMode {
  id: AssistantType;
  icon: JSX.Element;
  title: string;
  description: string;
  enabled: boolean;
  titleColor: string;
}

const searchModes: SearchMode[] = [
  {
    id: "knowledge",
    icon: <BookOpen className="w-5 h-5" style={{ color: "rgb(114, 29, 255)" }} />,
    title: "Knowledge Base",
    description: "Search across founder interview",
    enabled: true,
    titleColor: "rgb(114, 29, 255)"
  },
  {
    id: "benchmarks",
    icon: <Code className="w-5 h-5" style={{ color: "rgb(241, 177, 177)" }} />,
    title: "Benchmarks",
    description: "Access performance metrics and data",
    enabled: true,
    titleColor: "rgb(241, 177, 177)"
  },
  {
    id: "frameworks",
    icon: <BookCopy className="w-5 h-5" style={{ color: "rgb(70, 218, 114)" }} />,
    title: "Frameworks",
    description: "Explore GTM and product strategies",
    enabled: true,
    titleColor: "rgb(70, 218, 114)"
  }
];

interface SearchModesProps {
  selectedMode: AssistantType;
  setSelectedMode: (mode: AssistantType) => void;
}

export const SearchModes = ({ selectedMode, setSelectedMode }: SearchModesProps) => (
  <div className="flex gap-3">
    {searchModes.map((mode) => (
      <Button
        key={mode.id}
        variant="outline"
        className={`flex-1 py-4 px-4 flex items-center justify-between border-2 ${
          selectedMode === mode.id ? 'border-gray-900 bg-gray-50' : ''
        } ${!mode.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => {
          if (mode.enabled) {
            setSelectedMode(mode.id);
          }
        }}
        disabled={!mode.enabled}
      >
        <div className="flex items-center gap-2">
          <div className="shrink-0">
            {mode.icon}
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <span 
              className="text-sm font-medium"
              style={{ color: mode.titleColor }}
            >
              {mode.title}
            </span>
            <p className="text-xs text-gray-600">
              {mode.enabled ? mode.description : "Coming soon"}
            </p>
          </div>
        </div>
      </Button>
    ))}
  </div>
);
