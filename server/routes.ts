import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertConcertSchema, insertReviewSchema, insertUserSchema, insertReviewCommentSchema, concerts } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

// Authentication middleware is now imported from replitAuth

// Helper function for consistent user ID extraction
function getUserId(req: any): string {
  return req.user?.claims?.sub; // Replit Auth style
}

// Configure multer for handling file uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for photos and videos
  },
  fileFilter: (req, file, cb) => {
    // Accept image and video files
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth setup with Replit Auth integration
  await setupAuth(app);

  // Add auth/user route for Replit Auth
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Frontend expects /api/user route (for useAuth hook)
  app.get('/api/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Note: /api/register, /api/login, /api/logout routes are handled in setupAuth

  // File upload route for review media (photos/videos)
  app.post("/api/upload", isAuthenticated, upload.array('files', 5), async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadedPaths: string[] = [];

      for (const file of files) {
        try {
          const path = await objectStorageService.uploadFile(
            file.buffer,
            file.mimetype,
            file.originalname
          );
          uploadedPaths.push(path);
        } catch (error) {
          console.error(`Error uploading file ${file.originalname}:`, error);
        }
      }

      if (uploadedPaths.length === 0) {
        return res.status(500).json({ error: "Failed to upload files" });
      }

      res.json({ paths: uploadedPaths });
    } catch (error) {
      console.error("Error in upload route:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  });

  // Profile image upload route (single file)
  app.post("/api/upload/profile-image", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const file = req.file as Express.Multer.File;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Validate file type (images only)
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }

      const objectStorageService = new ObjectStorageService();
      
      const path = await objectStorageService.uploadFile(
        file.buffer,
        file.mimetype,
        file.originalname
      );

      res.json({ url: path });
    } catch (error) {
      console.error("Error in profile image upload route:", error);
      res.status(500).json({ error: "Failed to upload profile image" });
    }
  });

  // Concert discovery and search API with Ticketmaster and Setlist.fm integration (public endpoints)
  app.get("/api/concerts", async (req, res) => {
    try {
      const { search, genre, city, limit, offset, includeTicketmaster, includeHistorical, startDate, endDate } = req.query;
      const concerts = await storage.getConcertsWithHistorical({
        search: search as string,
        genre: genre as string,
        city: city as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        includeTicketmaster: includeTicketmaster === 'true',
        includeHistorical: includeHistorical === 'true',
        startDate: startDate as string,
        endDate: endDate as string,
      });
      res.json(concerts);
    } catch (error) {
      console.error("Error fetching concerts:", error);
      res.status(500).json({ error: "Failed to fetch concerts" });
    }
  });

  // Ticketmaster-only search endpoint (public)
  app.get("/api/ticketmaster/events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const event = await storage.getTicketmasterEvent(id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching Ticketmaster event:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/ticketmaster/events", async (req, res) => {
    try {
      const { keyword, city, genre, limit, page } = req.query;
      const events = await storage.searchTicketmasterEvents({
        keyword: keyword as string,
        city: city as string,
        classificationName: genre as string,
        size: limit ? parseInt(limit as string) : 20,
        page: page ? parseInt(page as string) : 0,
      });
      res.json(events);
    } catch (error) {
      console.error("Error searching Ticketmaster events:", error);
      res.status(500).json({ error: "Failed to search Ticketmaster events" });
    }
  });

  // Setlist.fm-only search endpoint for historical concerts (public)
  app.get("/api/setlistfm/events", async (req, res) => {
    try {
      const { artistName, venueName, cityName, year, limit, page } = req.query;
      const events = await storage.searchSetlistFmEvents({
        artistName: artistName as string,
        venueName: venueName as string,
        cityName: cityName as string,
        year: year as string,
        p: page ? parseInt(page as string) : 1, // Setlist.fm pages start at 1
      });
      
      // Apply limit if specified (Setlist.fm returns 20 per page by default)
      const limitNum = limit ? parseInt(limit as string) : 20;
      const limitedEvents = events.slice(0, limitNum);
      
      res.json(limitedEvents);
    } catch (error) {
      console.error("Error searching Setlist.fm events:", error);
      res.status(500).json({ error: "Failed to search Setlist.fm events" });
    }
  });

  app.get("/api/concerts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const concert = await storage.getConcert(id);
      if (!concert) {
        return res.status(404).json({ error: "Concert not found" });
      }
      res.json(concert);
    } catch (error) {
      console.error("Error fetching concert:", error);
      res.status(500).json({ error: "Failed to fetch concert" });
    }
  });

  // Protected concert management (authenticated users only)
  app.post("/api/concerts", isAuthenticated, async (req, res) => {
    try {
      const validation = insertConcertSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid concert data",
          details: fromZodError(validation.error).toString(),
        });
      }
      const concert = await storage.createConcert(validation.data);
      res.status(201).json(concert);
    } catch (error) {
      console.error("Error creating concert:", error);
      res.status(500).json({ error: "Failed to create concert" });
    }
  });

  app.put("/api/concerts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const validation = insertConcertSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid concert data",
          details: fromZodError(validation.error).toString(),
        });
      }
      const concert = await storage.updateConcert(id, validation.data);
      if (!concert) {
        return res.status(404).json({ error: "Concert not found" });
      }
      res.json(concert);
    } catch (error) {
      console.error("Error updating concert:", error);
      res.status(500).json({ error: "Failed to update concert" });
    }
  });

  app.delete("/api/concerts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteConcert(id);
      if (!success) {
        return res.status(404).json({ error: "Concert not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting concert:", error);
      res.status(500).json({ error: "Failed to delete concert" });
    }
  });

  // Reviews API - General reviews endpoint for timeline/feed (public endpoint)
  app.get("/api/reviews", async (req, res) => {
    try {
      const { limit, offset, sort } = req.query;
      const reviews = await storage.getAllReviews({
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        sort: sort as 'recent' | 'rating' | 'oldest' || 'recent',
      });
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching all reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Reviews API - Mixed public/protected routes
  app.get("/api/concerts/:concertId/reviews", async (req, res) => {
    try {
      const { concertId } = req.params;
      // Get authenticated user ID if available, but don't require it
      let currentUserId: string | undefined;
      if (getUserId(req)) {
        currentUserId = getUserId(req);
      }
      
      const reviews = await storage.getReviewsForConcert(concertId, currentUserId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching concert reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/users/:userId/reviews", async (req, res) => {
    try {
      const { userId } = req.params;
      // Get authenticated user ID if available, but don't require it
      let currentUserId: string | undefined;
      if (getUserId(req)) {
        currentUserId = getUserId(req);
      }
      
      const reviews = await storage.getReviewsForUser(userId, currentUserId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching user reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Protected review operations
  app.post("/api/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req); // Get user ID from authenticated session
      
      // Check if userId is undefined and return 401 if so
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Extract concert data if provided (for concerts not yet in database)
      const { concert, ...reviewBody } = req.body;
      
      // If concert data is provided, ensure it exists in database
      if (concert) {
        const concertId = concert.id;
        const existingConcert = await storage.getConcert(concertId);
        
        // Create concert if it doesn't exist
        if (!existingConcert) {
          console.log(`Creating concert with ID ${concertId} before review creation`);
          await db.insert(concerts).values({
            id: concertId,
            artist: concert.artist,
            venue: concert.venue,
            city: concert.city,
            date: concert.date,
            time: concert.time || '',
            price: concert.price || '',
            genre: concert.genre || null,
            imageUrl: concert.imageUrl || null,
            ticketUrl: concert.ticketUrl || null,
            description: concert.description || null,
          });
        }
      }
      
      const validation = insertReviewSchema.safeParse({
        ...reviewBody,
        userId, // Override any client-provided userId with authenticated user
      });
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid review data",
          details: fromZodError(validation.error).toString(),
        });
      }
      const review = await storage.createReview(validation.data);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.put("/api/reviews/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      // First check if user owns this review
      const existingReview = await storage.getReview(id);
      if (!existingReview) {
        return res.status(404).json({ error: "Review not found" });
      }
      if (existingReview.userId !== userId) {
        return res.status(403).json({ error: "You can only edit your own reviews" });
      }

      const validation = insertReviewSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid review data",
          details: fromZodError(validation.error).toString(),
        });
      }
      
      const review = await storage.updateReview(id, validation.data);
      res.json(review);
    } catch (error) {
      console.error("Error updating review:", error);
      res.status(500).json({ error: "Failed to update review" });
    }
  });

  app.delete("/api/reviews/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      // Check if user owns this review
      const existingReview = await storage.getReview(id);
      if (!existingReview) {
        return res.status(404).json({ error: "Review not found" });
      }
      if (existingReview.userId !== userId) {
        return res.status(403).json({ error: "You can only delete your own reviews" });
      }

      const success = await storage.deleteReview(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // Review likes API - SECURITY FIX: No more userId in request body
  app.post("/api/reviews/:reviewId/like", isAuthenticated, async (req: any, res) => {
    try {
      const { reviewId } = req.params;
      const userId = getUserId(req); // Get user ID from authenticated session
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const like = await storage.likeReview({ userId, reviewId });
      res.status(201).json(like);
    } catch (error) {
      console.error("Error liking review:", error);
      res.status(500).json({ error: "Failed to like review" });
    }
  });

  app.delete("/api/reviews/:reviewId/like", isAuthenticated, async (req: any, res) => {
    try {
      const { reviewId } = req.params;
      const userId = getUserId(req); // Get user ID from authenticated session
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const success = await storage.unlikeReview(userId, reviewId);
      if (!success) {
        return res.status(404).json({ error: "Like not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error unliking review:", error);
      res.status(500).json({ error: "Failed to unlike review" });
    }
  });

  // Get review likes status and count (public endpoint)
  app.get("/api/reviews/:reviewId/likes", async (req, res) => {
    try {
      const { reviewId } = req.params;
      let currentUserId: string | undefined;
      if (getUserId(req)) {
        currentUserId = getUserId(req);
      }
      
      const [likesCount, isLiked] = await Promise.all([
        storage.getReviewLikesCount(reviewId),
        currentUserId ? storage.isReviewLiked(currentUserId, reviewId) : false
      ]);
      
      res.json({ count: likesCount, isLiked });
    } catch (error) {
      console.error("Error fetching review likes:", error);
      res.status(500).json({ error: "Failed to fetch review likes" });
    }
  });

  // Review comments API
  app.get("/api/reviews/:reviewId/comments", async (req, res) => {
    try {
      const { reviewId } = req.params;
      const comments = await storage.getReviewComments(reviewId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching review comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/reviews/:reviewId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const { reviewId } = req.params;
      const userId = getUserId(req);
      
      const validation = insertReviewCommentSchema.safeParse({
        ...req.body,
        reviewId,
        userId,
      });
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid comment data",
          details: fromZodError(validation.error).toString(),
        });
      }
      
      const comment = await storage.createReviewComment(validation.data);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  app.delete("/api/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const { commentId } = req.params;
      const userId = getUserId(req);
      
      const success = await storage.deleteReviewComment(commentId, userId);
      if (!success) {
        return res.status(404).json({ error: "Comment not found or unauthorized" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // User management API 
  app.get("/api/users/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      const users = await storage.searchUsers(q);
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Get authenticated user ID if available, but don't require it
      let currentUserId: string | undefined;
      if (getUserId(req)) {
        currentUserId = getUserId(req);
      }
      
      const user = await storage.getUserWithStats(id, currentUserId || '');
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Check username availability
  app.get("/api/users/check-username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      
      // Basic validation
      if (!username || username.length < 3 || username.length > 30) {
        return res.json({ 
          available: false, 
          message: "Username must be between 3 and 30 characters" 
        });
      }
      
      // Check if username contains only allowed characters (alphanumeric, underscore, hyphen)
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.json({ 
          available: false, 
          message: "Username can only contain letters, numbers, underscores, and hyphens" 
        });
      }
      
      const isAvailable = await storage.isUsernameAvailable(username);
      res.json({ 
        available: isAvailable, 
        message: isAvailable ? "Username is available" : "Username is already taken" 
      });
    } catch (error) {
      console.error("Error checking username availability:", error);
      res.status(500).json({ error: "Failed to check username availability" });
    }
  });

  // Profile management - authenticated user only
  app.put("/api/users/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const validation = insertUserSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid user data",
          details: fromZodError(validation.error).toString(),
        });
      }
      const user = await storage.updateUser(userId, validation.data);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete user account and all associated data
  app.delete("/api/users/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(500).json({ error: "Failed to delete user account" });
      }
      
      // Log the user out after successful deletion and await callback
      await new Promise<void>((resolve, reject) => {
        req.logout((err: any) => {
          if (err) {
            console.error("Error logging out after account deletion:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      }).catch((logoutError) => {
        console.error("Logout failed after account deletion:", logoutError);
        // Don't fail the request - account was deleted successfully
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ error: "Failed to delete user account" });
    }
  });

  // Wishlist API - SECURITY FIX: Always use authenticated user
  app.get("/api/users/me/wishlist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const wishlist = await storage.getUserWishlist(userId);
      res.json(wishlist);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ error: "Failed to fetch wishlist" });
    }
  });

  app.post("/api/users/me/wishlist/:concertId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { concertId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const wishlistItem = await storage.addToWishlist({ userId, concertId });
      res.status(201).json(wishlistItem);
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      res.status(500).json({ error: "Failed to add to wishlist" });
    }
  });

  app.delete("/api/users/me/wishlist/:concertId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { concertId } = req.params;
      
      const success = await storage.removeFromWishlist(userId, concertId);
      if (!success) {
        return res.status(404).json({ error: "Wishlist item not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      res.status(500).json({ error: "Failed to remove from wishlist" });
    }
  });

  // Social features API - SECURITY FIX: Always use authenticated user
  app.post("/api/users/:userId/follow", isAuthenticated, async (req: any, res) => {
    try {
      const { userId: followingId } = req.params;
      const followerId = getUserId(req); // Get from auth session, not request body
      
      if (followerId === followingId) {
        return res.status(400).json({ error: "Cannot follow yourself" });
      }
      
      const follow = await storage.followUser({ followerId, followingId });
      res.status(201).json(follow);
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ error: "Failed to follow user" });
    }
  });

  app.delete("/api/users/:userId/follow", isAuthenticated, async (req: any, res) => {
    try {
      const { userId: followingId } = req.params;
      const followerId = getUserId(req); // Get from auth session, not request body
      
      const success = await storage.unfollowUser(followerId, followingId);
      if (!success) {
        return res.status(404).json({ error: "Follow relationship not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ error: "Failed to unfollow user" });
    }
  });

  app.get("/api/users/:userId/followers", async (req, res) => {
    try {
      const { userId } = req.params;
      const followers = await storage.getFollowers(userId);
      res.json(followers);
    } catch (error) {
      console.error("Error fetching followers:", error);
      res.status(500).json({ error: "Failed to fetch followers" });
    }
  });

  app.get("/api/users/:userId/following", async (req, res) => {
    try {
      const { userId } = req.params;
      const following = await storage.getFollowing(userId);
      res.json(following);
    } catch (error) {
      console.error("Error fetching following:", error);
      res.status(500).json({ error: "Failed to fetch following" });
    }
  });

  // Object serving endpoint for private files
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for object storage
  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Real image upload endpoint for profile photos
  app.post("/api/upload/profile-image", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file type
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }

      // Validate file size (5MB max)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "File size must be less than 5MB" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Get upload URL from object storage
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      // Upload file directly to object storage using the presigned URL
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: req.file.buffer,
        headers: {
          'Content-Type': req.file.mimetype,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to object storage');
      }

      // Set ACL policy for the uploaded object
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        uploadURL,
        {
          owner: userId,
          visibility: "public", // Profile images should be public
        },
      );

      // Return the object path that can be used to access the image
      res.json({ url: objectPath });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}