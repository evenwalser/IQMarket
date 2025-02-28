
import { BookOpen, Code, BookCopy } from "lucide-react";
import type { AssistantType } from "@/lib/types";

interface ModeExplainerProps {
  mode: AssistantType;
}

export const ModeExplainer = ({ mode }: ModeExplainerProps) => {
  const modeData = {
    knowledge: {
      icon: <BookOpen className="w-5 h-5 text-purple-600" />,
      title: "Knowledge Base",
      description: "Search across founder interviews, best practices, and expert advice.",
      examples: [
        "What are common challenges when scaling a SaaS business?",
        "How did successful founders approach product-market fit?",
        "What strategies work for high-growth companies?"
      ]
    },
    benchmarks: {
      icon: <Code className="w-5 h-5 text-rose-400" />,
      title: "Benchmarks",
      description: "Access performance metrics, industry standards, and comparative data.",
      examples: [
        "What's a good CAC ratio for SaaS companies?",
        "How does our churn rate compare to industry benchmarks?",
        "What's the average ARR growth for Series B startups?"
      ]
    },
    frameworks: {
      icon: <BookCopy className="w-5 h-5 text-green-500" />,
      title: "Frameworks",
      description: "Explore go-to-market strategies, growth frameworks, and operational methods.",
      examples: [
        "What framework should I use for product prioritization?",
        "How can I implement a growth loops strategy?",
        "What's the best framework for customer segmentation?"
      ]
    }
  };

  const data = modeData[mode];

  return (
    <div className="space-y-2 overflow-hidden">
      <div className="flex items-center gap-2">
        {data.icon}
        <h3 className="font-medium">{data.title}</h3>
      </div>
      <p className="text-sm text-gray-600 line-clamp-2">{data.description}</p>
      <div className="mt-2">
        <h4 className="text-xs font-medium text-gray-700 mb-1">Example questions:</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          {data.examples.map((example, i) => (
            <li key={i} className="pl-2 border-l-2 border-gray-300 line-clamp-1 hover:line-clamp-none">{example}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
