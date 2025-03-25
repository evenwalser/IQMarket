import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ProfessionalsList } from '@/components/marketplace/ProfessionalsList';
import { RagAgentsList } from '@/components/marketplace/RagAgentsList';
import { Search } from 'lucide-react';

const Marketplace: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('professionals');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Apply search filter based on activeTab
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <div className="flex gap-2">
          {user && (
            <>
              <Button 
                variant="outline" 
                onClick={() => navigate('/marketplace/my-profile')}
              >
                My Professional Profile
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/marketplace/my-agents')}
              >
                My RAG Agents
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="relative w-full max-w-lg mx-auto">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder={`Search ${activeTab === 'professionals' ? 'professionals' : 'RAG agents'}...`}
            className="w-full px-4 py-2 border rounded-md pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            type="submit" 
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
            aria-label="Search"
          >
            <Search className="h-5 w-5 text-gray-400" />
          </button>
        </form>
      </div>

      <Tabs
        defaultValue="professionals"
        onValueChange={(value) => setActiveTab(value)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="professionals">Professionals</TabsTrigger>
          <TabsTrigger value="agents">RAG Agents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="professionals" className="mt-6">
          <ProfessionalsList searchQuery={searchQuery} />
        </TabsContent>
        
        <TabsContent value="agents" className="mt-6">
          <RagAgentsList searchQuery={searchQuery} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Marketplace; 