# ConcertCritic Design Guidelines

## Design Approach: Reference-Based (Music Platform Inspiration)
Drawing inspiration from Spotify, Bandcamp, and Apple Music for their sophisticated music-focused aesthetics, combined with social platform patterns from Instagram for the review and discovery experience.

## Core Design Elements

### Color Palette
**Dark Mode Primary:**
- Background: 15 8% 8% (deep charcoal)
- Surface: 15 6% 12% (elevated charcoal)
- Primary: 206 100% 75% (vibrant carolina blue - concert stage lighting)
- Text: 0 0% 95% (near white)
- Muted text: 0 0% 65% (medium gray)

**Light Mode Primary:**
- Background: 0 0% 98% (off-white)
- Surface: 0 0% 100% (pure white)
- Primary: 206 100% 65% (deeper carolina blue)
- Text: 0 0% 10% (near black)
- Muted text: 0 0% 45% (medium gray)

**Accent Colors:**
- Success: 142 76% 36% (forest green for positive reviews)
- Warning: 45 93% 47% (amber for moderate ratings)
- Error: 0 72% 51% (red for negative feedback)

### Typography
- **Primary:** Inter (Google Fonts) - clean, modern readability
- **Display:** Poppins (Google Fonts) - bold headers and concert names
- **Mono:** JetBrains Mono - timestamps and metadata

### Layout System
Consistent Tailwind spacing using units: 2, 4, 6, 8, 12, 16
- Tight spacing: p-2, m-2 (8px)
- Standard spacing: p-4, m-4 (16px)
- Section spacing: p-8, m-8 (32px)
- Large spacing: p-16, m-16 (64px)

### Component Library

**Navigation:**
- Sticky top navigation with concert discovery, reviews, and profile tabs
- Bottom mobile navigation for key actions
- Sidebar for desktop with collapsible sections

**Forms:**
- Rounded input fields (rounded-lg) with subtle borders
- Multi-criteria rating sliders for venue reviews
- Star rating components for concerts
- Rich text editor for detailed reviews

**Data Displays:**
- Concert cards with gradient overlays on artist images
- Review cards with user avatars and rating displays
- Venue information panels with accessibility indicators
- Timeline views for concert history

**Social Features:**
- Follow/unfollow buttons with carolina blue accent
- User profile grids showing concert attendance
- Comment threads on reviews
- Like/dislike interactions with subtle animations

### Visual Treatments

**Gradients:**
- Hero sections: Subtle carolina blue to deep blue (206 100% 75% to 240 80% 30%)
- Concert cards: Dark overlay gradients for text readability
- Background accents: Vertical gradients in sidebar areas

**Content Strategy:**
- Concert discovery as primary focus with prominent search
- User-generated content (reviews) as secondary emphasis
- Social proof through follower counts and review metrics
- Venue accessibility information prominently displayed

### Images
**Concert/Artist Images:**
- Large hero images on individual concert pages with gradient overlays
- Card thumbnails in discovery grid (16:9 aspect ratio)
- User-uploaded review photos in gallery format
- Profile avatars (circular, consistent sizing)

**No large homepage hero image** - instead focus on dynamic concert discovery grid as the primary visual element.

### Accessibility & Interaction
- High contrast ratios maintained in both modes
- Keyboard navigation for all interactive elements
- Screen reader support for rating systems
- Consistent focus states with carolina blue accent rings
- Smooth transitions (duration-200) for state changes only

This design balances the energy of live music with the functionality needed for detailed reviews and social discovery.