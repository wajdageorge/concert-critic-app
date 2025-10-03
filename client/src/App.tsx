import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/lib/protected-route";
import Discover from "@/pages/discover";
import Reviews from "@/pages/reviews";
import Profile from "@/pages/profile";
import Wishlist from "@/pages/wishlist";
import Timeline from "@/pages/timeline";
import Settings from "@/pages/settings";
import SearchUsers from "@/pages/search-users";
import ConcertDetail from "@/pages/concert-detail";
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <ProtectedRoute path="/discover" component={Discover} />
      <ProtectedRoute path="/concerts/:id" component={ConcertDetail} />
      <ProtectedRoute path="/timeline" component={Timeline} />
      <ProtectedRoute path="/search-users" component={SearchUsers} />
      <ProtectedRoute path="/reviews" component={Reviews} />
      <ProtectedRoute path="/wishlist" component={Wishlist} />
      <ProtectedRoute path="/profile/:username" component={Profile} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/notifications" component={() => <NotFound />} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainApp() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  const handleCreateReview = () => {
    navigate("/reviews");
  };

  // Show loading state during auth check
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show landing page layout for unauthenticated users or on auth/landing pages
  const isPublicPage = location === "/" || location === "/auth";
  const shouldShowPublicLayout = !user || isPublicPage;

  if (shouldShowPublicLayout) {
    return (
      <div className="min-h-screen">
        <Router />
      </div>
    );
  }

  // Show authenticated app layout
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        
        {/* Main Content Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header - only show on desktop */}
          <header className="hidden md:flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div>
                <h1 className="font-semibold text-lg">ConcertCritic</h1>
              </div>
            </div>
            <ThemeToggle />
          </header>
          
          {/* Mobile Header - only show on mobile */}
          <header className="md:hidden flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <h1 className="font-semibold text-lg">ConcertCritic</h1>
            <ThemeToggle />
          </header>
          
          {/* Main Content - with padding bottom for mobile nav */}
          <main className="flex-1 overflow-auto p-6 bg-background pb-20 md:pb-6">
            <Router />
          </main>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation - only show on mobile */}
      <MobileBottomNav onCreateReview={handleCreateReview} />
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ThemeProvider defaultTheme="system" storageKey="concertcritic-theme">
            <MainApp />
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
