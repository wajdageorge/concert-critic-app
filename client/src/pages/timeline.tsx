import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReviewCard from '@/components/review-card';
import { Users, TrendingUp, Search, Filter, Clock } from 'lucide-react';

interface ReviewWithUser {
  id: string;
  userId: string;
  concertId: string;
  overallRating: number;
  performanceRating: number;
  soundRating: number;
  venueRating: number;
  valueRating: number;
  reviewText: string | null;
  photos: string[] | null;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    profileImage: string | null;
  };
  concert: {
    id: string;
    artist: string;
    venue: string;
    date: string;
    city: string;
    genre: string | null;
    imageUrl: string | null;
  };
}

// Transform function to match ReviewCard props
const transformReviewForCard = (review: ReviewWithUser) => ({
  id: review.id,
  userId: review.userId, // Add userId for ownership check
  user: {
    name: review.user.displayName || review.user.username,
    username: review.user.username,
    avatar: review.user.profileImage || undefined
  },
  concert: {
    artist: review.concert.artist,
    venue: review.concert.venue,
    date: review.concert.date ? new Date(review.concert.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) : 'Unknown',
    city: review.concert.city
  },
  rating: {
    overall: review.overallRating,
    performance: review.performanceRating,
    sound: review.soundRating,
    venue: review.venueRating,
    value: review.valueRating
  },
  reviewText: review.reviewText || '',
  photos: review.photos || [],
  likes: review.likesCount,
  comments: review.commentsCount,
  isLiked: review.isLiked,
  postedAt: review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) : 'Unknown'
});

export default function Timeline() {
  const [activeTab, setActiveTab] = useState('following');
  const [searchQuery, setSearchQuery] = useState('');

  // Get timeline reviews (for now, get all recent reviews as we don't have following system yet)
  const { data: timelineReviews = [], isLoading: timelineLoading, error: timelineError } = useQuery<ReviewWithUser[]>({
    queryKey: ['/api/reviews', 'timeline'],
    queryFn: async () => {
      const response = await fetch('/api/reviews?limit=20&sort=recent');
      if (!response.ok) throw new Error('Failed to fetch timeline');
      return response.json();
    },
  });

  // Get trending/popular reviews
  const { data: trendingReviews = [], isLoading: trendingLoading, error: trendingError } = useQuery<ReviewWithUser[]>({
    queryKey: ['/api/reviews', 'trending'],
    queryFn: async () => {
      const response = await fetch('/api/reviews?limit=20&sort=rating');
      if (!response.ok) throw new Error('Failed to fetch trending reviews');
      return response.json();
    },
  });

  const filteredTimelineReviews = timelineReviews.filter(review =>
    review.concert.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    review.concert.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
    review.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (review.user.displayName && review.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredTrendingReviews = trendingReviews.filter(review =>
    review.concert.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    review.concert.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
    review.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (review.user.displayName && review.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderSkeletons = () => (
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
  );

  const renderError = (error: Error) => (
    <div className="text-center py-12">
      <Clock className="h-16 w-16 mx-auto text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2 text-destructive">Failed to load reviews</h3>
      <p className="text-muted-foreground mb-4">
        There was an error loading the timeline. Please try again.
      </p>
      <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry-timeline">
        Retry
      </Button>
    </div>
  );

  const renderEmptyState = (title: string, description: string) => (
    <div className="text-center py-12">
      <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      <Button data-testid="button-discover-users">
        <Users className="h-4 w-4 mr-2" />
        Discover Users
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="heading-timeline">Social Timeline</h1>
        </div>
        <p className="text-muted-foreground">
          Discover what other music lovers are saying about concerts
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search reviews, artists, or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-timeline"
          />
        </div>
        <Button variant="outline" data-testid="button-filter-timeline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="following" data-testid="tab-following">
            <Users className="h-4 w-4 mr-2" />
            Following
          </TabsTrigger>
          <TabsTrigger value="trending" data-testid="tab-trending">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </TabsTrigger>
        </TabsList>

        <TabsContent value="following" className="space-y-4 mt-6">
          {timelineLoading ? (
            renderSkeletons()
          ) : timelineError ? (
            renderError(timelineError)
          ) : filteredTimelineReviews.length > 0 ? (
            <div className="space-y-6">
              {filteredTimelineReviews.map((review) => (
                <ReviewCard key={review.id} {...transformReviewForCard(review)} />
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search to find reviews
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')} data-testid="button-clear-search">
                Clear Search
              </Button>
            </div>
          ) : (
            renderEmptyState(
              "No reviews from following",
              "Follow other users to see their concert reviews in your timeline"
            )
          )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-4 mt-6">
          {trendingLoading ? (
            renderSkeletons()
          ) : trendingError ? (
            renderError(trendingError)
          ) : filteredTrendingReviews.length > 0 ? (
            <div className="space-y-6">
              {filteredTrendingReviews.map((review) => (
                <ReviewCard key={review.id} {...transformReviewForCard(review)} />
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search to find reviews
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')} data-testid="button-clear-search">
                Clear Search
              </Button>
            </div>
          ) : (
            renderEmptyState(
              "No trending reviews",
              "Be the first to share a concert review and start the conversation"
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}