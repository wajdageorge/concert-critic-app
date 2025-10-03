import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, User, ArrowRight, ArrowLeft, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Onboarding schema with separated firstName and lastName fields plus username
const onboardingSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "First name too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name too long"),
  username: z.string()
    .optional()
    .refine((val) => !val || (val.length >= 3 && val.length <= 30), "Username must be between 3 and 30 characters")
    .refine((val) => !val || /^[a-zA-Z0-9_-]+$/.test(val), "Username can only contain letters, numbers, underscores, and hyphens")
    .transform(val => val && val.toLowerCase()),
  bio: z.string().max(500, "Bio too long").optional(),
  location: z.string().max(100, "Location too long").optional(),
  profileImageUrl: z.string().url().optional().or(z.literal("")),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface UsernameCheckResponse {
  available: boolean;
  message: string;
}

export function OnboardingDialog({ open, onOpenChange, user }: OnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: undefined,
      bio: "",
      location: "",
      profileImageUrl: "",
    },
  });

  const watchedUsername = form.watch('username');
  const totalSteps = 4;

  // Username availability checking
  useEffect(() => {
    const checkUsername = async () => {
      if (!watchedUsername || watchedUsername.length < 3) {
        setUsernameStatus('idle');
        setUsernameMessage('');
        return;
      }

      setIsCheckingUsername(true);
      setUsernameStatus('idle');

      try {
        const response = await fetch(`/api/users/check-username/${encodeURIComponent(watchedUsername)}`);
        const data: UsernameCheckResponse = await response.json();
        
        if (data.available) {
          setUsernameStatus('available');
        } else {
          setUsernameStatus('taken');
        }
        setUsernameMessage(data.message);
      } catch (error) {
        setUsernameStatus('invalid');
        setUsernameMessage('Failed to check availability');
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedUsername]);

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      const response = await apiRequest('PUT', '/api/users/me', {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username || null,
        bio: data.bio || null,
        location: data.location || null,
        profileImageUrl: data.profileImageUrl || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to ConcertCritic!",
        description: "Your profile has been set up successfully.",
      });
      
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Setup failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const { url } = await uploadResponse.json();
      form.setValue('profileImageUrl', url);
      
      toast({
        title: "Image uploaded successfully!",
        description: "Your profile photo has been set.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const nextStep = () => setCurrentStep(Math.min(currentStep + 1, totalSteps));
  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 1));

  const onSubmit = (data: OnboardingData) => {
    completeOnboardingMutation.mutate(data);
  };

  const getUsernameStatusIcon = () => {
    if (isCheckingUsername) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    
    switch (usernameStatus) {
      case 'available':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'taken':
      case 'invalid':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getUsernameStatusColor = () => {
    switch (usernameStatus) {
      case 'available':
        return 'text-green-600';
      case 'taken':
      case 'invalid':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const canGoNext = () => {
    if (currentStep === 1) {
      return form.watch('firstName').trim() && form.watch('lastName').trim();
    }
    if (currentStep === 2) {
      const username = form.watch('username');
      // Username is optional, but if provided, it must be available
      return !username || usernameStatus === 'available';
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !completeOnboardingMutation.isPending && onOpenChange(newOpen)}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-onboarding">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Welcome to ConcertCritic! 🎵
          </DialogTitle>
          <DialogDescription className="text-center">
            Let's set up your profile to get started sharing your concert experiences
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center mb-6">
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
                data-testid={`step-indicator-${step}`}
              />
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                  <CardDescription>
                    Tell us your name so others can find and connect with you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your first name" 
                            {...field} 
                            data-testid="input-first-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your last name" 
                            {...field} 
                            data-testid="input-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 2: Username */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Choose Your Username</CardTitle>
                  <CardDescription>
                    Pick a unique username that others can use to find you (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              @
                            </div>
                            <Input 
                              {...field}
                              placeholder="your_username"
                              className="pl-8 pr-10"
                              data-testid="input-username-onboarding"
                              autoComplete="off"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {getUsernameStatusIcon()}
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                        {usernameMessage && (
                          <p className={`text-sm ${getUsernameStatusColor()}`} data-testid="username-availability-message-onboarding">
                            {usernameMessage}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 3: Profile Photo */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profile Photo</CardTitle>
                  <CardDescription>
                    Add a photo to help others recognize you (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="w-32 h-32" data-testid="avatar-onboarding">
                      <AvatarImage src={form.watch('profileImageUrl')} alt="Profile" />
                      <AvatarFallback className="text-2xl">
                        {form.watch('firstName')?.[0]?.toUpperCase() || 'U'}
                        {form.watch('lastName')?.[0]?.toUpperCase() || ''}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="relative">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        data-testid="input-profile-photo"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploading}
                        data-testid="button-upload-photo"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {isUploading ? "Uploading..." : "Add Photo"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: About You */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About You</CardTitle>
                  <CardDescription>
                    Share a bit about yourself and your music interests (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us about your favorite music, concerts you've been to, or what you're looking forward to..."
                            className="resize-none"
                            rows={4}
                            {...field} 
                            data-testid="input-bio"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="City, State or Country" 
                            {...field} 
                            data-testid="input-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || completeOnboardingMutation.isPending}
                data-testid="button-previous"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!canGoNext() || completeOnboardingMutation.isPending}
                  data-testid="button-next"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={completeOnboardingMutation.isPending}
                  data-testid="button-complete-setup"
                >
                  {completeOnboardingMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}