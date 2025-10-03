import { Compass, PenTool, User as UserIcon, Heart, Settings, Bell, Users, LogOut } from "lucide-react";
import logoImage from "@assets/cc-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

const navigationItems = [
  {
    title: "Discover",
    url: "/discover",
    icon: Compass,
    description: "Find concerts near you"
  },
  {
    title: "Timeline",
    url: "/timeline",
    icon: Users,
    description: "Social feed & trending"
  },
  {
    title: "Wishlist",
    url: "/wishlist",
    icon: Heart,
    description: "Saved concerts"
  },
  {
    title: "Profile",
    url: "/profile",
    icon: UserIcon,
    description: "Your music profile"
  },
];

const settingsItems = [
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    badge: "3"
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  const handleNavigation = (url: string, title: string) => {
    console.log(`Navigating to ${title}: ${url}`);
    navigate(url);
  };

  const handleProfileClick = () => {
    console.log('Opening user profile');
    navigate('/profile');
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Generate initials from user name or email
  const getInitials = () => {
    if (!user) return "U";
    
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    
    if (user.firstName) {
      return user.firstName[0].toUpperCase();
    }
    
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return "U";
  };

  // Generate display name
  const getDisplayName = () => {
    if (!user) return "User";
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    if (user.firstName) {
      return user.firstName;
    }
    
    if (user.email) {
      return user.email.split('@')[0];
    }
    
    return "User";
  };

  // Generate username - prioritize custom username
  const getUsername = () => {
    if (!user) return "@user";
    
    // Use custom username if available
    if (user.username) return `@${user.username}`;
    
    // Generate safe fallback from first name (no dots or invalid chars)
    if (user.firstName) {
      const sanitized = user.firstName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (sanitized) return `@${sanitized}`;
    }
    if (user.lastName) {
      const sanitized = user.lastName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (sanitized) return `@${sanitized}`;
    }
    
    return "@user";
  };

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img 
            src={logoImage} 
            alt="ConcertCritic Logo" 
            className="h-8 w-auto"
          />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={isActive ? 'bg-sidebar-accent' : ''}
                      data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                    >
                      <button
                        onClick={() => handleNavigation(item.url, item.title)}
                        className="w-full"
                      >
                        <item.icon className="h-4 w-4" />
                        <div className="text-left">
                          <span className="font-medium">{item.title}</span>
                          <br />
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        </div>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={isActive ? 'bg-sidebar-accent' : ''}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <button
                        onClick={() => handleNavigation(item.url, item.title)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </div>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-lg hover-elevate cursor-pointer" onClick={handleProfileClick}>
          <Avatar data-testid="avatar-current-user">
            <AvatarImage src={user?.profileImageUrl || undefined} alt={getDisplayName()} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" data-testid="text-display-name">{getDisplayName()}</p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-username">{getUsername()}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
