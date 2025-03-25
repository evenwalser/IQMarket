import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  fetchProfessionals, 
  createProfessional, 
  updateProfessional 
} from '@/services/marketplaceService';
import { Professional } from '@/types/marketplace';
import { X } from 'lucide-react';

const MyProfile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [professional, setProfessional] = useState<Professional | null>(null);
  
  // Form state
  const [name, setName] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [expertise, setExpertise] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState<string>('');

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const data = await fetchProfessionals({ search: user.email });
        const userProfile = data.find(profile => profile.user_id === user.id);
        
        if (userProfile) {
          setProfessional(userProfile);
          setName(userProfile.name);
          setTitle(userProfile.title);
          setBio(userProfile.bio || '');
          setHourlyRate(userProfile.hourly_rate?.toString() || '');
          setLinkedinUrl(userProfile.linkedin_url || '');
          setExpertise(userProfile.expertise || []);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSkill.trim() && !expertise.includes(currentSkill.trim())) {
      setExpertise([...expertise, currentSkill.trim()]);
      setCurrentSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setExpertise(expertise.filter(s => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!name.trim() || !title.trim() || expertise.length === 0) {
      setError('Name, title, and at least one expertise are required.');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const profileData = {
        name,
        title,
        bio: bio || undefined,
        hourly_rate: hourlyRate ? parseInt(hourlyRate, 10) : undefined,
        linkedin_url: linkedinUrl || undefined,
        expertise,
        user_id: user.id,
      };
      
      if (professional) {
        await updateProfessional(professional.id, profileData);
        setSuccess('Profile updated successfully!');
      } else {
        await createProfessional(profileData as any);
        setSuccess('Profile created successfully!');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again later.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Professional Profile</h1>
        <Button 
          variant="outline" 
          onClick={() => navigate('/marketplace')}
        >
          Back to Marketplace
        </Button>
      </div>
      
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>{professional ? 'Edit' : 'Create'} Your Professional Profile</CardTitle>
          <CardDescription>
            Complete your profile to offer your expertise on the marketplace
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 text-green-600 p-3 rounded-md">
                {success}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">Professional Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Data Scientist, Marketing Strategist, etc."
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about your professional background and expertise..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate (USD)</Label>
              <Input
                id="hourlyRate"
                type="number"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
              <Input
                id="linkedinUrl"
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourusername"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Expertise *</Label>
              <div className="flex gap-2">
                <Input
                  value={currentSkill}
                  onChange={(e) => setCurrentSkill(e.target.value)}
                  placeholder="Add a skill or expertise"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(e);
                    }
                  }}
                />
                <Button 
                  type="button" 
                  onClick={handleAddSkill}
                  variant="outline"
                >
                  Add
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {expertise.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {expertise.length === 0 && (
                <p className="text-sm text-gray-500">Add at least one expertise</p>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate('/marketplace')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving || loading}
            >
              {saving ? 'Saving...' : (professional ? 'Update Profile' : 'Create Profile')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default MyProfile; 