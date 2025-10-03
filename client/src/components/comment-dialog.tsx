import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { ReviewCommentWithUser } from "@shared/schema";

interface CommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reviewId: string;
  reviewTitle: string; // e.g. "Review by John Doe"
}

export function CommentDialog({ isOpen, onClose, reviewId, reviewTitle }: CommentDialogProps) {
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Fetch comments for this review
  const { data: comments = [], isLoading: commentsLoading } = useQuery<ReviewCommentWithUser[]>({
    queryKey: ['/api/reviews', reviewId, 'comments'],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/${reviewId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: isOpen,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      const response = await apiRequest('POST', `/api/reviews/${reviewId}/comments`, { commentText });
      if (!response.ok) throw new Error('Failed to post comment');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate comments query to refetch
      queryClient.invalidateQueries({
        queryKey: ['/api/reviews', reviewId, 'comments'],
      });
      // Clear the input
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error creating comment:', error);
      
      // Handle 401 errors specifically
      if (error.status === 401) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to post comments.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to post comment. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      apiRequest('DELETE', `/api/comments/${commentId}`),
    onSuccess: () => {
      // Invalidate comments query to refetch
      queryClient.invalidateQueries({
        queryKey: ['/api/reviews', reviewId, 'comments'],
      });
      toast({
        title: "Comment deleted",
        description: "Your comment has been removed.",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting comment:', error);
      
      // Handle 401 errors specifically  
      if (error.status === 401) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to delete comments.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete comment. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createCommentMutation.mutate(newComment.trim());
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" data-testid="dialog-comments">
        <DialogHeader>
          <DialogTitle>Comments on {reviewTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Comments List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {commentsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="h-8 w-8 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-16 bg-muted rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No comments yet. Be the first to share your thoughts!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className="flex gap-3 p-3 rounded-lg bg-muted/50"
                  data-testid={`comment-${comment.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {(comment.user.firstName || comment.user.username || 'U').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium">
                        {comment.user.firstName && comment.user.lastName 
                          ? `${comment.user.firstName} ${comment.user.lastName}`
                          : comment.user.username || 'Anonymous'}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Unknown date'}
                        </span>
                        {/* Only show delete button for own comments */}
                        {currentUser && comment.user.id === currentUser.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deleteCommentMutation.isPending}
                            data-testid={`button-delete-comment-${comment.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed break-words" data-testid={`text-comment-content-${comment.id}`}>
                      {comment.commentText}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t space-y-3">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="resize-none"
              rows={3}
              maxLength={500}
              data-testid="textarea-new-comment"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {newComment.length}/500 characters
              </span>
              <Button
                type="submit"
                disabled={!newComment.trim() || createCommentMutation.isPending}
                size="sm"
                data-testid="button-submit-comment"
              >
                {createCommentMutation.isPending ? (
                  "Posting..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Post Comment
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}