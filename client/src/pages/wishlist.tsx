import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ConcertCard from '@/components/concert-card';
import { Heart, Search, Filter, Calendar, MapPin } from 'lucide-react';

interface ConcertWithRating {
  id: string;
  artist: string;
  venue: string;
  date: string;
  city: string;
  genre?: string;
  price?: number;
  imageUrl?: string;
  averageRating?: number;
}

// Transform function to match ConcertCard props
const transformConcertForCard = (concert: ConcertWithRating) => ({
  id: concert.id,
  artist: concert.artist,
  venue: concert.venue,
  date: concert.date,
  time: "8:00 PM", // Default time since API doesn't provide
  city: concert.city,
  price: concert.price ? `$${concert.price}` : "Price TBA",
  genre: concert.genre || undefined,
  imageUrl: concert.imageUrl || undefined,
  rating: concert.averageRating,
  isWishlisted: true // Items from wishlist API are wishlisted by definition
});

export default function Wishlist() {
  const [searchQuery, setSearchQuery] = useState('');

  // Get user's wishlist
  const { data: wishlistConcerts = [], isLoading, error } = useQuery<ConcertWithRating[]>({
    queryKey: ['/api/users/me/wishlist'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/wishlist');
      if (!response.ok) throw new Error('Failed to fetch wishlist');
      return response.json();
    },
  });

  // Filter concerts based on search query
  const filteredConcerts = wishlistConcerts.filter(concert =>
    concert.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    concert.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
    concert.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (concert.genre && concert.genre.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleRemoveFromWishlist = (concertId: string) => {
    console.log('Remove from wishlist:', concertId);
    // TODO: Implement remove from wishlist API call
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="heading-wishlist">My Wishlist</h1>
        </div>
        <p className="text-muted-foreground">
          {wishlistConcerts.length} saved concert{wishlistConcerts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search your saved concerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-wishlist"
          />
        </div>
        <Button variant="outline" data-testid="button-filter-wishlist">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Content */}
      {error ? (
        <div className="text-center py-12">
          <Heart className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-destructive">Failed to load wishlist</h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading your saved concerts. Please try again.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-retry-wishlist">
            Retry
          </Button>
        </div>
      ) : filteredConcerts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConcerts.map((concert) => (
            <ConcertCard key={concert.id} {...transformConcertForCard(concert)} />
          ))}
        </div>
      ) : wishlistConcerts.length > 0 ? (
        <div className="text-center py-12">
          <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No concerts found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search to find saved concerts
          </p>
          <Button variant="outline" onClick={() => setSearchQuery('')} data-testid="button-clear-search">
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="text-center py-12">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No concerts saved</h3>
          <p className="text-muted-foreground mb-4">
            Save concerts you're interested in to build your wishlist
          </p>
          <Button data-testid="button-discover-concerts">
            <Calendar className="h-4 w-4 mr-2" />
            Discover Concerts
          </Button>
        </div>
      )}
    </div>
  );
}