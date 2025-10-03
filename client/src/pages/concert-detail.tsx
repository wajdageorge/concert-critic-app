import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Calendar, MapPin, Music, Heart, Star, Clock } from "lucide-react";
import { WriteReviewDialog } from "@/components/write-review-dialog";
import { useState } from "react";
import type { Concert, ReviewWithUser } from "@shared/schema";

export default function ConcertDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Fetch concert details - first try database, then fall back to Ticketmaster
  const { data: concert, isLoading: concertLoading } = useQuery<Concert>({
    queryKey: ["/api/concerts", id],
    queryFn: async () => {
      // Try fetching from database first
      const dbResponse = await fetch(`/api/concerts/${id}`);
      if (dbResponse.ok) {
        return dbResponse.json();
      }
      
      // If not in database and ID looks like Ticketmaster ID (starts with tm_), fetch from Ticketmaster
      if (id?.startsWith("tm_")) {
        const tmResponse = await fetch(`/api/ticketmaster/events/${id}`);
        if (tmResponse.ok) {
          return tmResponse.json();
        }
      }
      
      throw new Error("Concert not found");
    },
    enabled: !!id,
  });

  // Fetch reviews for this concert
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<ReviewWithUser[]>({
    queryKey: ["/api/concerts", id, "reviews"],
    enabled: !!id,
  });

  // Check if concert is wishlisted
  const { data: wishlist = [] } = useQuery<any[]>({
    queryKey: ["/api/wishlist"],
  });

  const isWishlisted = wishlist.some((item: any) => item.concertId === id);

  // Wishlist mutations
  const addToWishlistMutation = useMutation({
    mutationFn: (concertId: string) =>
      apiRequest("POST", "/api/wishlist", { concertId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: "Added to wishlist",
        description: "Concert saved to your wishlist",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to wishlist",
        variant: "destructive",
      });
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: (concertId: string) =>
      apiRequest("DELETE", `/api/wishlist/${concertId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: "Removed from wishlist",
        description: "Concert removed from your wishlist",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from wishlist",
        variant: "destructive",
      });
    },
  });

  const handleWishlistToggle = () => {
    if (!id) return;
    if (isWishlisted) {
      removeFromWishlistMutation.mutate(id);
    } else {
      addToWishlistMutation.mutate(id);
    }
  };

  const handleReviewDialogChange = (open: boolean) => {
    setIsReviewDialogOpen(open);
    if (!open) {
      // Refresh reviews when dialog closes (review may have been posted)
      queryClient.invalidateQueries({ queryKey: ["/api/concerts", id, "reviews"] });
    }
  };

  if (concertLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!concert) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Music className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Concert not found</h2>
        <p className="text-muted-foreground mb-4">
          We couldn't find the concert you're looking for
        </p>
        <Button onClick={() => navigate("/discover")} data-testid="button-back-discover">
          Back to Discover
        </Button>
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
    : 0;

  return (
    <div className="space-y-6" data-testid="page-concert-detail">
      {/* Concert Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-concert-artist">
              {concert.artist}
            </h1>
            {concert.genre && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" data-testid={`badge-genre-${concert.genre}`}>
                  {concert.genre}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={isWishlisted ? "default" : "outline"}
              onClick={handleWishlistToggle}
              disabled={addToWishlistMutation.isPending || removeFromWishlistMutation.isPending}
              data-testid="button-wishlist-toggle"
            >
              <Heart className={`h-4 w-4 mr-2 ${isWishlisted ? "fill-current" : ""}`} />
              {isWishlisted ? "Wishlisted" : "Add to Wishlist"}
            </Button>
            <Button onClick={() => setIsReviewDialogOpen(true)} data-testid="button-write-review">
              <Star className="h-4 w-4 mr-2" />
              Write Review
            </Button>
          </div>
        </div>
      </div>

      {/* Concert Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium" data-testid="text-concert-venue">
                  {concert.venue}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-concert-location">
                  {concert.city}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium" data-testid="text-concert-date">
                  {new Date(concert.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                {concert.time && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {concert.time}
                  </p>
                )}
              </div>
            </div>
          </div>
          {concert.ticketUrl && (
            <div className="pt-4 border-t">
              <Button
                asChild
                variant="default"
                className="w-full md:w-auto"
                data-testid="button-buy-tickets"
              >
                <a href={concert.ticketUrl} target="_blank" rel="noopener noreferrer">
                  Buy Tickets
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold" data-testid="heading-reviews">
              Reviews
            </h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1 font-medium" data-testid="text-average-rating">
                    {averageRating.toFixed(1)}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground" data-testid="text-review-count">
                  ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}
          </div>
        </div>

        {reviewsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No reviews yet</p>
              <p className="text-muted-foreground text-center mb-4">
                Be the first to review this concert!
              </p>
              <Button onClick={() => setIsReviewDialogOpen(true)} data-testid="button-write-first-review">
                Write the first review
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} data-testid={`card-review-${review.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold cursor-pointer hover-elevate"
                        onClick={() => navigate(`/profile/${review.user.username}`)}
                        data-testid={`avatar-${review.user.username}`}
                      >
                        {review.user.username?.substring(0, 2).toUpperCase() || "U"}
                      </div>
                      <div>
                        <p
                          className="font-semibold cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/profile/${review.user.username}`)}
                          data-testid={`text-reviewer-${review.user.username}`}
                        >
                          {review.user.firstName} {review.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{review.user.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold" data-testid={`text-rating-${review.id}`}>
                        {review.overallRating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground mb-4" data-testid={`text-review-content-${review.id}`}>
                    {review.reviewText}
                  </p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span data-testid={`text-likes-${review.id}`}>
                      {review.likesCount || 0} {review.likesCount === 1 ? "like" : "likes"}
                    </span>
                    <span data-testid={`text-comments-${review.id}`}>
                      {review.commentsCount || 0} {review.commentsCount === 1 ? "comment" : "comments"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Write Review Dialog */}
      <WriteReviewDialog
        open={isReviewDialogOpen}
        onOpenChange={handleReviewDialogChange}
      />
    </div>
  );
}
