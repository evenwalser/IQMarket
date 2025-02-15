
import { BookOpen, Code, BookCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssistantType } from "@/lib/types";

interface SearchMode {
  id: AssistantType;
  icon: JSX.Element;
  title: string;
  description: string;
  enabled: boolean;
}

const searchModes: SearchMode[] = [
  {
    id: "knowledge",
    icon: <BookOpen className="w-5 h-5" />,
    title: "Knowledge Base",
    description: "Search across founder interview",
    enabled: true
  },
  {
    id: "benchmarks",
    icon: <Code className="w-5 h-5" />,
    title: "Benchmarks",
    description: "Access performance metrics and data",
    enabled: true
  },
  {
    id: "frameworks",
    icon: <BookCopy className="w-5 h-5" />,
    title: "Frameworks",
    description: "Explore GTM and product strategies",
    enabled: true
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
            <span className="text-sm font-medium text-gray-900">{mode.title}</span>
            <p className="text-xs text-gray-600">
              {mode.enabled ? mode.description : "Coming soon"}
            </p>
          </div>
        </div>
      </Button>
    ))}
  </div>
);
