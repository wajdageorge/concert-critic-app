import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Music, Search, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import stockImage from '@assets/stock_images/concert_crowd_silhou_9fba38fb.jpg';
import logoImage from "@assets/cc-logo.png";

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect authenticated users to discover page
  useEffect(() => {
    if (user) {
      navigate("/discover");
    }
  }, [user, navigate]);

  // Show loading or nothing if redirecting
  if (isLoading || user) {
    return null;
  }

  const handleGetStarted = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="relative z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src={logoImage} 
                alt="ConcertCritic Logo" 
                className="h-10 w-auto"
              />
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/discover" className="text-sm font-medium hover:text-primary transition-colors">
                DISCOVER
              </Link>
              <Link href="/reviews" className="text-sm font-medium hover:text-primary transition-colors">
                REVIEWS
              </Link>
              <Link href="/timeline" className="text-sm font-medium hover:text-primary transition-colors">
                TIMELINE
              </Link>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
              <Link href="/auth">
                <Button variant="ghost" size="sm" data-testid="button-sign-in">
                  SIGN IN
                </Button>
              </Link>
              <Link href="/auth">
                <Button variant="default" size="sm" data-testid="button-create-account">
                  CREATE ACCOUNT
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${stockImage})` }}
        />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Hero Content */}
        <div className="relative z-10 text-center text-white px-4 max-w-4xl">
          <div className="space-y-4 mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Track concerts you've attended.
            </h1>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Save those you want to see.
            </h2>
            <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Tell your friends what's good.
            </h3>
          </div>

          <Button 
            onClick={handleGetStarted}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold rounded-md transition-colors"
            data-testid="button-get-started"
          >
            Get started — it's free!
          </Button>

          <p className="text-sm text-white/80 mt-4 max-w-lg mx-auto">
            The social network for live music lovers. Share your concert experiences and discover your next favorite show.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Your Shows</h3>
              <p className="text-muted-foreground">
                Keep a record of every concert you've attended and rate your experiences.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Discover Events</h3>
              <p className="text-muted-foreground">
                Find upcoming concerts in your area and add them to your wishlist.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect & Share</h3>
              <p className="text-muted-foreground">
                Follow friends, share reviews, and get recommendations for your next show.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}