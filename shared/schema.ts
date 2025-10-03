import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (updated for Replit Auth integration)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: varchar("username", { length: 30 }).unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Extended fields for concert critic functionality
  bio: text("bio"),
  location: text("location"),
  isVerified: boolean("is_verified").default(false),
  isPrivate: boolean("is_private").default(false),
  favoriteGenres: text("favorite_genres").array().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Concerts table
export const concerts = pgTable("concerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artist: text("artist").notNull(),
  venue: text("venue").notNull(),
  city: text("city").notNull(),
  date: text("date").notNull(), // Store as ISO string for simplicity
  time: text("time").notNull(),
  price: text("price").notNull(),
  genre: text("genre"),
  imageUrl: text("image_url"),
  ticketUrl: text("ticket_url"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reviews table
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  concertId: varchar("concert_id").references(() => concerts.id, { onDelete: "cascade" }).notNull(),
  overallRating: integer("overall_rating").notNull(), // 1-5
  performanceRating: integer("performance_rating").notNull(),
  soundRating: integer("sound_rating").notNull(),
  venueRating: integer("venue_rating").notNull(),
  valueRating: integer("value_rating").notNull(),
  reviewText: text("review_text").notNull(),
  photos: text("photos").array().default(sql`'{}'::text[]`),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserConcert: sql`UNIQUE (${table.userId}, ${table.concertId})`,
}));

// User follows table (for social features)
export const userFollows = pgTable("user_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  followingId: varchar("following_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserFollow: sql`UNIQUE (${table.followerId}, ${table.followingId})`,
}));

// Concert wishlists table
export const concertWishlists = pgTable("concert_wishlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  concertId: varchar("concert_id").references(() => concerts.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserConcert: sql`UNIQUE (${table.userId}, ${table.concertId})`,
}));

// Review likes table
export const reviewLikes = pgTable("review_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reviewId: varchar("review_id").references(() => reviews.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserReview: sql`UNIQUE (${table.userId}, ${table.reviewId})`,
}));

// Review comments table
export const reviewComments = pgTable("review_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").references(() => reviews.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  commentText: text("comment_text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'follow', 'like', 'comment', 'review', 'mention'
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // URL to the related content
  isRead: boolean("is_read").default(false),
  relatedUserId: varchar("related_user_id").references(() => users.id, { onDelete: "cascade" }),
  relatedReviewId: varchar("related_review_id").references(() => reviews.id, { onDelete: "cascade" }),
  relatedConcertId: varchar("related_concert_id").references(() => concerts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("notifications_user_id_idx").on(table.userId),
  index("notifications_is_read_idx").on(table.isRead),
]);

// Artists table
export const artists = pgTable("artists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  genres: text("genres").array().default(sql`'{}'::text[]`),
  bio: text("bio"),
  imageUrl: text("image_url"),
  spotifyUrl: text("spotify_url"),
  website: text("website"),
  country: text("country"),
  isVerified: boolean("is_verified").default(false),
  followerCount: integer("follower_count").default(0),
  concertCount: integer("concert_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("artists_name_idx").on(table.name),
]);

// Venues table  
export const venues = pgTable("venues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  city: text("city").notNull(),
  state: text("state"),
  country: text("country").notNull(),
  address: text("address"),
  capacity: integer("capacity"),
  type: varchar("type", { length: 50 }), // 'arena', 'theater', 'club', 'stadium', 'festival', 'outdoor'
  amenities: text("amenities").array().default(sql`'{}'::text[]`), // ['parking', 'food', 'bar', 'accessible']
  imageUrl: text("image_url"),
  website: text("website"),
  averageRating: real("average_rating"),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("venues_city_idx").on(table.city),
  index("venues_name_idx").on(table.name),
]);

// User settings table
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  newFollowerNotif: boolean("new_follower_notif").default(true),
  newReviewNotif: boolean("new_review_notif").default(true),
  newCommentNotif: boolean("new_comment_notif").default(true),
  newLikeNotif: boolean("new_like_notif").default(true),
  upcomingConcertReminders: boolean("upcoming_concert_reminders").default(true),
  theme: varchar("theme", { length: 20 }).default("system"), // 'light', 'dark', 'system'
  language: varchar("language", { length: 10 }).default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Setlists table
