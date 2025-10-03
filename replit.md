# ConcertCritic

## Overview

ConcertCritic is a social platform for live music enthusiasts to discover concerts, write reviews, and connect with fellow music lovers. The application combines concert discovery through the Ticketmaster API with a social review system, allowing users to find events, share experiences, and build a community around live music.

The platform features real-time concert search, multi-criteria rating systems for venues and performances, user profiles with music preferences, social following mechanics, and wishlist functionality. Users can write detailed reviews with photos, follow other reviewers, and discover concerts through both API integration and community recommendations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **Styling**: Tailwind CSS with custom design system inspired by music platforms (Spotify, Bandcamp)
- **Component Library**: Radix UI primitives with shadcn/ui components for consistent, accessible interface
- **Build Tool**: Vite with custom configuration for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for REST API endpoints
- **Database ORM**: Drizzle ORM for type-safe database operations and migrations
- **Session Management**: Express sessions with PostgreSQL storage for user authentication
- **File Structure**: Modular architecture separating routes, storage layer, and external service integrations
- **Error Handling**: Centralized error middleware with structured logging

### Authentication System
- **Provider**: Replit Authentication (mandatory for platform integration)
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Security**: HTTP-only cookies with secure flags and CSRF protection
- **User Management**: OAuth-based user creation and profile management

### Database Design
- **Primary Database**: PostgreSQL with connection pooling via Neon serverless
- **Schema Management**: Drizzle migrations with version control
- **Core Tables**: Users, concerts, reviews, wishlists, user follows, review likes, sessions
- **Indexing**: Strategic indexes on search fields (artist, venue, city) and foreign keys
- **Data Types**: JSON fields for flexible metadata storage (photos, genre arrays)

### External Service Integration
- **Concert Data**: Ticketmaster Discovery API for real-time event information
- **API Caching**: Memoized responses with TTL to optimize external API usage
- **Data Transformation**: Service layer converts external API responses to internal schema
- **Fallback Strategy**: Graceful degradation when external services are unavailable

### Design System
- **Color Palette**: Dark and light mode support with music-focused purple primary colors
- **Typography**: Inter and Poppins font families for readability and visual hierarchy
- **Component Variants**: Consistent spacing system using Tailwind utility classes
- **Responsive Design**: Mobile-first approach with breakpoint-specific layouts
- **Accessibility**: ARIA compliance through Radix UI primitives

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, TypeScript for frontend development
- **Routing & State**: Wouter for routing, TanStack React Query for server state
- **Backend Framework**: Express.js with middleware for CORS, sessions, and body parsing

### Database & ORM
- **Database**: PostgreSQL via Neon serverless platform
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **Connection**: `@neondatabase/serverless` driver with WebSocket support
- **Session Storage**: `connect-pg-simple` for PostgreSQL session management

### UI & Styling
- **Component Library**: Complete Radix UI primitive set (Dialog, Dropdown, etc.)
- **Styling**: Tailwind CSS with PostCSS processing
- **Design Tokens**: Custom CSS variables for theme consistency
- **Icons**: Lucide React for consistent iconography

### External APIs
- **Concert Data**: Ticketmaster Discovery API for event information
- **Authentication**: Replit OAuth system for user management
- **Image Hosting**: Prepared for Cloudinary integration (future enhancement)

### Development & Build Tools
- **Build System**: Vite with React plugin and runtime error handling
- **TypeScript**: Full type coverage with path aliases for clean imports
- **Code Quality**: ESBuild for production bundling
- **Development**: Hot module replacement and development server integration

### Validation & Forms
- **Schema Validation**: Zod schemas with Drizzle integration
- **Form Handling**: React Hook Form with Hookform resolvers
- **Error Handling**: Structured error responses with validation feedback