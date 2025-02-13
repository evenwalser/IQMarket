
import { useState } from "react";
import { Search, ArrowRight, BookOpen, Building2, Lightbulb, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const filters = {
    type: ["Founder Interviews", "Benchmark Data", "Strategy Frameworks"],
    stage: ["Start", "Build", "Scale"]
  };

  return <div className="min-h-screen bg-[#fafafa]">
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
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Search Section */}
          <section className="text-center space-y-6">
            <h1 className="text-4xl font-bold text-gray-900">Notion Capital Intelligence</h1>
            <p className="text-gray-600 text-lg font-normal">
              Access founder wisdom, benchmark data, and strategic frameworks
            </p>
            <div className="relative max-w-2xl mx-auto">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Input 
                    type="text" 
                    placeholder="Search across our knowledge base..." 
                    className="w-full h-14 pl-12 pr-4 rounded-lg border border-gray-200 focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-500" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Button className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-900 hover:bg-gray-800" size="sm">
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-gray-700"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter by Type
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                  {showFilters && (
                    <div className="absolute top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-100 p-4 z-10">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold mb-2">Content Type</h3>
                          <div className="space-y-2">
                            {filters.type.map((type) => (
                              <label key={type} className="flex items-center gap-2">
                                <input type="checkbox" className="rounded" />
                                <span>{type}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Company Stage</h3>
                          <div className="space-y-2">
                            {filters.stage.map((stage) => (
                              <label key={stage} className="flex items-center gap-2">
                                <input type="checkbox" className="rounded" />
                                <span>{stage}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Categories */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="text-gray-700" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Founder Wisdom</h3>
              <p className="text-gray-600">Access insights from successful founders and operators</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="text-gray-700" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Benchmarking</h3>
              <p className="text-gray-600">Compare metrics and performance data</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <Lightbulb className="text-gray-700" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Strategy Guide</h3>
              <p className="text-gray-600">GTM and product methodologies for each stage</p>
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
    </div>;
};

export default Index;
