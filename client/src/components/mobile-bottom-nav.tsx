import { Compass, Users, User, UserSearch, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const leftNavigationItems = [
  {
    title: "Timeline", 
    url: "/timeline",
    icon: Users,
  },
  {
    title: "Find Friends",
    url: "/search-users",
    icon: UserSearch,
  },
];

const rightNavigationItems = [
  {
    title: "Discover",
    url: "/discover",
    icon: Compass,
  },
  {
    title: "Profile",
    url: "/profile", 
    icon: User,
  },
];

interface MobileBottomNavProps {
  onCreateReview?: () => void;
}

export function MobileBottomNav({ onCreateReview }: MobileBottomNavProps) {
  const [location, navigate] = useLocation();

  const handleNavigation = (url: string) => {
    navigate(url);
  };

  const handleCreateReview = () => {
    if (onCreateReview) {
      onCreateReview();
    } else {
      // Default navigation to reviews page for creating
      navigate("/reviews");
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="flex items-center justify-between px-4 py-2 safe-area-inset-bottom">
        {/* Left tabs */}
        <div className="flex flex-1 justify-around">
          {leftNavigationItems.map((item) => {
            const isActive = location === item.url;
            
            return (
              <button
                key={item.title}
                onClick={() => handleNavigation(item.url)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                data-testid={`tab-${item.title.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon className={cn("h-5 w-5 mb-1", isActive && "text-primary")} />
                <span className="text-xs font-medium">{item.title}</span>
              </button>
            );
          })}
        </div>

        {/* Center create review button */}
        <div className="flex-shrink-0 mx-4">
          <button
            onClick={handleCreateReview}
            className="flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover-elevate active-elevate-2"
            data-testid="button-create-review"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Right tabs */}
        <div className="flex flex-1 justify-around">
          {rightNavigationItems.map((item) => {
            const isActive = location === item.url;
            
            return (
              <button
                key={item.title}
                onClick={() => handleNavigation(item.url)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                data-testid={`tab-${item.title.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon className={cn("h-5 w-5 mb-1", isActive && "text-primary")} />
                <span className="text-xs font-medium">{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}