import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import UserProfileCard from '@/components/user-profile-card';
import ReviewCard from '@/components/review-card';
import ConcertCard from '@/components/concert-card';
import { EditProfileDialog } from '@/components/edit-profile-dialog';
import { WriteReviewDialog } from '@/components/write-review-dialog';
import { OnboardingDialog } from '@/components/onboarding-dialog';
import { checkIfUserNeedsOnboarding } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Calendar, PenTool, Heart, Trophy, Award, Star, Music } from 'lucide-react';
import type { PublicUser, ReviewWithUser, ConcertWithRating, UserWithStats } from '@shared/schema';

// Helper functions to transform API data  
const getDisplayName = (user: any) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  return 'Anonymous';
};

const getUsername = (user: any) => {
  // Return custom username if set, otherwise return a safe fallback
  if (user.username) return user.username;
  
  // Generate safe fallback from first name (no dots or invalid chars)
  if (user.firstName) {
    const sanitized = user.firstName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (sanitized) return sanitized;
  }
  if (user.lastName) {
    const sanitized = user.lastName.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (sanitized) return sanitized;
  }
  return 'user';
};

const transformReviewForCard = (review: ReviewWithUser) => ({
  id: review.id,
  userId: review.userId, // Add userId for ownership check
  user: {
    name: getDisplayName(review.user),
    username: getUsername(review.user),
    avatar: review.user.profileImageUrl || undefined
  },
  concert: {
    artist: review.concert.artist,
    venue: review.concert.venue,
    date: new Date(review.concert.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    city: review.concert.city
  },
  rating: {
    overall: review.overallRating,
    performance: review.performanceRating,
    sound: review.soundRating,
    venue: review.venueRating,
    value: review.valueRating
  },
  reviewText: review.reviewText,
  photos: review.photos || [],
  likes: review.likes || 0,
  comments: 0,
  isLiked: review.isLiked || false,
  postedAt: review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) : 'Unknown'
});

const transformConcertForCard = (concert: ConcertWithRating) => ({
  id: concert.id,
  artist: concert.artist,
  venue: concert.venue,
  date: new Date(concert.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }),
  time: concert.time,
  city: concert.city,
  price: concert.price,
  genre: concert.genre || undefined,
  imageUrl: concert.imageUrl || undefined,
  rating: concert.averageRating,
  isWishlisted: true // Items from wishlist API are wishlisted by definition
});

// Mock data removed - now using real API data

