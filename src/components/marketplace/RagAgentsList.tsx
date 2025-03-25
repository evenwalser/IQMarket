import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchRagAgents } from '@/services/marketplaceService';
import { RagAgent, RagAgentFilter } from '@/types/marketplace';
import { Loader2, Bot, Lock } from 'lucide-react';

interface RagAgentsListProps {
  searchQuery?: string;
}

export const RagAgentsList: React.FC<RagAgentsListProps> = ({ searchQuery }) => {
  const [agents, setAgents] = useState<RagAgent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RagAgentFilter>({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadAgents = async () => {
      try {
        setLoading(true);
        const filter: RagAgentFilter = { ...filters };
        
        if (searchQuery) {
          filter.search = searchQuery;
        }
        
        const data = await fetchRagAgents(filter);
        setAgents(data);
      } catch (err) {
        console.error('Error loading RAG agents:', err);
        setError('Failed to load RAG agents. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadAgents();
  }, [searchQuery, filters]);

  const handleViewAgent = (id: string) => {
    navigate(`/marketplace/agents/${id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4">
        No RAG agents found. Try adjusting your search criteria.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <Card key={agent.id} className="overflow-hidden">
          <CardHeader className="p-4">
            <div className="flex items-center gap-4">
              <div className="bg-gray-100 p-3 rounded-full">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  {!agent.is_public && (
                    <Lock className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <CardDescription>
                  {agent.creator?.email ? `Created by ${agent.creator.email}` : 'Custom agent'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="line-clamp-3 text-sm text-gray-600">
              {agent.description || 'No description provided.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={agent.is_public ? 'default' : 'outline'}>
                {agent.is_public ? 'Public' : 'Private'}
              </Badge>
              <Badge variant={agent.price ? 'secondary' : 'outline'}>
                {agent.price ? `$${agent.price}` : 'Free'}
              </Badge>
            </div>
          </CardContent>
          <CardFooter className="p-4 bg-gray-50 flex justify-between items-center">
            <Button
              onClick={() => handleViewAgent(agent.id)}
              variant="outline"
              className="w-full"
            >
              View Agent
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}; 