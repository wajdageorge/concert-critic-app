import { 
  type User, 
  type PublicUser,
  type UpsertUser,
  type InsertUser, 
  type Concert,
  type InsertConcert,
  type Review,
  type InsertReview,
  type ReviewWithUser,
  type ConcertWithRating,
  type UserWithStats,
  type ConcertWishlist,
  type InsertConcertWishlist,
  type ReviewLike,
  type InsertReviewLike,
  type ReviewComment,
  type InsertReviewComment,
  type ReviewCommentWithUser,
  type UserFollow,
  type InsertUserFollow,
  users,
  concerts,
  reviews,
  concertWishlists,
  reviewLikes,
  reviewComments,
  userFollows
} from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc, count, countDistinct, avg, and, ilike, or, sql, inArray } from "drizzle-orm";
import { ticketmasterService, type TicketmasterSearchOptions } from "./ticketmasterService";
import { setlistFmService, type SetlistFmSearchOptions } from "./setlistFmService";
import session from "express-session";
import connectPg from "connect-pg-simple";

const databaseUrl = process.env.DATABASE_URL!;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = neon(databaseUrl);
export const db = drizzle(client);

export interface IStorage {
  // Session store (required for authentication)
  sessionStore: session.Store;

  // Users (updated for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getUserWithStats(id: string, currentUserId?: string): Promise<UserWithStats | undefined>;
  searchUsers(query: string): Promise<PublicUser[]>;
  isUsernameAvailable(username: string): Promise<boolean>;

