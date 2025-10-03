import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Users, UserPlus, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import type { PublicUser } from "@shared/schema";

export default function SearchUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: searchResults, isLoading, error } = useQuery<PublicUser[]>({
    queryKey: ["/api/users/search", { q: searchQuery }],
    enabled: searchQuery.length >= 2,
  });

  const followUserMutation = async (userId: string) => {
    try {
      await apiRequest("POST", `/api/users/${userId}/follow`);
      queryClient.invalidateQueries({ queryKey: ["/api/users/search"] });
      toast({
        title: "Success",
        description: "User followed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to follow user",
        variant: "destructive",
      });
    }
  };

  const unfollowUserMutation = async (userId: string) => {
    try {
      await apiRequest("DELETE", `/api/users/${userId}/follow`);
      queryClient.invalidateQueries({ queryKey: ["/api/users/search"] });
      toast({
        title: "Success", 
        description: "User unfollowed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unfollow user",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Find Friends
        </h1>
        <p className="text-muted-foreground">
          Discover other music lovers and concert enthusiasts
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-users"
        />
      </div>

      {searchQuery.length > 0 && searchQuery.length < 2 && (
        <div className="text-center text-muted-foreground py-8">
          Type at least 2 characters to search for users
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Searching users...</p>
        </div>
      )}

      {error && (
        <div className="text-center text-muted-foreground py-8">
          Failed to search users. Please try again.
        </div>
      )}

      {searchResults && Array.isArray(searchResults) && searchResults.length === 0 && searchQuery.length >= 2 && !isLoading && (
        <div className="text-center text-muted-foreground py-8">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No users found matching "{searchQuery}"</p>
        </div>
      )}

      <div className="space-y-3">
        {Array.isArray(searchResults) && searchResults.map((user: PublicUser) => (
          <Card key={user.id} className="hover-elevate" data-testid={`card-user-${user.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <h3 className="font-semibold" data-testid={`text-username-${user.id}`}>
                      {user.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">@{user.username || user.name}</p>
                    
                    <div className="flex items-center gap-2 text-sm">
                      {user.bio && (
                        <p className="text-sm text-muted-foreground">{user.bio}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {false ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unfollowUserMutation(user.id)}
                      data-testid={`button-unfollow-${user.id}`}
                    >
                      Following
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => followUserMutation(user.id)}
                      className="flex items-center gap-2"
                      data-testid={`button-follow-${user.id}`}
                    >
                      <UserPlus className="h-4 w-4" />
                      Follow
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}