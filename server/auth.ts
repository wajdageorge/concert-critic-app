// Blueprint for username/password authentication using passport-local
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Configurable bcrypt cost (default 12 provides strong security)
const BCRYPT_COST = parseInt(process.env.BCRYPT_COST || '12');

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_COST);
}

async function comparePasswords(supplied: string, stored: string, username?: string): Promise<{ isValid: boolean; needsMigration: boolean }> {
  try {
    // Check if stored password is a bcrypt hash (starts with "$2")
    if (stored.startsWith('$2')) {
      // It's already a bcrypt hash, use normal comparison
      const isValid = await bcrypt.compare(supplied, stored);
      return { isValid, needsMigration: false };
    }
    
    // Legacy password handling
    console.log(`Legacy password detected for user: ${username || 'unknown'}`);
    
    // First check if it's plaintext (direct comparison)
    if (supplied === stored) {
      console.log(`Legacy plaintext password verified for user: ${username || 'unknown'}`);
      return { isValid: true, needsMigration: true };
    }
    
    // Could add other legacy hash formats here if needed
    // For now, if it doesn't match as plaintext and isn't bcrypt, it's invalid
    return { isValid: false, needsMigration: false };
    
  } catch (error) {
    // Log security event but don't expose details
    console.error(`Password comparison error for user: ${username || 'unknown'}`, error);
    return { isValid: false, needsMigration: false };
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false);
        }
        
        const { isValid, needsMigration } = await comparePasswords(password, user.password, username);
        if (!isValid) {
          return done(null, false);
        }
        
        // Handle password migration for legacy passwords
        if (needsMigration) {
          console.log(`Migrating legacy password to bcrypt for user: ${username}`);
          try {
            const hashedPassword = await hashPassword(password);
            await storage.updateUser(user.id, { password: hashedPassword });
            console.log(`Successfully migrated password for user: ${username}`);
          } catch (migrationError) {
            console.error(`Failed to migrate password for user: ${username}`, migrationError);
            // Don't fail the login if migration fails, but log it
          }
        }
        
        return done(null, user);
      } catch (error) {
        console.error('Authentication error:', error);
        // Convert all authentication errors to 401 responses, not 500
        return done(null, false);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate the request body
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid registration data",
          details: fromZodError(validation.error).toString(),
        });
      }

      const { username, password, email, name } = validation.data;

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmailUser = await storage.getUserByEmail(email);
        if (existingEmailUser) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Create new user with hashed password
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        name,
      });

      // Log in the new user
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error('Login authentication error:', err);
        return res.status(401).json({ message: "Authentication failed" });
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Login session error:', loginErr);
          return res.status(401).json({ message: "Authentication failed" });
        }
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(req.user);
  });
}