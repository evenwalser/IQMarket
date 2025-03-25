import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { fetchProfessionalById } from '@/services/marketplaceService';
import { Professional } from '@/types/marketplace';
import { Separator } from '@/components/ui/separator';

const ProfessionalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfessional = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await fetchProfessionalById(id);
        setProfessional(data);
      } catch (err) {
        console.error('Error loading professional:', err);
        setError('Failed to load professional details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadProfessional();
  }, [id]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 flex justify-center items-center h-64">
        <div className="animate-pulse">Loading professional details...</div>
      </div>
    );
  }

  if (error || !professional) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center text-red-500 p-4">
          {error || 'Professional not found'}
        </div>
        <div className="flex justify-center mt-4">
          <Button onClick={() => navigate('/marketplace')}>
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Button 
        variant="outline" 
        onClick={() => navigate('/marketplace')}
        className="mb-6"
      >
        Back to Marketplace
      </Button>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={professional.profile_image_url} alt={professional.name} />
                  <AvatarFallback>{getInitials(professional.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{professional.name}</CardTitle>
                  <CardDescription className="text-lg">{professional.title}</CardDescription>
                  <div className="mt-2">
                    {professional.hourly_rate ? (
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        ${professional.hourly_rate}/hr
                      </Badge>
                    ) : (
                      <Badge variant="outline">Rate not specified</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">About</h3>
                  <p className="text-gray-700">
                    {professional.bio || 'No bio provided.'}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {professional.expertise.map((skill, index) => (
                      <Badge key={index}>{skill}</Badge>
                    ))}
                  </div>
                </div>
                
                {professional.linkedin_url && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-medium mb-2">Professional Networks</h3>
                      <a 
                        href={professional.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                        </svg>
                        LinkedIn Profile
                      </a>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Book a Session</CardTitle>
              <CardDescription>Schedule time with this professional</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Button className="w-full flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  View Availability
                </Button>
              </div>
              <p className="text-sm text-gray-500 text-center">
                Note: Booking functionality will be available soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDetail; 