/**
 * Setlist.fm API service for fetching historical concert data
 */

interface SetlistFmArtist {
  mbid: string;
  name: string;
  sortName: string;
  disambiguation?: string;
  url: string;
}

interface SetlistFmCity {
  id: string;
  name: string;
  state?: string;
  stateCode?: string;
  coords?: {
    lat: number;
    long: number;
  };
  country: {
    code: string;
    name: string;
  };
}

interface SetlistFmVenue {
  id: string;
  name: string;
  city: SetlistFmCity;
  url: string;
}

interface SetlistFmSong {
  name: string;
  cover?: {
    mbid: string;
    name: string;
    sortName: string;
    url: string;
  };
  info?: string;
  tape?: boolean;
}

interface SetlistFmSet {
  song: SetlistFmSong[];
  encore?: number;
}

interface SetlistFmSetlist {
  id: string;
  versionId: string;
  eventDate: string; // DD-MM-YYYY format
  lastUpdated: string;
  artist: SetlistFmArtist;
  venue: SetlistFmVenue;
  sets?: {
    set: SetlistFmSet[];
  };
  tour?: {
    name: string;
  };
  info?: string;
  url: string;
}

interface SetlistFmSearchResponse {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  setlist: SetlistFmSetlist[];
}

interface SetlistFmArtistSearchResponse {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  artist: SetlistFmArtist[];
}

interface SetlistFmVenueSearchResponse {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  venue: SetlistFmVenue[];
}

export interface SetlistFmSearchOptions {
  artistName?: string;
  artistMbid?: string;
  cityName?: string;
  countryCode?: string;
  date?: string; // DD-MM-YYYY format
  venueName?: string;
  venueId?: string;
  year?: string;
  state?: string;
  tourName?: string;
  p?: number; // page number, starts at 1
}

