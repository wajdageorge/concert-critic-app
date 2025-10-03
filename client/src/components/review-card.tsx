import { Star, Heart, MessageCircle, Calendar, MapPin, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { CommentDialog } from "./comment-dialog";

interface ReviewCardProps {
  id: string;
  userId: string; // Add userId to check ownership
  user: {
    name: string;
    username: string;
    avatar?: string;
  };
  concert: {
    artist: string;
    venue: string;
    date: string;
    city: string;
  };
  rating: {
    overall: number;
    performance: number;
    sound: number;
    venue: number;
    value: number;
  };
  reviewText: string;
  photos?: string[];
  likes: number;
  comments: number;
  isLiked?: boolean;
  postedAt: string;
  onEdit?: () => void; // Callback for edit action
}

export default function ReviewCard({
  id,
  userId,
  user,
  concert,
  rating,
  reviewText,
  photos = [],
  likes: initialLikes,
  comments: initialComments,
  isLiked: initialIsLiked = false,
  postedAt,
  onEdit,
}: ReviewCardProps) {
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user owns this review
  const isOwner = currentUser?.id === userId;

  // Fetch current like status and count from API
  const { data: likesData } = useQuery({
    queryKey: ['/api/reviews', id, 'likes'],
    initialData: { count: initialLikes, isLiked: initialIsLiked },
  });

  // Fetch comment count from API
  const { data: commentsData } = useQuery({
    queryKey: ['/api/reviews', id, 'comments'],
    initialData: [],
    select: (data: any[]) => data.length, // Return just the count
  });

  // Like/Unlike mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (likesData?.isLiked) {
        // Unlike
        return apiRequest('DELETE', `/api/reviews/${id}/like`);
      } else {
        // Like
        return apiRequest('POST', `/api/reviews/${id}/like`);
      }
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/reviews', id, 'likes'] });
      
      // Snapshot previous value
      const previousLikes = queryClient.getQueryData(['/api/reviews', id, 'likes']);
      
      // Optimistically update to new value
      queryClient.setQueryData(['/api/reviews', id, 'likes'], (old: any) => ({
        count: (old?.count || 0) + (old?.isLiked ? -1 : 1),
        isLiked: !old?.isLiked,
      }));
      
      return { previousLikes };
    },
    onError: (err: any, variables, context) => {
      // If mutation fails, use context to roll back
      queryClient.setQueryData(['/api/reviews', id, 'likes'], context?.previousLikes);
      
      // Handle 401 errors specifically
      if (err.status === 401) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to like reviews.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update like. Please try again.",
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['/api/reviews', id, 'likes'] });
    },
  });

  const handleLike = () => {
    likeMutation.mutate();
  };

  const handleComment = () => {
    setCommentDialogOpen(true);
  };

  const handleUserClick = () => {
    console.log(`Viewing profile: ${user.username}`);
  };

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/reviews/${id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Review deleted",
        description: "Your review has been successfully deleted.",
      });
      
      // Invalidate all review queries
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      if (currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser.id, 'reviews'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser.id, 'stats'] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete review",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteReviewMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
        }`}
      />
    ));
  };

  return (
    <>
    <Card className="hover-elevate" data-testid={`card-review-${id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar 
              className="cursor-pointer" 
              onClick={handleUserClick}
              data-testid={`avatar-user-${user.username}`}
            >
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name?.charAt(0) || user.username?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <h4 
                className="font-semibold cursor-pointer hover:text-primary transition-colors"
                onClick={handleUserClick}
                data-testid={`text-username-${user.username}`}
              >
                {user.name}
              </h4>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-0.5 mb-1 justify-end">
                {renderStars(rating.overall)}
                <span className="text-sm font-medium ml-1.5 flex-shrink-0">{rating.overall.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">{postedAt}</p>
            </div>
            {/* Edit/Delete menu for review owner */}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    data-testid={`button-review-menu-${id}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem 
                      onClick={onEdit}
                      data-testid={`button-edit-review-${id}`}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Review
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive"
                    data-testid={`button-delete-review-${id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Review
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Concert Info */}
        <div className="bg-muted/50 rounded-lg p-3">
          <h5 className="font-semibold text-sm" data-testid={`text-concert-artist-${id}`}>
            {concert.artist}
          </h5>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{concert.venue}, {concert.city}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{concert.date}</span>
            </div>
          </div>
        </div>

        {/* Detailed Ratings - Compact badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1.5 py-1 px-3">
            <span className="text-xs text-muted-foreground">Performance</span>
            <div className="flex items-center gap-0.5">
              {renderStars(rating.performance)}
            </div>
          </Badge>
          <Badge variant="secondary" className="gap-1.5 py-1 px-3">
            <span className="text-xs text-muted-foreground">Sound</span>
            <div className="flex items-center gap-0.5">
              {renderStars(rating.sound)}
            </div>
          </Badge>
          <Badge variant="secondary" className="gap-1.5 py-1 px-3">
            <span className="text-xs text-muted-foreground">Venue</span>
            <div className="flex items-center gap-0.5">
              {renderStars(rating.venue)}
            </div>
          </Badge>
          <Badge variant="secondary" className="gap-1.5 py-1 px-3">
            <span className="text-xs text-muted-foreground">Value</span>
            <div className="flex items-center gap-0.5">
              {renderStars(rating.value)}
            </div>
          </Badge>
        </div>

        {/* Review Text */}
        <div className="text-sm leading-relaxed" data-testid={`text-review-content-${id}`}>
          {reviewText}
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {photos.map((photo, index) => (
              <div 
                key={index} 
                className="flex-shrink-0 w-20 h-20 bg-muted rounded-md overflow-hidden cursor-pointer hover-elevate"
                onClick={() => console.log(`Viewing photo ${index + 1}`)}
              >
                <img 
                  src={photo} 
                  alt={`Review photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={likeMutation.isPending}
            className={likesData?.isLiked ? 'text-red-500' : ''}
            data-testid={`button-like-${id}`}
          >
            <Heart className={`h-4 w-4 mr-1 ${likesData?.isLiked ? 'fill-current' : ''}`} />
            {likesData?.count || 0}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleComment}
            data-testid={`button-comment-${id}`}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {commentsData || 0}
          </Button>
        </div>
      </CardContent>
    </Card>
    
    <CommentDialog
      isOpen={commentDialogOpen}
      onClose={() => setCommentDialogOpen(false)}
      reviewId={id}
      reviewTitle={`Review by ${user.name}`}
    />
    
    {/* Delete confirmation dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent data-testid="dialog-delete-review-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Review</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this review? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            className="bg-destructive hover:bg-destructive/90"
            disabled={deleteReviewMutation.isPending}
            data-testid="button-confirm-delete"
          >
            {deleteReviewMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
