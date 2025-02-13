
import { useState } from "react";
import { Search, ArrowRight, BookOpen, Building2, Lightbulb, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-semibold">Notion Capital KB</div>
          <nav className="space-x-6">
            <Button variant="ghost">Resources</Button>
            <Button variant="ghost">Portfolio</Button>
            <Button variant="ghost">About</Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Search Section */}
          <section className="text-center space-y-6">
            <h1 className="text-4xl font-bold">Access Notion Capital's Knowledge Base</h1>
            <p className="text-gray-600 text-lg">
              Find insights, resources, and guidance for early-stage startups
            </p>
            <div className="relative max-w-2xl mx-auto">
              <Input
                type="text"
                placeholder="Ask anything about startup growth, funding, or strategies..."
                className="w-full h-14 pl-12 pr-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <Button 
                className="absolute right-2 top-1/2 -translate-y-1/2"
                size="sm"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </section>

          {/* Categories */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="text-blue-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Knowledge Base</h3>
              <p className="text-gray-600">Access comprehensive guides and resources</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="text-green-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Portfolio Insights</h3>
              <p className="text-gray-600">Learn from successful portfolio companies</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4">
                <Lightbulb className="text-purple-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Strategic Advice</h3>
              <p className="text-gray-600">Get expert guidance for your startup</p>
            </div>
          </section>

          {/* Example Results */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent Insights</h2>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            <div className="space-y-4">
              {['Fundraising Best Practices', 'Go-to-Market Strategy', 'Product-Market Fit'].map((topic) => (
                <div key={topic} className="bg-white p-6 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                  <h3 className="font-semibold text-lg mb-2">{topic}</h3>
                  <p className="text-gray-600 mb-4">
                    Key insights and strategies from Notion Capital's expertise in {topic.toLowerCase()}...
                  </p>
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