export class SetlistFmService {
  private readonly baseUrl = 'https://api.setlist.fm/rest/1.0';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.SETLIST_FM_API_KEY || '';
  }

  /**
   * Search for setlists using Setlist.fm API
   */
  async searchSetlists(options: SetlistFmSearchOptions = {}): Promise<SetlistFmSetlist[]> {
    try {
      // Check if API key is available
      if (!this.apiKey) {
        console.warn('Setlist.fm API key not configured - returning empty results');
        return [];
      }

      const params = new URLSearchParams();
      
      // Add search parameters
      if (options.artistName) params.append('artistName', options.artistName);
      if (options.artistMbid) params.append('artistMbid', options.artistMbid);
      if (options.cityName) params.append('cityName', options.cityName);
      if (options.countryCode) params.append('countryCode', options.countryCode);
      if (options.date) params.append('date', options.date);
      if (options.venueName) params.append('venueName', options.venueName);
      if (options.venueId) params.append('venueId', options.venueId);
      if (options.year) params.append('year', options.year);
      if (options.state) params.append('state', options.state);
      if (options.tourName) params.append('tourName', options.tourName);
      if (options.p) params.append('p', String(options.p));

      const url = `${this.baseUrl}/search/setlists?${params.toString()}`;
      console.log('Fetching from Setlist.fm:', url.replace(this.apiKey, '[API_KEY]'));

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'x-api-key': this.apiKey,
          'User-Agent': 'ConcertCritic/1.0'
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No results found
        }
        throw new Error(`Setlist.fm API error: ${response.status} ${response.statusText}`);
      }

      const data: SetlistFmSearchResponse = await response.json();
      return data.setlist || [];
    } catch (error) {
      console.error('Error fetching from Setlist.fm API:', error);
      // Return empty array instead of throwing to avoid breaking the combined search
      return [];
    }
  }

  /**
   * Search for artists using Setlist.fm API
   */
  async searchArtists(artistName: string, page = 1): Promise<SetlistFmArtist[]> {
    try {
      if (!this.apiKey) {
        console.warn('Setlist.fm API key not configured - returning empty results');
        return [];
      }

      const params = new URLSearchParams({
        artistName,
        p: String(page),
        sort: 'relevance'
      });

      const url = `${this.baseUrl}/search/artists?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'x-api-key': this.apiKey,
          'User-Agent': 'ConcertCritic/1.0'
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Setlist.fm API error: ${response.status} ${response.statusText}`);
      }

      const data: SetlistFmArtistSearchResponse = await response.json();
      return data.artist || [];
    } catch (error) {
      console.error('Error searching artists on Setlist.fm:', error);
      return [];
    }
  }

  /**
   * Search for venues using Setlist.fm API
   */
  async searchVenues(venueName: string, page = 1): Promise<SetlistFmVenue[]> {
    try {
      if (!this.apiKey) {
        console.warn('Setlist.fm API key not configured - returning empty results');
        return [];
      }

      const params = new URLSearchParams({
        name: venueName,
        p: String(page)
      });

      const url = `${this.baseUrl}/search/venues?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'x-api-key': this.apiKey,
          'User-Agent': 'ConcertCritic/1.0'
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Setlist.fm API error: ${response.status} ${response.statusText}`);
      }

      const data: SetlistFmVenueSearchResponse = await response.json();
      return data.venue || [];
    } catch (error) {
      console.error('Error searching venues on Setlist.fm:', error);
      return [];
    }
  }

  /**
   * Get setlists for a specific artist by MBID
   */
  async getArtistSetlists(artistMbid: string, page = 1): Promise<SetlistFmSetlist[]> {
    try {
      if (!this.apiKey) {
        console.warn('Setlist.fm API key not configured - returning empty results');
        return [];
      }

      const params = new URLSearchParams({
        p: String(page)
      });

      const url = `${this.baseUrl}/artist/${artistMbid}/setlists?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'x-api-key': this.apiKey,
          'User-Agent': 'ConcertCritic/1.0'
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Setlist.fm API error: ${response.status} ${response.statusText}`);
      }

      const data: SetlistFmSearchResponse = await response.json();
      return data.setlist || [];
    } catch (error) {
      console.error('Error fetching artist setlists from Setlist.fm:', error);
      return [];
    }
  }

  /**
   * Convert Setlist.fm date format (DD-MM-YYYY) to ISO format (YYYY-MM-DD)
   */
  private convertDateFormat(setlistDate: string): string {
    try {
      const [day, month, year] = setlistDate.split('-');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch (error) {
      console.warn('Invalid date format from Setlist.fm:', setlistDate);
      return setlistDate; // Return as-is if parsing fails
    }
  }

  /**
   * Extract setlist songs as a simple array of song names
   */
  private extractSetlist(setlist: SetlistFmSetlist): string[] {
    if (!setlist.sets?.set) return [];
    
    const songs: string[] = [];
    setlist.sets.set.forEach(set => {
      if (set.song) {
        set.song.forEach(song => {
          if (song.name) {
            songs.push(song.name);
          }
        });
      }
    });
    
    return songs;
  }

  /**
   * Transform Setlist.fm setlist to our Concert format
   */
  transformSetlist(setlist: SetlistFmSetlist): any {
    const venue = setlist.venue;
    const city = venue.city;
    const setlistSongs = this.extractSetlist(setlist);
    
    // Convert date from DD-MM-YYYY to YYYY-MM-DD
    const isoDate = this.convertDateFormat(setlist.eventDate);
    
    // Build city string with state/country info
    let cityString = city.name;
    if (city.stateCode) {
      cityString += `, ${city.stateCode}`;
    } else if (city.state) {
      cityString += `, ${city.state}`;
    }
    if (city.country?.code && city.country.code !== 'US') {
      cityString += `, ${city.country.code}`;
    }

    // Create description with setlist info
    let description = `${setlist.artist.name} performed at ${venue.name} in ${cityString}`;
    if (setlist.tour?.name) {
      description += ` (${setlist.tour.name})`;
    }
    if (setlistSongs.length > 0) {
      description += `. Setlist included ${setlistSongs.length} songs.`;
    }

    return {
      // Use Setlist.fm ID with a prefix to avoid conflicts
      id: `setlistfm_${setlist.id}`,
      artist: setlist.artist.name,
      venue: venue.name,
      city: cityString,
      date: isoDate,
      time: 'Historical', // Setlist.fm doesn't provide specific times
      price: 'Historical', // Historical concerts don't have current pricing
      genre: 'Music', // Setlist.fm doesn't categorize by genre
      imageUrl: null, // Setlist.fm doesn't provide images
      ticketUrl: setlist.url, // Link to setlist.fm page
      description,
      // Additional metadata specific to Setlist.fm
      setlistFmId: setlist.id,
      setlistFmUrl: setlist.url,
      artistMbid: setlist.artist.mbid,
      venueId: venue.id,
      setlist: setlistSongs,
      isHistorical: true,
      lastUpdated: setlist.lastUpdated,
      ...(setlist.tour?.name && { tourName: setlist.tour.name }),
      ...(setlist.info && { concertInfo: setlist.info }),
    };
  }

  /**
   * Comprehensive search method that combines multiple search strategies
   */
  async searchHistoricalConcerts(options: {
    search?: string;
    artist?: string;
    venue?: string;
    city?: string;
    year?: string;
    limit?: number;
    page?: number;
  } = {}): Promise<any[]> {
    const { search, artist, venue, city, year, limit = 20, page = 1 } = options;
    
    try {
      let searchOptions: SetlistFmSearchOptions = { p: page };
      
      // If there's a general search term, try to parse it intelligently
      if (search) {
        // Simple heuristics to determine what the search term might be
        searchOptions.artistName = search;
        
        // Also try venue search if no specific artist is provided
        if (!artist) {
          // We'll run multiple searches and combine results
        }
      }
      
      // Add specific parameters
      if (artist) searchOptions.artistName = artist;
      if (venue) searchOptions.venueName = venue;
      if (city) searchOptions.cityName = city;
      if (year) searchOptions.year = year;

      // Search for setlists
      const setlists = await this.searchSetlists(searchOptions);
      
      // Transform to our format
      const concerts = setlists.map(setlist => this.transformSetlist(setlist));
      
      // Apply limit
      return concerts.slice(0, limit);
    } catch (error) {
      console.error('Error searching historical concerts:', error);
      return [];
    }
  }
}

export const setlistFmService = new SetlistFmService();