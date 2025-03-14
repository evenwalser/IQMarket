
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import Index from './Index';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { isAuthenticated, login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    
    if (!success) {
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Main application content (blurred) */}
      <div className="absolute inset-0 filter blur-[4px] opacity-50">
        <Index />
      </div>
      
      {/* Overlay to darken the background */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Login container */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <Card className="w-full max-w-sm shadow-lg border border-gray-200 bg-white/90 backdrop-filter backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-xl font-semibold text-center bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Login to Assistant Explorer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Username
                </label>
                <Input
                  id="username"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9"
                />
              </div>
              <div className="pt-2">
                <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-200">
                  Sign In
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
