import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import SearchFilters from '@/components/search-filters';
import ConcertCard from '@/components/concert-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Concert } from '@/../../shared/schema';

// Concert data with aggregated ratings and review counts
type ConcertWithExtras = Concert & {
  averageRating?: number;
  performanceRating?: number;
  soundRating?: number;
  venueRating?: number;
  valueRating?: number;
  reviewCount: number;
  isWishlisted?: boolean;
};

// Transform Concert data to ConcertCard props format
const transformConcertForCard = (concert: ConcertWithExtras) => ({
  ...concert,
  genre: concert.genre || undefined,
  imageUrl: concert.imageUrl || undefined,
  rating: concert.averageRating || undefined,
  ticketUrl: concert.ticketUrl || undefined,
});

const trendingGenres = ['Electronic', 'Indie Rock', 'Pop', 'Hip Hop', 'Jazz', 'Classical'];

export default function Discover() {
  const [searchParams, setSearchParams] = useState<{
    search?: string;
    genre?: string;
    city?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const [activeView, setActiveView] = useState<'grid' | 'list'>('grid');

  // Build query key with search parameters
  const buildQueryKey = () => {
    const params = new URLSearchParams({ includeTicketmaster: 'true' });
    if (searchParams.search) params.append('search', searchParams.search);
    if (searchParams.genre) params.append('genre', searchParams.genre);
    if (searchParams.city) params.append('city', searchParams.city);
    if (searchParams.startDate) params.append('startDate', searchParams.startDate);
    if (searchParams.endDate) params.append('endDate', searchParams.endDate);
    return `/api/concerts?${params.toString()}`;
  };

  // Fetch concerts from API (including Ticketmaster events)
  const { data: concerts = [], isLoading, error } = useQuery<ConcertWithExtras[]>({
    queryKey: [buildQueryKey()],
  });

  // Search functionality - now triggers API call
  const handleSearch = (query: string) => {
    setSearchParams(prev => ({ ...prev, search: query || undefined }));
    console.log('Searching for:', query);
  };

  const handleLocationChange = (location: string) => {
    setSearchParams(prev => ({ ...prev, city: location || undefined }));
    console.log('Filtering by location:', location);
  };

  const handleGenreFilter = (genre: string) => {
    setSearchParams(prev => ({ ...prev, genre: genre || undefined }));
    console.log('Filtering by genre:', genre);
  };

  const handleDateRangeChange = (dateRange: { startDate?: string; endDate?: string } | null) => {
    if (dateRange) {
      setSearchParams(prev => ({ 
        ...prev, 
        startDate: dateRange.startDate, 
        endDate: dateRange.endDate 
      }));
      console.log('Filtering by date range:', dateRange);
    } else {
      setSearchParams(prev => {
        const { startDate, endDate, ...rest } = prev;
        return rest;
      });
      console.log('Date range filter cleared');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Discover Concerts
        </h1>
        <p className="text-muted-foreground mt-1">
          Find your next live music experience
        </p>
      </div>

      {/* Search and Filters */}
      <SearchFilters
        onSearch={handleSearch}
        onLocationChange={handleLocationChange}
        onGenreChange={handleGenreFilter}
        onDateRange={handleDateRangeChange}
        onPriceRange={(range) => console.log('Price range:', range)}
      />

      {/* Trending Genres */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Trending Genres</h2>
        <div className="flex flex-wrap gap-2">
          {trendingGenres.map((genre) => (
            <Badge 
              key={genre} 
              variant="secondary" 
              className="cursor-pointer hover-elevate"
              onClick={() => handleGenreFilter(genre)}
              data-testid={`badge-genre-${genre.toLowerCase().replace(' ', '-')}`}
            >
              {genre}
            </Badge>
          ))}
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {concerts.length} concerts found
          </span>
        </div>
        
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'grid' | 'list')}>
          <TabsList>
            <TabsTrigger value="grid" data-testid="tab-grid-view">Grid</TabsTrigger>
            <TabsTrigger value="list" data-testid="tab-list-view">List</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Concert Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded-lg h-64"></div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Failed to load concerts. Please try again.</p>
        </div>
      ) : (
        <Tabs value={activeView} className="w-full">
          <TabsContent value="grid" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {concerts.map((concert) => (
                <ConcertCard key={concert.id} {...transformConcertForCard(concert)} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="list" className="mt-6">
            <div className="space-y-4">
              {concerts.map((concert) => (
                <div key={concert.id} className="w-full max-w-2xl">
                  <ConcertCard {...transformConcertForCard(concert)} />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Load More */}
      {concerts.length > 0 && (
        <div className="flex justify-center pt-8">
          <Button 
            variant="outline" 
            onClick={() => console.log('Loading more concerts...')}
            data-testid="button-load-more"
          >
            Load More Concerts
          </Button>
        </div>
      )}

      {/* Empty State */}
      {concerts.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No concerts found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search criteria or browse by genre
          </p>
          <Button 
            onClick={() => setSearchParams({})}
            data-testid="button-clear-filters"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