  // Concerts
  getConcert(id: string): Promise<Concert | undefined>;
  getConcerts(options?: {
    search?: string;
    genre?: string;
    city?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConcertWithRating[]>;
  createConcert(concert: InsertConcert): Promise<Concert>;
  updateConcert(id: string, updates: Partial<InsertConcert>): Promise<Concert | undefined>;
  deleteConcert(id: string): Promise<boolean>;

  // Ticketmaster Integration
  searchTicketmasterEvents(options?: TicketmasterSearchOptions): Promise<any[]>;
  getTicketmasterEvent(eventId: string): Promise<any | null>;
  getConcertsWithTicketmaster(options?: {
    search?: string;
    genre?: string;
    city?: string;
    limit?: number;
    offset?: number;
    includeTicketmaster?: boolean;
  }): Promise<ConcertWithRating[]>;

  // Setlist.fm Integration  
  searchSetlistFmEvents(options?: SetlistFmSearchOptions): Promise<any[]>;
  getConcertsWithHistorical(options?: {
    search?: string;
    genre?: string;
    city?: string;
    limit?: number;
    offset?: number;
    includeTicketmaster?: boolean;
    includeHistorical?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<ConcertWithRating[]>;

  // Reviews
  getReview(id: string): Promise<Review | undefined>;
  getReviewsForConcert(concertId: string, currentUserId?: string): Promise<ReviewWithUser[]>;
  getReviewsForUser(userId: string, currentUserId?: string): Promise<ReviewWithUser[]>;
  getAllReviews(options?: {
    limit?: number;
    offset?: number;
    sort?: 'recent' | 'rating' | 'oldest';
  }): Promise<ReviewWithUser[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: string, updates: Partial<InsertReview>): Promise<Review | undefined>;
  deleteReview(id: string): Promise<boolean>;

  // Wishlist
  addToWishlist(wishlist: InsertConcertWishlist): Promise<ConcertWishlist>;
  removeFromWishlist(userId: string, concertId: string): Promise<boolean>;
  getUserWishlist(userId: string): Promise<ConcertWithRating[]>;
  isInWishlist(userId: string, concertId: string): Promise<boolean>;

  // Review Likes
  likeReview(like: InsertReviewLike): Promise<ReviewLike>;
  unlikeReview(userId: string, reviewId: string): Promise<boolean>;
  isReviewLiked(userId: string, reviewId: string): Promise<boolean>;
  getReviewLikesCount(reviewId: string): Promise<number>;

  // Review Comments
  getReviewComments(reviewId: string): Promise<ReviewCommentWithUser[]>;
  createReviewComment(comment: InsertReviewComment): Promise<ReviewComment>;
  deleteReviewComment(commentId: string, userId: string): Promise<boolean>;
  getReviewCommentsCount(reviewId: string): Promise<number>;

  // User Follows
  followUser(follow: InsertUserFollow): Promise<UserFollow>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<PublicUser[]>;
  getFollowing(userId: string): Promise<PublicUser[]>;
}

export class PostgresStorage implements IStorage {
  public readonly sessionStore: session.Store;

  constructor() {
    // Initialize session store with PostgreSQL
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      conString: databaseUrl,
      tableName: "sessions",
      createTableIfMissing: false,
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }


  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if user exists by email (handles case where OIDC sub changes)
    if (userData.email) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);
      
      if (existingUser.length > 0) {
        // Update existing user with new OIDC sub and profile data
        const [user] = await db
          .update(users)
          .set({
            id: userData.id!, // Update ID in case OIDC sub changed
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return user;
      }
    }
    
    // Insert new user with conflict resolution on ID
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id!,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      return await db.transaction(async (tx) => {
        // Step 1: Get user's review IDs first to handle foreign key constraints properly
        const userReviews = await tx.select({ id: reviews.id })
          .from(reviews)
          .where(eq(reviews.userId, id));
        
        const userReviewIds = userReviews.map(review => review.id);
        
        // Step 2: Delete all comments where reviewId IN (user's reviews) - by OTHER users
        if (userReviewIds.length > 0) {
          await tx.delete(reviewComments)
            .where(sql`${reviewComments.reviewId} IN (${sql.join(userReviewIds.map(id => sql`${id}`), sql`, `)})`);
        }
        
        // Step 3: Delete all likes where reviewId IN (user's reviews) - by OTHER users  
        if (userReviewIds.length > 0) {
          await tx.delete(reviewLikes)
            .where(sql`${reviewLikes.reviewId} IN (${sql.join(userReviewIds.map(id => sql`${id}`), sql`, `)})`);
        }
        
        // Step 4: Delete user's own comments on OTHER reviews
        await tx.delete(reviewComments).where(eq(reviewComments.userId, id));
        
        // Step 5: Delete user's own likes on OTHER reviews
        await tx.delete(reviewLikes).where(eq(reviewLikes.userId, id));
        
        // Step 6: Delete user's wishlist items
        await tx.delete(concertWishlists).where(eq(concertWishlists.userId, id));
        
        // Step 7: Delete user's follow relationships
        await tx.delete(userFollows).where(or(eq(userFollows.followerId, id), eq(userFollows.followingId, id)));
        
        // Step 8: Delete user's reviews (now safe since all referencing comments/likes are gone)
        await tx.delete(reviews).where(eq(reviews.userId, id));
        
        // Step 9: Delete user record with .returning() and verify deletion
        const deletedUsers = await tx.delete(users)
          .where(eq(users.id, id))
          .returning({ id: users.id });
        
        return deletedUsers.length > 0;
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getUserWithStats(id: string, currentUserId?: string): Promise<UserWithStats | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    // Get user stats
    const [concertsCount, reviewsCount, followersCount, followingCount, avgRating] = await Promise.all([
      // Count unique concerts from reviews
      db.select({ count: countDistinct(reviews.concertId) })
        .from(reviews)
        .where(eq(reviews.userId, id)),
      
      // Count total reviews
      db.select({ count: count() })
        .from(reviews)
        .where(eq(reviews.userId, id)),
      
      // Count followers
      db.select({ count: count() })
        .from(userFollows)
        .where(eq(userFollows.followingId, id)),
      
      // Count following
      db.select({ count: count() })
        .from(userFollows)
        .where(eq(userFollows.followerId, id)),
      
      // Average rating
      db.select({ avg: avg(reviews.overallRating) })
        .from(reviews)
        .where(eq(reviews.userId, id))
    ]);

    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      isFollowing = await this.isFollowing(currentUserId, id);
    }

    // SECURITY FIX: Return only public fields, exclude email, firstName, lastName
    const publicUser: PublicUser = {
      id: user.id,
      username: user.username,
      profileImageUrl: user.profileImageUrl,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      location: user.location,
      isVerified: user.isVerified,
      isPrivate: user.isPrivate,
      favoriteGenres: user.favoriteGenres,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      ...publicUser,
      stats: {
        concertsAttended: concertsCount[0]?.count || 0,
        reviewsWritten: reviewsCount[0]?.count || 0,
        followers: followersCount[0]?.count || 0,
        following: followingCount[0]?.count || 0,
        averageRating: avgRating[0]?.avg ? Number(avgRating[0].avg) : undefined,
      },
      isFollowing,
    };
  }

  async searchUsers(query: string): Promise<PublicUser[]> {
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        profileImageUrl: users.profileImageUrl,
        firstName: users.firstName,
        lastName: users.lastName,
        bio: users.bio,
        location: users.location,
        isVerified: users.isVerified,
        isPrivate: users.isPrivate,
        favoriteGenres: users.favoriteGenres,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(
        or(
          ilike(users.firstName, `%${query}%`),
          ilike(users.lastName, `%${query}%`)
        )
      )
      .limit(20);
    return result;
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return result.length === 0;
  }

  // Concerts
  async getConcert(id: string): Promise<Concert | undefined> {
    const result = await db.select().from(concerts).where(eq(concerts.id, id)).limit(1);
    return result[0];
  }

  async getConcerts(options?: {
    search?: string;
    genre?: string;
    city?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConcertWithRating[]> {
    const { search, genre, city, limit = 20, offset = 0 } = options || {};
    
    let query = db
      .select({
        concert: concerts,
        avgRating: avg(reviews.overallRating),
        avgPerformance: avg(reviews.performanceRating),
        avgSound: avg(reviews.soundRating),
        avgVenue: avg(reviews.venueRating),
        avgValue: avg(reviews.valueRating),
        reviewCount: count(reviews.id),
      })
      .from(concerts)
      .leftJoin(reviews, eq(concerts.id, reviews.concertId))
      .groupBy(concerts.id)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(concerts.createdAt));

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(concerts.artist, `%${search}%`),
          ilike(concerts.venue, `%${search}%`),
          ilike(concerts.city, `%${search}%`)
        )
      );
    }
    if (genre) {
      conditions.push(eq(concerts.genre, genre));
    }
    if (city) {
      conditions.push(ilike(concerts.city, `%${city}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    
    return result.map(row => ({
      ...row.concert,
      averageRating: row.avgRating ? Number(row.avgRating) : undefined,
      performanceRating: row.avgPerformance ? Number(row.avgPerformance) : undefined,
      soundRating: row.avgSound ? Number(row.avgSound) : undefined,
      venueRating: row.avgVenue ? Number(row.avgVenue) : undefined,
      valueRating: row.avgValue ? Number(row.avgValue) : undefined,
      reviewCount: Number(row.reviewCount),
    }));
  }

  async createConcert(concert: InsertConcert): Promise<Concert> {
    const result = await db.insert(concerts).values(concert).returning();
    return result[0];
  }

  async updateConcert(id: string, updates: Partial<InsertConcert>): Promise<Concert | undefined> {
    const result = await db
      .update(concerts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(concerts.id, id))
      .returning();
    return result[0];
  }

  async deleteConcert(id: string): Promise<boolean> {
    const result = await db.delete(concerts).where(eq(concerts.id, id)).returning();
    return result.length > 0;
  }

  // Reviews
  async getReview(id: string): Promise<Review | undefined> {
    const result = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    return result[0];
  }

  async getReviewsForConcert(concertId: string, currentUserId?: string): Promise<ReviewWithUser[]> {
    const result = await db
      .select({
        review: reviews,
        user: {
          id: users.id,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
          firstName: users.firstName,
          lastName: users.lastName,
          bio: users.bio,
          location: users.location,
          isVerified: users.isVerified,
          isPrivate: users.isPrivate,
          favoriteGenres: users.favoriteGenres,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        concert: concerts,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(concerts, eq(reviews.concertId, concerts.id))
      .where(eq(reviews.concertId, concertId))
      .orderBy(desc(reviews.createdAt));

    if (result.length === 0) return [];

    const reviewIds = result.map(row => row.review.id);

    // Batch check if current user liked any of these reviews (fix N+1 query)
    let likedReviewIds = new Set<string>();
    if (currentUserId) {
      const likes = await db
        .select({ reviewId: reviewLikes.reviewId })
        .from(reviewLikes)
        .where(
          and(
            eq(reviewLikes.userId, currentUserId),
            inArray(reviewLikes.reviewId, reviewIds)
          )
        );
      likedReviewIds = new Set(likes.map(like => like.reviewId));
    }

    // Batch get likes counts for all reviews
    const likesCounts = await db
      .select({
        reviewId: reviewLikes.reviewId,
        count: count(),
      })
      .from(reviewLikes)
      .where(inArray(reviewLikes.reviewId, reviewIds))
      .groupBy(reviewLikes.reviewId);
    
    const likesCountMap = new Map(likesCounts.map(item => [item.reviewId, Number(item.count)]));

    // Batch get comments counts for all reviews
    const commentsCounts = await db
      .select({
        reviewId: reviewComments.reviewId,
        count: count(),
      })
      .from(reviewComments)
      .where(inArray(reviewComments.reviewId, reviewIds))
      .groupBy(reviewComments.reviewId);
    
    const commentsCountMap = new Map(commentsCounts.map(item => [item.reviewId, Number(item.count)]));

    return result.map(row => ({
      ...row.review,
      user: row.user,
      concert: row.concert,
      isLiked: likedReviewIds.has(row.review.id),
      likesCount: likesCountMap.get(row.review.id) || 0,
      commentsCount: commentsCountMap.get(row.review.id) || 0,
    }));
  }

  async getReviewsForUser(userId: string, currentUserId?: string): Promise<ReviewWithUser[]> {
    const result = await db
      .select({
        review: reviews,
        user: {
          id: users.id,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
          firstName: users.firstName,
          lastName: users.lastName,
          bio: users.bio,
          location: users.location,
          isVerified: users.isVerified,
          isPrivate: users.isPrivate,
          favoriteGenres: users.favoriteGenres,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        concert: concerts,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(concerts, eq(reviews.concertId, concerts.id))
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdAt));

    if (result.length === 0) return [];

    const reviewIds = result.map(row => row.review.id);

    // Batch check if current user liked any of these reviews (fix N+1 query)
    let likedReviewIds = new Set<string>();
    if (currentUserId && currentUserId !== userId) {
      const likes = await db
        .select({ reviewId: reviewLikes.reviewId })
        .from(reviewLikes)
        .where(
          and(
            eq(reviewLikes.userId, currentUserId),
            inArray(reviewLikes.reviewId, reviewIds)
          )
        );
      likedReviewIds = new Set(likes.map(like => like.reviewId));
    }

    // Batch get likes counts for all reviews
    const likesCounts = await db
      .select({
        reviewId: reviewLikes.reviewId,
        count: count(),
      })
      .from(reviewLikes)
      .where(inArray(reviewLikes.reviewId, reviewIds))
      .groupBy(reviewLikes.reviewId);
    
    const likesCountMap = new Map(likesCounts.map(item => [item.reviewId, Number(item.count)]));

    // Batch get comments counts for all reviews
    const commentsCounts = await db
      .select({
        reviewId: reviewComments.reviewId,
        count: count(),
      })
      .from(reviewComments)
      .where(inArray(reviewComments.reviewId, reviewIds))
      .groupBy(reviewComments.reviewId);
    
    const commentsCountMap = new Map(commentsCounts.map(item => [item.reviewId, Number(item.count)]));

    return result.map(row => ({
      ...row.review,
      user: row.user,
      concert: row.concert,
      isLiked: likedReviewIds.has(row.review.id),
      likesCount: likesCountMap.get(row.review.id) || 0,
      commentsCount: commentsCountMap.get(row.review.id) || 0,
    }));
  }

  async getAllReviews(options?: {
    limit?: number;
    offset?: number;
    sort?: 'recent' | 'rating' | 'oldest';
  }): Promise<ReviewWithUser[]> {
    const { limit = 20, offset = 0, sort = 'recent' } = options || {};
    
    let query = db
      .select({
        review: reviews,
        user: {
          id: users.id,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
          firstName: users.firstName,
          lastName: users.lastName,
          bio: users.bio,
          location: users.location,
          isVerified: users.isVerified,
          isPrivate: users.isPrivate,
          favoriteGenres: users.favoriteGenres,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        concert: concerts,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(concerts, eq(reviews.concertId, concerts.id))
      .limit(limit)
      .offset(offset);

    // Apply sorting
    switch (sort) {
      case 'recent':
        query = query.orderBy(desc(reviews.createdAt)) as any;
        break;
      case 'oldest':
        query = query.orderBy(reviews.createdAt) as any;
        break;
      case 'rating':
        query = query.orderBy(desc(reviews.overallRating), desc(reviews.createdAt)) as any;
        break;
      default:
        query = query.orderBy(desc(reviews.createdAt)) as any;
    }

    const result = await query;

    if (result.length === 0) return [];

    const reviewIds = result.map(row => row.review.id);

    // Batch get likes counts for all reviews
    const likesCounts = await db
      .select({
        reviewId: reviewLikes.reviewId,
        count: count(),
      })
      .from(reviewLikes)
      .where(inArray(reviewLikes.reviewId, reviewIds))
      .groupBy(reviewLikes.reviewId);
    
    const likesCountMap = new Map(likesCounts.map(item => [item.reviewId, Number(item.count)]));

    // Batch get comments counts for all reviews
    const commentsCounts = await db
      .select({
        reviewId: reviewComments.reviewId,
        count: count(),
      })
      .from(reviewComments)
      .where(inArray(reviewComments.reviewId, reviewIds))
      .groupBy(reviewComments.reviewId);
    
    const commentsCountMap = new Map(commentsCounts.map(item => [item.reviewId, Number(item.count)]));

    // For getAllReviews, we don't pass currentUserId to keep it public and simple
    // If authentication is needed later, it can be added as a parameter
    return result.map(row => ({
      ...row.review,
      user: row.user,
      concert: row.concert,
      isLiked: false, // Default to false for public access
      likesCount: likesCountMap.get(row.review.id) || 0,
      commentsCount: commentsCountMap.get(row.review.id) || 0,
    }));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(review).returning();
    return result[0];
  }

  async updateReview(id: string, updates: Partial<InsertReview>): Promise<Review | undefined> {
    const result = await db
      .update(reviews)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return result[0];
  }

  async deleteReview(id: string): Promise<boolean> {
    const result = await db.delete(reviews).where(eq(reviews.id, id)).returning();
    return result.length > 0;
  }

  // Wishlist
  async addToWishlist(wishlist: InsertConcertWishlist): Promise<ConcertWishlist> {
    const result = await db.insert(concertWishlists).values(wishlist).returning();
    return result[0];
  }

  async removeFromWishlist(userId: string, concertId: string): Promise<boolean> {
    const result = await db
      .delete(concertWishlists)
      .where(
        and(
          eq(concertWishlists.userId, userId),
          eq(concertWishlists.concertId, concertId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async getUserWishlist(userId: string): Promise<ConcertWithRating[]> {
    const result = await db
      .select({
        concert: concerts,
        avgRating: avg(reviews.overallRating),
        avgPerformance: avg(reviews.performanceRating),
        avgSound: avg(reviews.soundRating),
        avgVenue: avg(reviews.venueRating),
        avgValue: avg(reviews.valueRating),
        reviewCount: count(reviews.id),
        wishlistCreatedAt: concertWishlists.createdAt,
      })
      .from(concertWishlists)
      .innerJoin(concerts, eq(concertWishlists.concertId, concerts.id))
      .leftJoin(reviews, eq(concerts.id, reviews.concertId))
      .where(eq(concertWishlists.userId, userId))
      .groupBy(concerts.id, concertWishlists.createdAt)
      .orderBy(desc(concertWishlists.createdAt));

    return result.map(row => ({
      ...row.concert,
      averageRating: row.avgRating ? Number(row.avgRating) : undefined,
      performanceRating: row.avgPerformance ? Number(row.avgPerformance) : undefined,
      soundRating: row.avgSound ? Number(row.avgSound) : undefined,
      venueRating: row.avgVenue ? Number(row.avgVenue) : undefined,
      valueRating: row.avgValue ? Number(row.avgValue) : undefined,
      reviewCount: Number(row.reviewCount),
      isWishlisted: true,
    }));
  }

  async isInWishlist(userId: string, concertId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(concertWishlists)
      .where(
        and(
          eq(concertWishlists.userId, userId),
          eq(concertWishlists.concertId, concertId)
        )
      )
      .limit(1);
    return result.length > 0;
  }

  // Review Likes
  async likeReview(like: InsertReviewLike): Promise<ReviewLike> {
    try {
      // Insert the like and increment the review likes count
      const [result] = await Promise.all([
        db.insert(reviewLikes).values(like).returning(),
        db
          .update(reviews)
          .set({ likes: sql`${reviews.likes} + 1` })
          .where(eq(reviews.id, like.reviewId))
      ]);
      return result[0];
    } catch (error) {
      // If constraint violation (duplicate like), check if it exists and return it
      if (error instanceof Error && error.message.includes('duplicate key')) {
        const existing = await db
          .select()
          .from(reviewLikes)
          .where(
            and(
              eq(reviewLikes.userId, like.userId),
              eq(reviewLikes.reviewId, like.reviewId)
            )
          )
          .limit(1);
        if (existing[0]) return existing[0];
      }
      throw error;
    }
  }

  async unlikeReview(userId: string, reviewId: string): Promise<boolean> {
    // First check if like exists to ensure we only decrement if necessary
    const existingLike = await db
      .select()
      .from(reviewLikes)
      .where(
        and(
          eq(reviewLikes.userId, userId),
          eq(reviewLikes.reviewId, reviewId)
        )
      )
      .limit(1);

    if (existingLike.length === 0) {
      return false; // Like doesn't exist, nothing to unlike
    }

    // Remove the like and decrement the review likes count
    const [result] = await Promise.all([
      db
        .delete(reviewLikes)
        .where(
          and(
            eq(reviewLikes.userId, userId),
            eq(reviewLikes.reviewId, reviewId)
          )
        )
        .returning(),
      db
        .update(reviews)
        .set({ likes: sql`GREATEST(${reviews.likes} - 1, 0)` })
        .where(eq(reviews.id, reviewId))
    ]);
    return result.length > 0;
  }

  async isReviewLiked(userId: string, reviewId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(reviewLikes)
      .where(
        and(
          eq(reviewLikes.userId, userId),
          eq(reviewLikes.reviewId, reviewId)
        )
      )
      .limit(1);
    return result.length > 0;
  }

  async getReviewLikesCount(reviewId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(reviewLikes)
      .where(eq(reviewLikes.reviewId, reviewId));
    return result[0]?.count || 0;
  }

  // Review Comments
  async getReviewComments(reviewId: string): Promise<ReviewCommentWithUser[]> {
    const result = await db
      .select({
        comment: reviewComments,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          bio: users.bio,
          location: users.location,
          isVerified: users.isVerified,
          isPrivate: users.isPrivate,
          favoriteGenres: users.favoriteGenres,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(reviewComments)
      .leftJoin(users, eq(reviewComments.userId, users.id))
      .where(eq(reviewComments.reviewId, reviewId))
      .orderBy(desc(reviewComments.createdAt));

    return result.map(row => ({
      ...row.comment,
      user: row.user as PublicUser,
    }));
  }

  async createReviewComment(comment: InsertReviewComment): Promise<ReviewComment> {
    const result = await db.insert(reviewComments).values(comment).returning();
    return result[0];
  }

  async deleteReviewComment(commentId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(reviewComments)
      .where(
        and(
          eq(reviewComments.id, commentId),
          eq(reviewComments.userId, userId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async getReviewCommentsCount(reviewId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(reviewComments)
      .where(eq(reviewComments.reviewId, reviewId));
    return result[0]?.count || 0;
  }

  // User Follows
  async followUser(follow: InsertUserFollow): Promise<UserFollow> {
    const result = await db.insert(userFollows).values(follow).returning();
    return result[0];
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const result = await db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          eq(userFollows.followingId, followingId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          eq(userFollows.followingId, followingId)
        )
      )
      .limit(1);
    return result.length > 0;
  }

  async getFollowers(userId: string): Promise<PublicUser[]> {
    const result = await db
      .select({ 
        user: {
          id: users.id,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
          firstName: users.firstName,
          lastName: users.lastName,
          bio: users.bio,
          location: users.location,
          isVerified: users.isVerified,
          isPrivate: users.isPrivate,
          favoriteGenres: users.favoriteGenres,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followerId, users.id))
      .where(eq(userFollows.followingId, userId))
      .orderBy(desc(userFollows.createdAt));
    return result.map(row => row.user);
  }

  async getFollowing(userId: string): Promise<PublicUser[]> {
    const result = await db
      .select({ 
        user: {
          id: users.id,
          username: users.username,
          profileImageUrl: users.profileImageUrl,
          firstName: users.firstName,
          lastName: users.lastName,
          bio: users.bio,
          location: users.location,
          isVerified: users.isVerified,
          isPrivate: users.isPrivate,
          favoriteGenres: users.favoriteGenres,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followingId, users.id))
      .where(eq(userFollows.followerId, userId))
      .orderBy(desc(userFollows.createdAt));
    return result.map(row => row.user);
  }

  // Ticketmaster Integration
  async searchTicketmasterEvents(options: TicketmasterSearchOptions = {}): Promise<any[]> {
    try {
      const events = await ticketmasterService.searchEvents(options);
      return events.map(event => ticketmasterService.transformEvent(event));
    } catch (error) {
      console.error('Error searching Ticketmaster events:', error);
      return [];
    }
  }

  async getTicketmasterEvent(eventId: string): Promise<any | null> {
    try {
      const event = await ticketmasterService.getEvent(eventId);
      if (!event) return null;
      return ticketmasterService.transformEvent(event);
    } catch (error) {
      console.error('Error fetching Ticketmaster event:', error);
      return null;
    }
  }

  // Setlist.fm Integration
  async searchSetlistFmEvents(options: SetlistFmSearchOptions = {}): Promise<any[]> {
    try {
      const setlists = await setlistFmService.searchSetlists(options);
      return setlists.map(setlist => setlistFmService.transformSetlist(setlist));
    } catch (error) {
      console.error('Error searching Setlist.fm events:', error);
      return [];
    }
  }

  async getConcertsWithTicketmaster(options: {
    search?: string;
    genre?: string;
    city?: string;
    limit?: number;
    offset?: number;
    includeTicketmaster?: boolean;
  } = {}): Promise<ConcertWithRating[]> {
    try {
      // Get database concerts first
      const dbConcerts = await this.getConcerts(options);
      
      // If Ticketmaster integration is disabled, return only DB concerts
      if (!options.includeTicketmaster) {
        return dbConcerts;
      }

      // Build Ticketmaster search options
      const tmOptions: TicketmasterSearchOptions = {
        size: options.limit || 20,
        page: Math.floor((options.offset || 0) / (options.limit || 20)),
      };

      if (options.search) tmOptions.keyword = options.search;
      if (options.city) tmOptions.city = options.city;
      if (options.genre) tmOptions.classificationName = options.genre;

      // Get Ticketmaster events
      const tmEvents = await this.searchTicketmasterEvents(tmOptions);
      
      // Transform Ticketmaster events to ConcertWithRating format
      const tmConcerts: ConcertWithRating[] = tmEvents.map(event => ({
        ...event,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Add default rating values since these are external events (using undefined to match DB concerts)
        averageRating: undefined,
        performanceRating: undefined,
        soundRating: undefined,
        venueRating: undefined,
        valueRating: undefined,
        reviewCount: 0,
      }));

      // Combine and deduplicate (prioritize DB concerts)
      const combinedConcerts = [...dbConcerts];
      const dbConcertIds = new Set(dbConcerts.map(c => c.id));
      
      for (const tmConcert of tmConcerts) {
        if (!dbConcertIds.has(tmConcert.id)) {
          combinedConcerts.push(tmConcert);
        }
      }

      // Apply search filtering to combined results
      let filteredConcerts = combinedConcerts;
      
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredConcerts = combinedConcerts.filter(concert =>
          concert.artist.toLowerCase().includes(searchLower) ||
          concert.venue.toLowerCase().includes(searchLower) ||
          concert.city.toLowerCase().includes(searchLower)
        );
      }

      if (options.genre) {
        const genreLower = options.genre.toLowerCase();
        filteredConcerts = filteredConcerts.filter(concert =>
          concert.genre?.toLowerCase().includes(genreLower)
        );
      }

      // Apply pagination
      const startIndex = options.offset || 0;
      const endIndex = startIndex + (options.limit || 50);
      
      return filteredConcerts.slice(startIndex, endIndex);
    } catch (error) {
      console.error('Error getting concerts with Ticketmaster:', error);
      // Fallback to database-only concerts
      return this.getConcerts(options);
    }
  }

  async getConcertsWithHistorical(options: {
    search?: string;
    genre?: string;
    city?: string;
    limit?: number;
    offset?: number;
    includeTicketmaster?: boolean;
    includeHistorical?: boolean;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ConcertWithRating[]> {
    try {
      // Get database concerts first
      const dbConcerts = await this.getConcerts(options);
      
      let combinedConcerts = [...dbConcerts];
      const allConcertIds = new Set(dbConcerts.map(c => c.id));

      // Add Ticketmaster events if requested
      if (options.includeTicketmaster) {
        const tmOptions: TicketmasterSearchOptions = {
          size: options.limit || 20,
          page: Math.floor((options.offset || 0) / (options.limit || 20)),
        };

        if (options.search) tmOptions.keyword = options.search;
        if (options.city) tmOptions.city = options.city;
        if (options.genre) tmOptions.classificationName = options.genre;
        if (options.startDate) tmOptions.startDateTime = options.startDate + 'T00:00:00Z';
        if (options.endDate) tmOptions.endDateTime = options.endDate + 'T23:59:59Z';

        const tmEvents = await this.searchTicketmasterEvents(tmOptions);
        
        const tmConcerts: ConcertWithRating[] = tmEvents.map(event => ({
          ...event,
          createdAt: new Date(),
          updatedAt: new Date(),
          averageRating: undefined,
          performanceRating: undefined,
          soundRating: undefined,
          venueRating: undefined,
          valueRating: undefined,
          reviewCount: 0,
        }));

        // Add Ticketmaster concerts that aren't already in the database
        for (const tmConcert of tmConcerts) {
          if (!allConcertIds.has(tmConcert.id)) {
            combinedConcerts.push(tmConcert);
            allConcertIds.add(tmConcert.id);
          }
        }
      }

      // Add Setlist.fm historical events if requested
      if (options.includeHistorical) {
        const sfmOptions: SetlistFmSearchOptions = {
          p: Math.floor((options.offset || 0) / (options.limit || 20)) + 1, // Setlist.fm pages start at 1
        };

        if (options.search) sfmOptions.artistName = options.search;
        if (options.city) sfmOptions.cityName = options.city;

        const sfmEvents = await this.searchSetlistFmEvents(sfmOptions);
        
        const sfmConcerts: ConcertWithRating[] = sfmEvents.map(event => ({
          ...event,
          createdAt: new Date(),
          updatedAt: new Date(),
          averageRating: undefined,
          performanceRating: undefined,
          soundRating: undefined,
          venueRating: undefined,
          valueRating: undefined,
          reviewCount: 0,
        }));

        // Add Setlist.fm concerts that aren't already in the combined results
        for (const sfmConcert of sfmConcerts) {
          if (!allConcertIds.has(sfmConcert.id)) {
            combinedConcerts.push(sfmConcert);
            allConcertIds.add(sfmConcert.id);
          }
        }
      }

      // Apply search filtering to combined results
      let filteredConcerts = combinedConcerts;
      
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredConcerts = combinedConcerts.filter(concert =>
          concert.artist.toLowerCase().includes(searchLower) ||
          concert.venue.toLowerCase().includes(searchLower) ||
          concert.city.toLowerCase().includes(searchLower)
        );
      }

      if (options.genre) {
        const genreLower = options.genre.toLowerCase();
        filteredConcerts = filteredConcerts.filter(concert =>
          concert.genre?.toLowerCase().includes(genreLower)
        );
      }

      // Apply pagination
      const startIndex = options.offset || 0;
      const endIndex = startIndex + (options.limit || 50);
      
      return filteredConcerts.slice(startIndex, endIndex);
    } catch (error) {
      console.error('Error getting concerts with historical data:', error);
      // Fallback to database-only concerts
      return this.getConcerts(options);
    }
  }
}

export const storage = new PostgresStorage();
