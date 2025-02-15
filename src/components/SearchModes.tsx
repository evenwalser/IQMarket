
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
    icon: <BookOpen className="w-5 h-5 transition-colors group-hover:stroke-[url(#gradient)] group-[[data-state=selected]]:stroke-[url(#gradient)]" />,
    title: "Knowledge Base",
    description: "Search across founder interview",
    enabled: true
  },
  {
    id: "benchmarks",
    icon: <Code className="w-5 h-5 transition-colors group-hover:stroke-[url(#gradient)] group-[[data-state=selected]]:stroke-[url(#gradient)]" />,
    title: "Benchmarks",
    description: "Access performance metrics and data",
    enabled: true
  },
  {
    id: "frameworks",
    icon: <BookCopy className="w-5 h-5 transition-colors group-hover:stroke-[url(#gradient)] group-[[data-state=selected]]:stroke-[url(#gradient)]" />,
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
    <svg className="absolute w-0 h-0">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#9b87f5' }} />
          <stop offset="50%" style={{ stopColor: '#0EA5E9' }} />
          <stop offset="100%" style={{ stopColor: '#9b87f5' }} />
        </linearGradient>
        <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#9b87f5' }} />
          <stop offset="50%" style={{ stopColor: '#0EA5E9' }} />
          <stop offset="100%" style={{ stopColor: '#9b87f5' }} />
        </linearGradient>
      </defs>
    </svg>
    {searchModes.map((mode) => (
      <Button
        key={mode.id}
        variant="outline"
        data-state={selectedMode === mode.id ? 'selected' : 'default'}
        className={`group flex-1 py-4 px-4 flex items-center justify-between border-2 transition-all
          hover:border-transparent hover:bg-gradient-to-r hover:from-purple-600 hover:via-blue-500 hover:to-purple-600 hover:bg-clip-border
          ${selectedMode === mode.id ? 'border-transparent bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 bg-clip-border bg-gray-50' : ''}
          ${!mode.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