export const setlists = pgTable("setlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  concertId: varchar("concert_id").references(() => concerts.id, { onDelete: "cascade" }).notNull(),
  songs: text("songs").array().default(sql`'{}'::text[]`), // Array of song names
  encoreSongs: text("encore_songs").array().default(sql`'{}'::text[]`),
  notes: text("notes"),
  source: varchar("source", { length: 50 }), // 'setlistfm', 'user_submitted'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("setlists_concert_id_idx").on(table.concertId),
]);

// Artist follows (for following artists to get notified about their concerts)
export const artistFollows = pgTable("artist_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  artistId: varchar("artist_id").references(() => artists.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserArtist: sql`UNIQUE (${table.userId}, ${table.artistId})`,
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = insertUserSchema.partial().extend({
  id: z.string(), // Required for Replit Auth
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const insertConcertSchema = createInsertSchema(concerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  likes: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  overallRating: z.number().min(1).max(5),
  performanceRating: z.number().min(1).max(5),
  soundRating: z.number().min(1).max(5),
  venueRating: z.number().min(1).max(5),
  valueRating: z.number().min(1).max(5),
  reviewText: z.string().min(10).max(2000),
});

export const insertUserFollowSchema = createInsertSchema(userFollows).omit({
  id: true,
  createdAt: true,
});

export const insertConcertWishlistSchema = createInsertSchema(concertWishlists).omit({
  id: true,
  createdAt: true,
});

export const insertReviewLikeSchema = createInsertSchema(reviewLikes).omit({
  id: true,
  createdAt: true,
});

export const insertReviewCommentSchema = createInsertSchema(reviewComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  commentText: z.string().min(1).max(500),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertArtistSchema = createInsertSchema(artists).omit({
  id: true,
  followerCount: true,
  concertCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVenueSchema = createInsertSchema(venues).omit({
  id: true,
  averageRating: true,
  reviewCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSetlistSchema = createInsertSchema(setlists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertArtistFollowSchema = createInsertSchema(artistFollows).omit({
  id: true,
  createdAt: true,
});

// Additional type exports
export type Concert = typeof concerts.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type UserFollow = typeof userFollows.$inferSelect;
export type ConcertWishlist = typeof concertWishlists.$inferSelect;
export type ReviewLike = typeof reviewLikes.$inferSelect;
export type ReviewComment = typeof reviewComments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Artist = typeof artists.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type Setlist = typeof setlists.$inferSelect;
export type ArtistFollow = typeof artistFollows.$inferSelect;

export type InsertConcert = z.infer<typeof insertConcertSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertUserFollow = z.infer<typeof insertUserFollowSchema>;
export type InsertConcertWishlist = z.infer<typeof insertConcertWishlistSchema>;
export type InsertReviewLike = z.infer<typeof insertReviewLikeSchema>;
export type InsertReviewComment = z.infer<typeof insertReviewCommentSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type InsertSetlist = z.infer<typeof insertSetlistSchema>;
export type InsertArtistFollow = z.infer<typeof insertArtistFollowSchema>;

// Public user type (excludes sensitive fields)
export type PublicUser = Omit<User, 'email'>;

// Extended types for API responses
export type ReviewWithUser = Review & {
  user: PublicUser;
  concert: Concert;
  isLiked?: boolean;
  likesCount?: number;
  commentsCount?: number;
};

export type ReviewCommentWithUser = ReviewComment & {
  user: PublicUser;
};

export type ConcertWithRating = Concert & {
  averageRating?: number;
  performanceRating?: number;
  soundRating?: number;
  venueRating?: number;
  valueRating?: number;
  reviewCount?: number;
  isWishlisted?: boolean;
};

export type UserWithStats = PublicUser & {
  stats: {
    concertsAttended: number;
    reviewsWritten: number;
    followers: number;
    following: number;
    averageRating?: number;
  };
  isFollowing?: boolean;
};
