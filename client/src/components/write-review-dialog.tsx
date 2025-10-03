import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Star, X, Music, MapPin, Calendar, Clock, History, Upload, Image as ImageIcon, Video, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { insertReviewSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import type { Concert, ConcertWithRating } from "@shared/schema";

// Extended form schema that includes concert search
const writeReviewSchema = insertReviewSchema.omit({
  userId: true,
}).extend({
  concertSearch: z.string().optional(),
});

type WriteReviewFormData = z.infer<typeof writeReviewSchema>;

interface WriteReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingReviewId?: string | null; // Optional review ID for edit mode
}

export function WriteReviewDialog({ open, onOpenChange, editingReviewId }: WriteReviewDialogProps) {
  const [concertSearchQuery, setConcertSearchQuery] = useState("");
  const [selectedConcert, setSelectedConcert] = useState<ConcertWithRating | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editModeConcertId, setEditModeConcertId] = useState<string | null>(null); // Store concertId for edit mode
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const isEditMode = !!editingReviewId;

  // Fetch existing review data when in edit mode
  const { data: existingReview, isLoading: isLoadingReview } = useQuery({
    queryKey: ['/api/reviews', editingReviewId],
    queryFn: async () => {
      if (!editingReviewId) return null;
      const response = await fetch(`/api/reviews/${editingReviewId}`);
      if (!response.ok) throw new Error('Failed to fetch review');
      return response.json();
    },
    enabled: isEditMode && open,
  });

  // Helper function to determine concert type - only historical concerts for reviews
  const getConcertType = (concert: ConcertWithRating) => {
    // All concerts in review creation are historical since we only use Setlist.fm
    return { type: 'historical', label: 'Historical', icon: History, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' };
  };

  // Search historical concerts from Setlist.fm only
  const { data: searchResults = [], isLoading: isSearching } = useQuery<ConcertWithRating[]>({
    queryKey: ['/api/setlistfm/events', { search: concertSearchQuery }],
    queryFn: async () => {
      if (!concertSearchQuery.trim()) return [];
      const response = await fetch(`/api/setlistfm/events?artistName=${encodeURIComponent(concertSearchQuery)}&limit=10`);
      if (!response.ok) throw new Error('Failed to search historical concerts');
      return response.json();
    },
    enabled: concertSearchQuery.length > 2,
  });

  const form = useForm<WriteReviewFormData>({
    resolver: zodResolver(writeReviewSchema),
    defaultValues: {
      concertId: "",
      overallRating: 5,
      performanceRating: 5,
      soundRating: 5,
      venueRating: 5,
      valueRating: 5,
      reviewText: "",
      photos: [],
      concertSearch: "",
    },
  });

  // Pre-populate form when editing an existing review - consolidated single effect
  useEffect(() => {
    if (isEditMode && existingReview && open && !isLoadingReview) {
      // Store concertId in state for fallback
      setEditModeConcertId(existingReview.concertId);
      
      // Use form.reset() to populate all fields at once
      form.reset({
        concertId: existingReview.concertId,
        overallRating: existingReview.overallRating,
        performanceRating: existingReview.performanceRating,
        soundRating: existingReview.soundRating,
        venueRating: existingReview.venueRating,
        valueRating: existingReview.valueRating,
        reviewText: existingReview.reviewText,
        photos: existingReview.photos ?? [],
        concertSearch: '',
      });
      
      // Set concert info for display
      if (existingReview.concert) {
        setSelectedConcert(existingReview.concert);
      }
      
      // Set uploaded files for display
      setUploadedFiles(existingReview.photos ?? []);
    } else if (!open) {
      // Reset when dialog closes
      form.reset({
        concertId: "",
        overallRating: 5,
        performanceRating: 5,
        soundRating: 5,
        venueRating: 5,
        valueRating: 5,
        reviewText: "",
        photos: [],
        concertSearch: "",
      });
      setSelectedConcert(null);
      setUploadedFiles([]);
      setConcertSearchQuery("");
      setEditModeConcertId(null);
    }
  }, [isEditMode, existingReview, open, isLoadingReview]);

  const saveReviewMutation = useMutation({
    mutationFn: async (data: Omit<WriteReviewFormData, 'concertSearch'> & { concert?: any }) => {
      if (isEditMode && editingReviewId) {
        // Update existing review
        const response = await apiRequest('PUT', `/api/reviews/${editingReviewId}`, data);
        return response.json();
      } else {
        // Create new review
        const response = await apiRequest('POST', '/api/reviews', data);
        return response.json();
      }
    },
    onSuccess: (data, variables) => {
      toast({
        title: isEditMode ? "Review updated successfully!" : "Review created successfully!",
        description: isEditMode ? "Your review has been updated." : "Your concert review has been published.",
      });
      
      // Invalidate and refetch all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      
      // Invalidate user-specific queries if we have a user ID
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/users', user.id, 'reviews'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users', user.id, 'stats'] });
      }
      
      // Invalidate all user queries to refresh stats
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      // Reset form state
      form.reset();
      setSelectedConcert(null);
      setConcertSearchQuery("");
      setUploadedFiles([]);
      
      // Close dialog and scroll to top on next frame to prevent UI overlap
      requestAnimationFrame(() => {
        onOpenChange(false);
      });
    },
    onError: (error: any) => {
      toast({
        title: isEditMode ? "Failed to update review" : "Failed to create review",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload files');

      const data = await response.json();
      const newPaths = data.paths || [];
      const updatedFiles = [...uploadedFiles, ...newPaths];
      setUploadedFiles(updatedFiles);
      form.setValue('photos', updatedFiles);

      toast({
        title: "Files uploaded successfully!",
        description: `${newPaths.length} file(s) added to your review.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const removeUploadedFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    form.setValue('photos', updatedFiles);
  };

  const onSubmit = (data: WriteReviewFormData) => {
    console.log('[WriteReviewDialog] onSubmit called', {
      isEditMode,
      data,
      concertId: data.concertId,
      hasSelectedConcert: !!selectedConcert
    });
    
    if (!isEditMode && !selectedConcert) {
      toast({
        title: "Please select a concert",
        description: "You must select a concert to review.",
        variant: "destructive",
      });
      return;
    }

    const { concertSearch, ...reviewData } = data;
    
    // In edit mode, ensure concertId is set from stored state if it's missing from form
    if (isEditMode && editModeConcertId && !reviewData.concertId) {
      reviewData.concertId = editModeConcertId;
      console.log('[WriteReviewDialog] Restored missing concertId from state:', editModeConcertId);
    }
    
    console.log('[WriteReviewDialog] Submitting data:', {
      isEditMode,
      reviewData,
      concertId: reviewData.concertId
    });
    
    // In edit mode, only send the review data (concertId is already in reviewData)
    // In create mode, also send the concert object for upsert
    saveReviewMutation.mutate(
      isEditMode 
        ? reviewData  // Edit: just send review data, concertId already included
        : { ...reviewData, concertId: selectedConcert!.id, concert: selectedConcert } // Create: send concert for upsert
    );
  };

  const renderStarRating = (value: number, onChange: (value: number) => void, label: string) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-sm text-muted-foreground">{value}/5</span>
        </div>
        <div className="flex items-center space-x-1">
          {Array.from({ length: 5 }, (_, i) => {
            const starValue = i + 1;
            return (
              <button
                key={i}
                type="button"
                className="p-1 hover:scale-110 transition-transform"
                onClick={() => onChange(starValue)}
                data-testid={`star-${label.toLowerCase().replace(/\s+/g, '-')}-${starValue}`}
              >
                <Star
                  className={`h-6 w-6 ${
                    starValue <= value 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-muted-foreground hover:text-yellow-400'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const selectConcert = (concert: ConcertWithRating) => {
    setSelectedConcert(concert);
    form.setValue('concertId', concert.id);
    setConcertSearchQuery("");
  };

  const clearSelectedConcert = () => {
    setSelectedConcert(null);
    form.setValue('concertId', "");
  };

  // Pre-populate form with existing review data in edit mode
  useEffect(() => {
    if (isEditMode && existingReview && open) {
      form.reset({
        concertId: existingReview.concertId,
        overallRating: existingReview.overallRating,
        performanceRating: existingReview.performanceRating,
        soundRating: existingReview.soundRating,
        venueRating: existingReview.venueRating,
        valueRating: existingReview.valueRating,
        reviewText: existingReview.reviewText,
        photos: existingReview.photos || [],
      });
      setUploadedFiles(existingReview.photos || []);
      
      // Set concert info for display
      if (existingReview.concert) {
        setSelectedConcert(existingReview.concert);
      }
    } else if (!open) {
      // Reset form when dialog closes
      form.reset();
      setSelectedConcert(null);
      setConcertSearchQuery("");
      setUploadedFiles([]);
    }
  }, [existingReview, isEditMode, open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-write-review">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            {isEditMode ? "Edit Concert Review" : "Write Concert Review"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Update your concert review and share your revised thoughts with the community."
              : "Share your concert experience with the community. Rate different aspects and tell us about your experience."}
          </DialogDescription>
        </DialogHeader>

        {/* Show loading state while fetching review in edit mode */}
        {isEditMode && isLoadingReview ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading review...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Concert Selection */}
            <div className="space-y-4">
              <FormLabel>Concert Selection</FormLabel>
              
              {selectedConcert ? (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{selectedConcert.artist}</h4>
                          <div className="flex items-center text-sm text-muted-foreground space-x-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {selectedConcert.venue}, {selectedConcert.city}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(selectedConcert.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedConcert.genre && (
                              <Badge variant="secondary" className="text-xs">
                                {selectedConcert.genre}
                              </Badge>
                            )}
                            {(() => {
                              const concertType = getConcertType(selectedConcert);
                              const IconComponent = concertType.icon;
                              return (
                                <Badge className={`text-xs ${concertType.color} border-none`}>
                                  <IconComponent className="h-3 w-3 mr-1" />
                                  {concertType.label}
                                </Badge>
                              );
                            })()}
                          </div>
                        </div>
                        {!isEditMode && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearSelectedConcert}
                            data-testid="button-clear-concert"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by artist name"
                      value={concertSearchQuery}
                      onChange={(e) => setConcertSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-concert-search"
                    />
                  </div>
                  
                  {isSearching && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                  
                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.map((concert) => (
                        <Card 
                          key={concert.id} 
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => selectConcert(concert)}
                          data-testid={`concert-option-${concert.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="space-y-1">
                              <h5 className="font-medium">{concert.artist}</h5>
                              <div className="flex items-center text-sm text-muted-foreground space-x-3">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {concert.venue}, {concert.city}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(concert.date).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {concert.genre && (
                                  <Badge variant="secondary" className="text-xs">
                                    {concert.genre}
                                  </Badge>
                                )}
                                {(() => {
                                  const concertType = getConcertType(concert);
                                  const IconComponent = concertType.icon;
                                  return (
                                    <Badge className={`text-xs ${concertType.color} border-none`}>
                                      <IconComponent className="h-3 w-3 mr-1" />
                                      {concertType.label}
                                    </Badge>
                                  );
                                })()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  {concertSearchQuery.length > 2 && !isSearching && searchResults.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No concerts found. Try a different search term.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rating Section */}
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Rate Your Experience</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="overallRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div>
                            {renderStarRating(field.value, field.onChange, "Overall Rating")}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="performanceRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div>
                            {renderStarRating(field.value, field.onChange, "Performance")}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="soundRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div>
                            {renderStarRating(field.value, field.onChange, "Sound Quality")}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="venueRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div>
                            {renderStarRating(field.value, field.onChange, "Venue")}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valueRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div>
                            {renderStarRating(field.value, field.onChange, "Value for Money")}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Review Text */}
            <FormField
              control={form.control}
              name="reviewText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your concert experience... What stood out? How was the atmosphere? Would you recommend it?"
                      className="min-h-32 resize-none"
                      data-testid="textarea-review-text"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Share your honest thoughts and experiences</span>
                    <span>{field.value.length}/2000</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo/Video Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Photos & Videos</FormLabel>
                <span className="text-xs text-muted-foreground">{uploadedFiles.length}/5</span>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {uploadedFiles.map((path, index) => (
                  <div key={index} className="relative group">
                    <div className="w-24 h-24 rounded-md border border-border overflow-hidden bg-muted flex items-center justify-center">
                      {path.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      ) : (
                        <Video className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeUploadedFile(index)}
                      data-testid={`button-remove-file-${index}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                
                {uploadedFiles.length < 5 && (
                  <label className="w-24 h-24 rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-primary hover:bg-accent/50 transition-colors flex flex-col items-center justify-center cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading || uploadedFiles.length >= 5}
                      data-testid="input-file-upload"
                    />
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs text-muted-foreground mt-1">Add</span>
                      </>
                    )}
                  </label>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                Upload up to 5 photos or videos (max 10MB each). Images and videos help others experience what you saw!
              </p>
            </div>

            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-review"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveReviewMutation.isPending || (!isEditMode && !selectedConcert)}
                data-testid="button-submit-review"
              >
                {saveReviewMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? "Update Review" : "Publish Review"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}