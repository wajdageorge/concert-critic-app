import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Check, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Username change schema
const usernameSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be no more than 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .transform(val => val.toLowerCase()), // Convert to lowercase for consistency
});

type UsernameData = z.infer<typeof usernameSchema>;

interface ChangeUsernameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    username?: string;
  };
}

interface UsernameCheckResponse {
  available: boolean;
  message: string;
}

export function ChangeUsernameDialog({ open, onOpenChange, user }: ChangeUsernameDialogProps) {
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UsernameData>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: user.username || "",
    },
  });

  const watchedUsername = form.watch('username');

  // Debounced availability check
  useEffect(() => {
    const checkAvailability = async () => {
      if (!watchedUsername || watchedUsername.length < 3) {
        setAvailabilityStatus('idle');
        setAvailabilityMessage('');
        return;
      }

      // Don't check if it's the current username
      if (watchedUsername === user.username) {
        setAvailabilityStatus('idle');
        setAvailabilityMessage('');
        return;
      }

      setIsCheckingAvailability(true);
      setAvailabilityStatus('idle');

      try {
        const response = await fetch(`/api/users/check-username/${encodeURIComponent(watchedUsername)}`);
        const data: UsernameCheckResponse = await response.json();
        
        if (data.available) {
          setAvailabilityStatus('available');
        } else {
          setAvailabilityStatus('taken');
        }
        setAvailabilityMessage(data.message);
      } catch (error) {
        setAvailabilityStatus('invalid');
        setAvailabilityMessage('Failed to check availability');
      } finally {
        setIsCheckingAvailability(false);
      }
    };

    const timeoutId = setTimeout(checkAvailability, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [watchedUsername, user.username]);

  const updateUsernameMutation = useMutation({
    mutationFn: async (data: UsernameData) => {
      const response = await apiRequest('PUT', '/api/users/me', {
        username: data.username,
      });
      return { username: data.username, response: await response.json() };
    },
    onSuccess: (result) => {
      const newUsername = result.username;
      
      toast({
        title: "Username updated successfully!",
        description: "Your username has been changed.",
      });
      
      // Directly update user data in cache to ensure immediate UI update
      queryClient.setQueryData(['/api/user'], (oldData: any) => {
        if (oldData) {
          return { ...oldData, username: newUsername };
        }
        return oldData;
      });
      
      // Update user stats query specifically
      const userStatsQueryKey = ['/api/users', user.id, 'stats'];
      queryClient.setQueryData(userStatsQueryKey, (oldData: any) => {
        if (oldData) {
          return { ...oldData, username: newUsername };
        }
        return oldData;
      });
      
      // Update all other user queries as well
      queryClient.setQueriesData({ queryKey: ['/api/users'] }, (oldData: any) => {
        if (oldData && oldData.id === user.id) {
          return { ...oldData, username: newUsername };
        }
        return oldData;
      });
      
      // Also invalidate to trigger refetch for any other queries we might have missed
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update username",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UsernameData) => {
    if (availabilityStatus !== 'available' && data.username !== user.username) {
      return;
    }
    updateUsernameMutation.mutate(data);
  };

  const canSubmit = () => {
    const username = form.watch('username');
    if (!username || username === user.username) return false;
    return availabilityStatus === 'available' && !form.formState.errors.username;
  };

  const getStatusIcon = () => {
    if (isCheckingAvailability) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    
    switch (availabilityStatus) {
      case 'available':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'taken':
      case 'invalid':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (availabilityStatus) {
      case 'available':
        return 'text-green-600';
      case 'taken':
      case 'invalid':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !updateUsernameMutation.isPending && onOpenChange(newOpen)}>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-change-username">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Change Username
          </DialogTitle>
          <DialogDescription>
            Choose a unique username that others can use to find and mention you. 
            Usernames must be 3-30 characters and can only contain letters, numbers, underscores, and hyphens.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        {getStatusIcon()}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                  {availabilityMessage && (
                    <p className={`text-sm ${getStatusColor()}`} data-testid="username-availability-message">
                      {availabilityMessage}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {user.username && (
              <div className="bg-muted p-3 rounded-lg" data-testid="current-username-info">
                <p className="text-sm text-muted-foreground">
                  Current username: <span className="font-medium">@{user.username}</span>
                </p>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateUsernameMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit() || updateUsernameMutation.isPending}
                data-testid="button-save-username"
              >
                {updateUsernameMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Username'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}