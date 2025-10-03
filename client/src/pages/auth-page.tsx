import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Users, Star, TrendingUp, Github, Chrome, Apple, Mail, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";


export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/discover");
    }
  }, [user, navigate]);

  // Show loading if redirecting
  if (isLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 min-h-screen items-center">
          {/* Left Column - Forms */}
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="h-20 w-auto flex items-center justify-center">
                    <img 
                      src="/concert-critic-logo.png" 
                      alt="ConcertCritic Logo" 
                      className="h-16 w-auto object-contain"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold">Welcome to ConcertCritic</CardTitle>
                  <CardDescription>
                    Discover concerts, write reviews, and connect with fellow music lovers
                  </CardDescription>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Button 
                    onClick={handleSignIn}
                    className="w-full h-12 text-base font-medium"
                    data-testid="button-sign-in-replit"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Continue with Your Account
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Continue with Replit Auth
                      </span>
                    </div>
                  </div>
                  
                  
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Secure authentication powered by Replit Auth
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Forgot your password? Password reset is handled automatically during sign-in
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Hero Section */}
          <div className="hidden lg:flex flex-col justify-center space-y-8 p-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">
                Join the Music Community
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Discover amazing concerts, share your experiences, and connect with music lovers around the world.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="bg-primary rounded-lg p-2">
                  <Music className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Discover Concerts</h3>
                  <p className="text-sm text-muted-foreground">
                    Find live music events near you
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-primary rounded-lg p-2">
                  <Star className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Write Reviews</h3>
                  <p className="text-sm text-muted-foreground">
                    Share your concert experiences
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-primary rounded-lg p-2">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Connect</h3>
                  <p className="text-sm text-muted-foreground">
                    Follow other music enthusiasts
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-primary rounded-lg p-2">
                  <TrendingUp className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Trending</h3>
                  <p className="text-sm text-muted-foreground">
                    Stay up to date with music trends
                  </p>
                </div>
              </div>
            </div>
            
            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Join thousands of music lovers sharing their concert experiences
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}