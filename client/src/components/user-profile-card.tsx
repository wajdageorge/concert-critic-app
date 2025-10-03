import { Calendar, MapPin, Music, Users, PenTool, Star } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface UserProfileCardProps {
  user: {
    id: string;
    name: string;
    username: string;
    bio?: string;
    avatar?: string;
    location?: string;
    joinedDate: string;
    isVerified?: boolean;
    isPrivate?: boolean;
  };
  stats: {
    concertsAttended: number;
    reviewsWritten: number;
    followers: number;
    following: number;
    averageRating?: number;
  };
  favoriteGenres?: string[];
  isFollowing?: boolean;
  isCurrentUser?: boolean;
  onEditProfile?: () => void;
}

export default function UserProfileCard({
  user,
  stats,
  favoriteGenres = [],
  isFollowing = false,
  isCurrentUser = false,
  onEditProfile,
}: UserProfileCardProps) {
  const [followingState, setFollowingState] = useState(isFollowing);
  const [followersCount, setFollowersCount] = useState(stats.followers);

  const handleFollow = () => {
    if (!isCurrentUser) {
      setFollowingState(!followingState);
      setFollowersCount(prev => followingState ? prev - 1 : prev + 1);
      console.log(`${followingState ? 'Unfollowed' : 'Followed'} user: ${user.username}`);
    }
  };

  const handleEditProfile = () => {
    if (onEditProfile) {
      onEditProfile();
    } else {
      console.log('No edit profile handler provided');
    }
  };

  const handleMessage = () => {
    console.log(`Opening message with: ${user.username}`);
  };

  return (
    <Card className="w-full max-w-md" data-testid={`card-user-profile-${user.id}`}>
      <CardHeader className="text-center pb-2">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="w-20 h-20" data-testid={`avatar-user-${user.username}`}>
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-lg">{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 justify-center">
              <h3 className="font-bold text-lg" data-testid={`text-name-${user.username}`}>
                {user.name}
              </h3>
              {user.isVerified && (
                <Badge variant="secondary" className="text-xs">
                  ✓ Verified
                </Badge>
              )}
              {user.isPrivate && (
                <Badge variant="outline" className="text-xs">
                  Private
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm" data-testid={`text-username-${user.username}`}>
              @{user.username}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Bio */}
        {user.bio && (
          <p className="text-sm text-center leading-relaxed" data-testid={`text-bio-${user.username}`}>
            {user.bio}
          </p>
        )}

        {/* Location and Join Date */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          {user.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{user.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Joined {user.joinedDate}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="font-bold text-lg" data-testid={`stat-concerts-${user.username}`}>
              {stats.concertsAttended}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Music className="h-3 w-3" />
              Concerts
            </div>
          </div>
          <div>
            <div className="font-bold text-lg" data-testid={`stat-reviews-${user.username}`}>
              {stats.reviewsWritten}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <PenTool className="h-3 w-3" />
              Reviews
            </div>
          </div>
          <div>
            <div className="font-bold text-lg" data-testid={`stat-followers-${user.username}`}>
              {followersCount}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Users className="h-3 w-3" />
              Followers
            </div>
          </div>
          <div>
            <div className="font-bold text-lg" data-testid={`stat-following-${user.username}`}>
              {stats.following}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Users className="h-3 w-3" />
              Following
            </div>
          </div>
        </div>

        {/* Average Rating */}
        {stats.averageRating && (
          <div className="flex items-center justify-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{stats.averageRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">avg rating</span>
          </div>
        )}

        {/* Favorite Genres */}
        {favoriteGenres.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground text-center">Favorite Genres</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {favoriteGenres.slice(0, 4).map((genre) => (
                <Badge key={genre} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
              {favoriteGenres.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{favoriteGenres.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isCurrentUser ? (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleEditProfile}
              data-testid="button-edit-profile"
            >
              Edit Profile
            </Button>
          ) : (
            <>
              <Button
                variant={followingState ? "outline" : "default"}
                className="flex-1"
                onClick={handleFollow}
                data-testid={`button-follow-${user.username}`}
              >
                {followingState ? "Following" : "Follow"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleMessage}
                data-testid={`button-message-${user.username}`}
              >
                <PenTool className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
