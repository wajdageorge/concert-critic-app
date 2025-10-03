import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReviewCard from '@/components/review-card';
import { WriteReviewDialog } from '@/components/write-review-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PenTool, Plus } from 'lucide-react';
import type { ReviewWithUser, PublicUser } from '@shared/schema';

// Helper function to transform API review data for the ReviewCard component
const transformReviewForCard = (review: ReviewWithUser, currentUser: PublicUser | undefined) => ({
  id: review.id,
  userId: review.userId, // Add userId for ownership check
  user: {
    name: `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim() || 'Anonymous',
    username: review.user.username || 'anonymous',
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
  comments: 0, // TODO: Add comments count when implemented
  isLiked: review.isLiked || false,
  postedAt: review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) : 'Unknown'
});

// All mock data removed - now using real API data

export default function Reviews() {
  const [activeTab, setActiveTab] = useState('my-reviews');
  const [writeReviewOpen, setWriteReviewOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  
  // Get current user
  const { data: currentUser, isLoading: userLoading } = useQuery<PublicUser>({
    queryKey: ['/api/user'],
  });

  // Get user's reviews
  const { data: reviews = [], isLoading: reviewsLoading, error } = useQuery<ReviewWithUser[]>({
    queryKey: ['/api/users', currentUser?.id, 'reviews'],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/users/${currentUser.id}/reviews`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });
  
  const handleWriteReview = () => {
    setWriteReviewOpen(true);
  };

  const handleEditReview = (reviewId: string) => {
    setEditingReviewId(reviewId);
    setWriteReviewOpen(true);
  };

  const isLoading = userLoading || reviewsLoading;
  
  const stats = {
    totalReviews: reviews.length,
    averageRating: reviews.length > 0 
      ? Number((reviews.reduce((sum, review) => sum + review.overallRating, 0) / reviews.length).toFixed(1))
      : 0,
    totalLikes: reviews.reduce((sum, review) => sum + (review.likes || 0), 0),
    totalComments: 0 // TODO: Add comments count when implemented
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            My Reviews
          </h1>
          <p className="text-muted-foreground mt-1">
            Share your concert experiences with the community
          </p>
        </div>
        <Button onClick={handleWriteReview} data-testid="button-write-review">
          <Plus className="h-4 w-4 mr-2" />
          Write Review
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">
            {isLoading ? '...' : stats.totalReviews}
          </div>
          <div className="text-sm text-muted-foreground">Total Reviews</div>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">
            {isLoading ? '...' : stats.averageRating}
          </div>
          <div className="text-sm text-muted-foreground">Avg Rating</div>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">
            {isLoading ? '...' : stats.totalLikes}
          </div>
          <div className="text-sm text-muted-foreground">Total Likes</div>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">
            {isLoading ? '...' : stats.totalComments}
          </div>
          <div className="text-sm text-muted-foreground">Comments</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-reviews" data-testid="tab-my-reviews">
            <PenTool className="h-4 w-4 mr-2" />
            My Reviews ({isLoading ? '...' : reviews.length})
          </TabsTrigger>
          <TabsTrigger value="drafts" data-testid="tab-drafts">
            Drafts (0)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-reviews" className="space-y-6 mt-6">
          {isLoading ? (
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
          ) : error ? (
            <div className="text-center py-12">
              <PenTool className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load reviews</h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading your reviews. Please try again.
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((review) => (
                <ReviewCard 
                  key={review.id} 
                  {...transformReviewForCard(review, currentUser)}
                  onEdit={() => handleEditReview(review.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <PenTool className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
              <p className="text-muted-foreground mb-4">
                Start sharing your concert experiences with the community
              </p>
              <Button onClick={handleWriteReview}>
                Write Your First Review
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="mt-6">
          <div className="text-center py-12">
            <PenTool className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No drafts</h3>
            <p className="text-muted-foreground">
              Your review drafts will appear here
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Write Review Dialog */}
      <WriteReviewDialog
        open={writeReviewOpen}
        onOpenChange={(open) => {
          setWriteReviewOpen(open);
          if (!open) setEditingReviewId(null);
        }}
        editingReviewId={editingReviewId}
      />
    </div>
  );
}
