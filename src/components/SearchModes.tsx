
import { BookOpen, Code, BookCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssistantType } from "@/lib/types";

interface SearchMode {
  id: AssistantType;
  icon: JSX.Element;
  title: string;
  description: string;
}

const searchModes: SearchMode[] = [
  {
    id: "knowledge",
    icon: <BookOpen className="w-5 h-5" />,
    title: "Knowledge Base",
    description: "Search across founder interview"
  },
  {
    id: "benchmarks",
    icon: <Code className="w-5 h-5" />,
    title: "Benchmarks",
    description: "Access performance metrics and data"
  },
  {
    id: "frameworks",
    icon: <BookCopy className="w-5 h-5" />,
    title: "Frameworks",
    description: "Explore GTM and product strategies"
  }
];

interface SearchModesProps {
  selectedMode: AssistantType;
  setSelectedMode: (mode: AssistantType) => void;
}

export const SearchModes = ({ selectedMode, setSelectedMode }: SearchModesProps) => (
  <div className="grid grid-cols-2 gap-3">
    {searchModes.map((mode) => (
      <div key={mode.id}>
        <Button
          variant="outline"
          className={`w-full py-6 px-6 flex items-center justify-between ${
            selectedMode === mode.id ? 'border-gray-900 bg-gray-50' : ''
          }`}
          onClick={() => setSelectedMode(mode.id)}
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              {mode.icon}
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="text-base font-medium text-gray-900">{mode.title}</span>
              <p className="text-sm text-gray-600">{mode.description}</p>
            </div>
          </div>
        </Button>
      </div>
    ))}
  </div>
);
