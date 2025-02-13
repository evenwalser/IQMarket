
import { useState } from "react";
import { Search, ArrowRight, BookOpen, Building2, Lightbulb, Filter, ChevronDown, Upload, BookCopy, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState("knowledge");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  
  const searchModes = [
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
    },
    {
      id: "assistant",
      icon: <img src="/lovable-uploads/c2262027-b8b6-463f-a60d-e7ca966af0e0.png" alt="AI Assistant" className="w-5 h-5" />,
      title: "AI Assistant",
      description: "Get personalized recommendations"
    }
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("File uploaded:", file.name);
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between py-px">
          <div className="flex items-center">
            <img src="/lovable-uploads/c043db32-f19c-4f34-8153-6fbc96dab40a.png" alt="Notion Capital" className="h-[84px] mr-2 rounded-lg" />
            <span className="text-lg font-medium text-gray-900"></span>
          </div>
          <nav className="space-x-6">
            <Button variant="ghost" className="text-gray-700 hover:text-gray-900">Resources</Button>
            <Button variant="ghost" className="text-gray-700 hover:text-gray-900">Portfolio</Button>
            <Button variant="ghost" className="text-gray-700 hover:text-gray-900">About</Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Search Section */}
          <section className="text-center space-y-6">
            <h1 className="text-4xl font-bold text-gray-900">Notion Capital Intelligence</h1>
            <p className="text-gray-600 text-lg font-normal">
              Access founder wisdom, benchmark data, and strategic frameworks
            </p>
            <div className="relative">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        type="text" 
                        placeholder="Ask anything..." 
                        className="w-full h-14 pl-12 pr-24 rounded-lg border border-gray-200 focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-500" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                      />
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="relative"
                          onClick={() => setShowAttachMenu(!showAttachMenu)}
                        >
                          <Upload className="h-5 w-5 text-gray-600" />
                          <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileUpload}
                            accept=".pdf,.doc,.docx,.txt,.csv,image/*"
                          />
                        </Button>
                        <Button className="bg-gray-900 hover:bg-gray-800">
                          <ArrowRight className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Search Modes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {searchModes.map((mode) => (
                    <div key={mode.id} className="h-[140px]">
                      <Button
                        variant="outline"
                        className={`w-full h-full flex flex-col items-start p-4 ${
                          selectedMode === mode.id ? 'border-gray-900 bg-gray-50' : ''
                        }`}
                        onClick={() => setSelectedMode(mode.id)}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          {mode.icon}
                          <span className="text-lg font-medium">{mode.title}</span>
                        </div>
                        <p className="text-[15px] text-gray-600 text-left leading-relaxed">{mode.description}</p>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Example Results */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Featured Content</h2>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: 'Building Sales Teams',
                  type: 'Founder Interview',
                  stage: 'Scale',
                  description: 'Learn how successful B2B SaaS companies built their early sales teams...'
                },
                {
                  title: 'SaaS Metrics Benchmarks 2024',
                  type: 'Benchmark Data',
                  stage: 'All Stages',
                  description: 'Compare your performance against European SaaS companies...'
                },
                {
                  title: 'Product-Market Fit Framework',
                  type: 'Strategy Guide',
                  stage: 'Start',
                  description: 'A systematic approach to finding and validating PMF...'
                }
              ].map(item => (
                <div key={item.title} className="bg-white p-6 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
                    <div className="flex gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{item.type}</span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{item.stage}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{item.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-4">Last updated: 2 days ago</span>
                    <span>5 min read</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