export default function Profile() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [, navigate] = useLocation();
  
  // Get current user
  const { data: currentUserBasic, isLoading: userBasicLoading } = useQuery<PublicUser>({
    queryKey: ['/api/user'],
  });

  // Get current user with stats
  const { data: currentUser, isLoading: userStatsLoading } = useQuery<UserWithStats>({
    queryKey: ['/api/users', currentUserBasic?.id, 'stats'],
    queryFn: async () => {
      if (!currentUserBasic?.id) throw new Error('No user ID');
      const response = await fetch(`/api/users/${currentUserBasic.id}`);
      if (!response.ok) throw new Error('Failed to fetch user stats');
      return response.json();
    },
    enabled: !!currentUserBasic?.id,
  });
  
  const userLoading = userBasicLoading || userStatsLoading;

  // Get user's recent reviews (limited for overview section)
  const { data: recentReviews = [], isLoading: recentReviewsLoading, error: recentReviewsError } = useQuery<ReviewWithUser[]>({
    queryKey: ['/api/users', currentUser?.id, 'reviews', 'recent'],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/users/${currentUser.id}/reviews?limit=3`);
      if (!response.ok) throw new Error('Failed to fetch recent reviews');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Get all user's reviews (for reviews tab and accurate stats)
  const { data: allReviews = [], isLoading: allReviewsLoading, error: allReviewsError } = useQuery<ReviewWithUser[]>({
    queryKey: ['/api/users', currentUser?.id, 'reviews', 'all'],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/users/${currentUser.id}/reviews`);
      if (!response.ok) throw new Error('Failed to fetch all reviews');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Get user's wishlist
  const { data: wishlistConcerts = [], isLoading: wishlistLoading, error: wishlistError } = useQuery<ConcertWithRating[]>({
    queryKey: ['/api/users/me/wishlist'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/wishlist');
      if (!response.ok) throw new Error('Failed to fetch wishlist');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  const isLoading = userLoading || recentReviewsLoading || allReviewsLoading || wishlistLoading;
  
  // Check if user needs onboarding when basic user data loads
  useEffect(() => {
    if (currentUserBasic && checkIfUserNeedsOnboarding(currentUserBasic as any)) {
      setIsOnboardingOpen(true);
    }
  }, [currentUserBasic]);
  
  const handleEditProfile = () => {
    setIsEditProfileOpen(true);
  };

  const handleViewAllReviews = () => {
    setActiveTab('reviews');
  };

  const handleViewAllConcerts = () => {
    setActiveTab('concerts');
  };

  const handleNavigateToDiscover = () => {
    navigate('/');
  };

  const handleWriteFirstReview = () => {
    setIsWriteReviewOpen(true);
  };

  const handleEditReview = (reviewId: string) => {
    setEditingReviewId(reviewId);
    setIsWriteReviewOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your music profile and review history
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleEditProfile}
          data-testid="button-settings"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : currentUser ? (
            <UserProfileCard
              user={{
                id: currentUser.id,
                name: getDisplayName(currentUser),
                username: getUsername(currentUser),
                bio: currentUser.bio || undefined,
                avatar: currentUser.profileImageUrl || undefined,
                location: currentUser.location || undefined,
                joinedDate: currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric'
                }) : 'Unknown',
                isVerified: currentUser.isVerified || false,
                isPrivate: currentUser.isPrivate || false
              }}
              stats={{
                concertsAttended: currentUser.stats?.concertsAttended || 0,
                reviewsWritten: currentUser.stats?.reviewsWritten || 0,
                followers: currentUser.stats?.followers || 0,
                following: currentUser.stats?.following || 0,
                averageRating: currentUser.stats?.averageRating
              }}
              favoriteGenres={allReviews.length > 0 
                ? Array.from(new Set(allReviews.map(review => review.concert.genre).filter((genre): genre is string => Boolean(genre)))).slice(0, 5)
                : []
              }
              isCurrentUser={true}
              onEditProfile={handleEditProfile}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Failed to load profile</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Content Tabs */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" data-testid="tab-overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="reviews" data-testid="tab-reviews">
                <PenTool className="h-4 w-4 mr-1" />
                Reviews
              </TabsTrigger>
              <TabsTrigger value="concerts" data-testid="tab-concerts">
                <Calendar className="h-4 w-4 mr-1" />
                History
              </TabsTrigger>
              <TabsTrigger value="wishlist" data-testid="tab-wishlist">
                <Heart className="h-4 w-4 mr-1" />
                Wishlist
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Achievements Section */}
              {currentUser && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Achievements
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Concert Achievements */}
                    <Card className={`${(currentUser.stats?.concertsAttended || 0) >= 1 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200' : 'opacity-50'}`}>
                      <CardContent className="p-4 text-center">
                        <Music className={`h-8 w-8 mx-auto mb-2 ${(currentUser.stats?.concertsAttended || 0) >= 1 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
                        <h4 className="font-medium text-sm">First Concert</h4>
                        <p className="text-xs text-muted-foreground">Attend your first concert</p>
                      </CardContent>
                    </Card>

                    <Card className={`${(currentUser.stats?.concertsAttended || 0) >= 5 ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200' : 'opacity-50'}`}>
                      <CardContent className="p-4 text-center">
                        <Star className={`h-8 w-8 mx-auto mb-2 ${(currentUser.stats?.concertsAttended || 0) >= 5 ? 'text-blue-600' : 'text-muted-foreground'}`} />
                        <h4 className="font-medium text-sm">Concert Explorer</h4>
                        <p className="text-xs text-muted-foreground">Attend 5 concerts</p>
                      </CardContent>
                    </Card>

                    <Card className={`${(currentUser.stats?.reviewsWritten || 0) >= 1 ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200' : 'opacity-50'}`}>
                      <CardContent className="p-4 text-center">
                        <PenTool className={`h-8 w-8 mx-auto mb-2 ${(currentUser.stats?.reviewsWritten || 0) >= 1 ? 'text-green-600' : 'text-muted-foreground'}`} />
                        <h4 className="font-medium text-sm">First Review</h4>
                        <p className="text-xs text-muted-foreground">Write your first review</p>
                      </CardContent>
                    </Card>

                    <Card className={`${(currentUser.stats?.reviewsWritten || 0) >= 10 ? 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200' : 'opacity-50'}`}>
                      <CardContent className="p-4 text-center">
                        <Award className={`h-8 w-8 mx-auto mb-2 ${(currentUser.stats?.reviewsWritten || 0) >= 10 ? 'text-purple-600' : 'text-muted-foreground'}`} />
                        <h4 className="font-medium text-sm">Review Expert</h4>
                        <p className="text-xs text-muted-foreground">Write 10 reviews</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Recent Reviews */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Recent Reviews</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleViewAllReviews}
                    data-testid="button-view-all-reviews"
                  >
                    View All
                  </Button>
                </div>
                {recentReviewsLoading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center space-x-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-2 w-16" />
                            </div>
                          </div>
                          <Skeleton className="h-12 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : recentReviewsError ? (
                  <div className="text-center py-8 bg-destructive/10 rounded-lg border border-destructive/20">
                    <PenTool className="h-12 w-12 mx-auto text-destructive mb-2" />
                    <p className="text-destructive mb-2">Failed to load recent reviews</p>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                      Retry
                    </Button>
                  </div>
                ) : recentReviews.length > 0 ? (
                  <div className="space-y-4">
                    {recentReviews.slice(0, 2).map((review) => (
                      <ReviewCard 
                        key={review.id} 
                        {...transformReviewForCard(review)} 
                        onEdit={() => handleEditReview(review.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/20 rounded-lg">
                    <PenTool className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No reviews yet</p>
                  </div>
                )}
              </div>

              {/* Recent Concerts */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Recent Concerts</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleViewAllConcerts}
                    data-testid="button-view-all-concerts"
                  >
                    View All
                  </Button>
                </div>
                {recentReviewsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(2)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4 space-y-3">
                          <Skeleton className="h-32 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : recentReviews.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentReviews.slice(0, 2).map((review) => (
                      <ConcertCard key={review.concert.id} {...transformConcertForCard(review.concert)} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/20 rounded-lg">
                    <Music className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No concerts reviewed yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4 mt-6">
              {allReviewsLoading ? (
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6 space-y-3">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-20 w-full" />
                        <div className="flex space-x-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : allReviewsError ? (
                <div className="text-center py-12">
                  <PenTool className="h-16 w-16 mx-auto text-destructive mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-destructive">Failed to load reviews</h3>
                  <p className="text-muted-foreground mb-4">
                    There was an error loading your reviews. Please try again.
                  </p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              ) : allReviews.length > 0 ? (
                <div className="space-y-6">
                  {allReviews.map((review) => (
                    <ReviewCard 
                      key={review.id} 
                      {...transformReviewForCard(review)}
                      onEdit={() => handleEditReview(review.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <PenTool className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start sharing your concert experiences
                  </p>
                  <Button 
                    onClick={handleWriteFirstReview}
                    data-testid="button-write-first-review"
                  >
                    Write Your First Review
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="concerts" className="space-y-4 mt-6">
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Concert history</h3>
                <p className="text-muted-foreground mb-4">
                  Your concert attendance history will appear here
                </p>
                <Button 
                  onClick={handleNavigateToDiscover}
                  data-testid="button-discover-concerts-history"
                >
                  Discover Concerts
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="wishlist" className="space-y-4 mt-6">
              {wishlistError ? (
                <div className="text-center py-12">
                  <Heart className="h-16 w-16 mx-auto text-destructive mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-destructive">Failed to load wishlist</h3>
                  <p className="text-muted-foreground mb-4">
                    There was an error loading your saved concerts. Please try again.
                  </p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              ) : wishlistConcerts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wishlistConcerts.map((concert) => (
                    <ConcertCard key={concert.id} {...transformConcertForCard(concert)} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No concerts saved</h3>
                  <p className="text-muted-foreground mb-4">
                    Save concerts you're interested in to your wishlist
                  </p>
                  <Button 
                    onClick={handleNavigateToDiscover}
                    data-testid="button-discover-concerts-wishlist"
                  >
                    Discover Concerts
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      {currentUser && (
        <EditProfileDialog 
          open={isEditProfileOpen}
          onOpenChange={setIsEditProfileOpen}
          user={{
            id: currentUser.id,
            name: getDisplayName(currentUser),
            username: currentUser.username || undefined,
            bio: currentUser.bio || undefined,
            avatar: currentUser.profileImageUrl || undefined,
            location: currentUser.location || undefined
          }}
        />
      )}

      {/* Write Review Dialog */}
      <WriteReviewDialog 
        open={isWriteReviewOpen}
        onOpenChange={(open) => {
          setIsWriteReviewOpen(open);
          if (!open) setEditingReviewId(null);
        }}
        editingReviewId={editingReviewId}
      />

      {/* Onboarding Dialog */}
      {currentUserBasic && (
        <OnboardingDialog 
          open={isOnboardingOpen}
          onOpenChange={setIsOnboardingOpen}
          user={{
            id: currentUserBasic.id,
            email: (currentUserBasic as any).email || undefined,
            firstName: currentUserBasic.firstName || undefined,
            lastName: currentUserBasic.lastName || undefined,
          }}
        />
      )}

    </div>
  );
}
