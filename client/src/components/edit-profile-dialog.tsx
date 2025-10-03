import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, Upload, User, Trash2, Check, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Profile update schema - subset of insertUserSchema for profile editing
const profileUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  username: z.string()
    .optional()
    .refine((val) => !val || (val.length >= 3 && val.length <= 30), "Username must be between 3 and 30 characters")
    .refine((val) => !val || /^[a-zA-Z0-9_-]+$/.test(val), "Username can only contain letters, numbers, underscores, and hyphens")
    .transform(val => val && val.toLowerCase()),
  bio: z.string().max(500, "Bio too long").optional(),
  location: z.string().max(100, "Location too long").optional(),
  profileImageUrl: z.string().optional().or(z.literal("")), // Accept any string (including relative paths from object storage)
});

type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    username?: string;
    bio?: string;
    avatar?: string;
    location?: string;
  };
}

interface UsernameCheckResponse {
  available: boolean;
  message: string;
}

export function EditProfileDialog({ open, onOpenChange, user }: EditProfileDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileUpdateData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: user.name || "",
      username: user.username || undefined,
      bio: user.bio || "",
      location: user.location || "",
      profileImageUrl: user.avatar || "",
    },
  });

  const watchedUsername = form.watch('username');

  // Username availability checking
  useEffect(() => {
    const checkUsername = async () => {
      if (!watchedUsername || watchedUsername.length < 3) {
        setUsernameStatus('idle');
        setUsernameMessage('');
        return;
      }

      // Don't check if it's the current username
      if (watchedUsername === user.username) {
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
  }, [watchedUsername, user.username]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      // Split full name into firstName and lastName for backend
      const nameParts = data.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      const response = await apiRequest('PUT', '/api/users/me', {
        firstName,
        lastName,
        username: data.username || null,
        bio: data.bio || null,
        location: data.location || null,
        profileImageUrl: data.profileImageUrl || null,
      });
      return { updatedData: data, response: await response.json() };
    },
    onSuccess: (result) => {
      const updatedData = result.updatedData;
      
      toast({
        title: "Profile updated successfully!",
        description: "Your profile changes have been saved.",
      });
      
      // Update cache directly for immediate UI update
      queryClient.setQueryData(['/api/user'], (oldData: any) => {
        if (oldData) {
          return { 
            ...oldData, 
            username: updatedData.username,
            profileImageUrl: updatedData.profileImageUrl 
          };
        }
        return oldData;
      });
      
      // Update user stats query specifically
      const userStatsQueryKey = ['/api/users', user.id, 'stats'];
      queryClient.setQueryData(userStatsQueryKey, (oldData: any) => {
        if (oldData) {
          return { 
            ...oldData, 
            username: updatedData.username,
            profileImageUrl: updatedData.profileImageUrl 
          };
        }
        return oldData;
      });
      
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update profile",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/users/me');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account deleted successfully",
        description: "Your account and all data have been permanently deleted.",
      });
      
      // Clear all cached data
      queryClient.clear();
      
      // Redirect to logout
      setTimeout(() => {
        window.location.href = "/api/logout";
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete account",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
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
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload to object storage (assuming there's an upload endpoint)
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
        description: "Your profile image has been updated.",
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

  const onSubmit = (data: ProfileUpdateData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-profile">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your profile information and photo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Photo Upload */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24" data-testid="avatar-profile-edit">
                <AvatarImage src={form.watch('profileImageUrl') || user.avatar} alt={user.name} />
                <AvatarFallback className="text-xl">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isUploading}
                  data-testid="input-profile-image"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  className="pointer-events-none"
                  data-testid="button-upload-image"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? "Uploading..." : "Change Photo"}
                </Button>
              </div>
            </div>

            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your display name"
                      data-testid="input-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Username Field */}
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
                        data-testid="input-username"
                        autoComplete="off"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {getUsernameStatusIcon()}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                  {usernameMessage && (
                    <p className={`text-sm ${getUsernameStatusColor()}`} data-testid="username-availability-message">
                      {usernameMessage}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Bio Field */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself..."
                      className="resize-none"
                      rows={3}
                      data-testid="input-bio"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Field */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City, Country"
                      data-testid="input-location"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Danger Zone */}
            <div className="pt-6">
              <Separator className="mb-4" />
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and all associated data.
                  </p>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      data-testid="button-delete-account"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent data-testid="dialog-confirm-delete">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Account Permanently?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>This action cannot be undone. This will permanently delete your account and remove all of your data from our servers, including:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Your profile and personal information</li>
                          <li>All your concert reviews and ratings</li>
                          <li>Your concert history and wishlist</li>
                          <li>All follows and social connections</li>
                        </ul>
                        <p className="font-medium">Are you absolutely sure you want to delete your account?</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deleteAccountMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-delete"
                      >
                        {deleteAccountMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending || isUploading || (!!watchedUsername && watchedUsername.length >= 3 && watchedUsername !== user.username && usernameStatus === 'taken')}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}