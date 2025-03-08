import React from 'react';
import { BookOpen, BarChart3, LayoutGrid } from 'lucide-react';
import type { AssistantType } from "@/lib/types";

interface ModePopoverProps {
  mode: AssistantType;
}

export const ModePopover: React.FC<ModePopoverProps> = ({ mode }) => {
  // Content configuration for each mode
  const modeConfig = {
    knowledge: {
      icon: <BookOpen className="w-6 h-6 text-purple-600" />,
      title: "Knowledge Base",
      description: "Search across founder interviews, best practices, and expert advice.",
      exampleQuestions: [
        "What are common challenges when scaling a SaaS business?",
        "How did successful founders approach product-market fit?",
        "What strategies work for high-growth B2B companies?"
      ]
    },
    benchmarks: {
      icon: <BarChart3 className="w-6 h-6 text-red-500" />,
      title: "Benchmarks",
      description: "Access performance metrics, industry standards, and comparative data.",
      exampleQuestions: [
        "What's a good CAC ratio for SaaS companies?",
        "How does our churn rate compare to industry averages?", 
        "What's the average ARR growth for Series A startups?"
      ]
    },
    frameworks: {
      icon: <LayoutGrid className="w-6 h-6 text-green-500" />,
      title: "Frameworks",
      description: "Explore go-to-market strategies, growth frameworks, and operational playbooks.",
      exampleQuestions: [
        "What framework should I use for product-led growth?",
        "How can I implement a growth loops strategy?",
        "What's the best framework for customer segmentation?"
      ]
    },
    assistant: {
      icon: <BookOpen className="w-6 h-6 text-blue-500" />,
      title: "Assistant",
      description: "General purpose assistant.",
      exampleQuestions: [
        "How can I help you today?",
        "What would you like to know?",
        "Ask me anything!"
      ]
    }
  };

  const config = modeConfig[mode];

  return (
    <div className="w-64 p-4 bg-white rounded-lg shadow-lg border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        {config.icon}
        <h3 className="font-semibold text-lg">{config.title}</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{config.description}</p>
      
      <div>
        <p className="text-xs text-gray-500 mb-1">Example questions:</p>
        <div className="space-y-1">
          {config.exampleQuestions.map((question, index) => (
            <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              {question}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 