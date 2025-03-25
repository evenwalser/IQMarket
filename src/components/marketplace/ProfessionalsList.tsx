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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchProfessionals } from '@/services/marketplaceService';
import { Professional, ProfessionalFilter } from '@/types/marketplace';
import { Loader2 } from 'lucide-react';

interface ProfessionalsListProps {
  searchQuery?: string;
}

export const ProfessionalsList: React.FC<ProfessionalsListProps> = ({ searchQuery }) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProfessionalFilter>({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfessionals = async () => {
      try {
        setLoading(true);
        const filter: ProfessionalFilter = { ...filters };
        
        if (searchQuery) {
          filter.search = searchQuery;
        }
        
        const data = await fetchProfessionals(filter);
        setProfessionals(data);
      } catch (err) {
        console.error('Error loading professionals:', err);
        setError('Failed to load professionals. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadProfessionals();
  }, [searchQuery, filters]);

  const handleViewProfile = (id: string) => {
    navigate(`/marketplace/professionals/${id}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
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

  if (professionals.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4">
        No professionals found. Try adjusting your search criteria.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {professionals.map((professional) => (
        <Card key={professional.id} className="overflow-hidden">
          <CardHeader className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={professional.profile_image_url} />
                <AvatarFallback>{getInitials(professional.name)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{professional.name}</CardTitle>
                <CardDescription>{professional.title}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="line-clamp-3 text-sm text-gray-600">
              {professional.bio || 'No bio provided.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {professional.expertise.map((skill, index) => (
                <Badge key={index} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
          <CardFooter className="p-4 bg-gray-50 flex justify-between items-center">
            {professional.hourly_rate ? (
              <span className="font-semibold">${professional.hourly_rate}/hr</span>
            ) : (
              <span className="text-gray-500">Rate not specified</span>
            )}
            <Button
              onClick={() => handleViewProfile(professional.id)}
              variant="outline"
            >
              View Profile
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}; 