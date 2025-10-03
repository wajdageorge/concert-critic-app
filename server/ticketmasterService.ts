/**
 * Ticketmaster Discovery API service for fetching real-time concert data
 */

interface TicketmasterEvent {
  id: string;
  name: string;
  type: string;
  url: string;
  locale: string;
  images: Array<{
    ratio: string;
    url: string;
    width: number;
    height: number;
    fallback: boolean;
  }>;
  sales: {
    public: {
      startDateTime: string;
      startTBD: boolean;
      startTBA: boolean;
      endDateTime: string;
    };
  };
  dates: {
    start: {
      localDate: string;
      localTime: string;
      dateTime: string;
      dateTBD: boolean;
      dateTBA: boolean;
      timeTBA: boolean;
      noSpecificTime: boolean;
    };
    timezone: string;
    status: {
      code: string;
    };
  };
  classifications: Array<{
    primary: boolean;
    segment: {
      id: string;
      name: string;
    };
    genre: {
      id: string;
      name: string;
    };
    subGenre: {
      id: string;
      name: string;
    };
  }>;
  _embedded?: {
    venues?: Array<{
      id: string;
      name: string;
      type: string;
      locale: string;
      postalCode: string;
      timezone: string;
      city: {
        name: string;
      };
      state: {
        name: string;
        stateCode: string;
      };
      country: {
        name: string;
        countryCode: string;
      };
      address: {
        line1: string;
      };
      location: {
        longitude: string;
        latitude: string;
      };
    }>;
    attractions?: Array<{
      id: string;
      name: string;
      type: string;
      locale: string;
      images: Array<{
        ratio: string;
        url: string;
        width: number;
        height: number;
        fallback: boolean;
      }>;
      classifications: Array<{
        primary: boolean;
        segment: {
          id: string;
          name: string;
        };
        genre: {
          id: string;
          name: string;
        };
        subGenre: {
          id: string;
          name: string;
        };
      }>;
    }>;
  };
  priceRanges?: Array<{
    type: string;
    currency: string;
    min: number;
    max: number;
  }>;
}

interface TicketmasterResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export interface TicketmasterSearchOptions {
  keyword?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  classificationName?: string; // genre
  size?: number;
  page?: number;
  sort?: string;
  startDateTime?: string;
  endDateTime?: string;
  radius?: number;
  unit?: 'miles' | 'km';
}

export class TicketmasterService {
  private readonly baseUrl = 'https://app.ticketmaster.com/discovery/v2';
  private readonly consumerKey: string;

  constructor() {
    this.consumerKey = process.env.TICKETMASTER_CONSUMER_KEY || '';
  }

  /**
   * Search for music events using Ticketmaster Discovery API
   */
  async searchEvents(options: TicketmasterSearchOptions = {}): Promise<TicketmasterEvent[]> {
    try {
      // Check if API key is available
      if (!this.consumerKey) {
        console.warn('Ticketmaster API key not configured - returning empty results');
        return [];
      }

      const params = new URLSearchParams({
        apikey: this.consumerKey,
        classificationName: 'music', // Only music events
        size: String(options.size || 50),
        page: String(options.page || 0),
        sort: options.sort || 'date,asc',
      });

      // Add optional parameters
      if (options.keyword) params.append('keyword', options.keyword);
      if (options.city) params.append('city', options.city);
      if (options.stateCode) params.append('stateCode', options.stateCode);
      if (options.countryCode) params.append('countryCode', options.countryCode);
      if (options.classificationName) params.append('classificationName', options.classificationName);
      if (options.startDateTime) params.append('startDateTime', options.startDateTime);
      if (options.endDateTime) params.append('endDateTime', options.endDateTime);
      if (options.radius) params.append('radius', String(options.radius));
      if (options.unit) params.append('unit', options.unit);

      const url = `${this.baseUrl}/events.json?${params.toString()}`;
      console.log('Fetching from Ticketmaster:', url.replace(this.consumerKey, '[API_KEY]'));

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
      }

      const data: TicketmasterResponse = await response.json();
      return data._embedded?.events || [];
    } catch (error) {
      console.error('Error fetching from Ticketmaster API:', error);
      throw error;
    }
  }

  /**
   * Get event details by ID
   */
  async getEvent(eventId: string): Promise<TicketmasterEvent | null> {
    try {
      const params = new URLSearchParams({
        apikey: this.consumerKey,
      });

      const url = `${this.baseUrl}/events/${eventId}.json?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching event from Ticketmaster API:', error);
      throw error;
    }
  }

  /**
   * Transform Ticketmaster event to our Concert format
   */
  transformEvent(event: TicketmasterEvent): any {
    const venue = event._embedded?.venues?.[0];
    const attraction = event._embedded?.attractions?.[0];
    const priceRange = event.priceRanges?.[0];
    const classification = event.classifications?.[0] || attraction?.classifications?.[0];
    
    // Get the best image (prefer 16:9 ratio, fallback to largest)
    const getBestImage = (images: Array<any> | undefined) => {
      if (!images || images.length === 0) return null;
      
      // Try to find 16:9 ratio image
      const ratio16x9 = images.find(img => img.ratio === '16_9');
      if (ratio16x9) return ratio16x9.url;
      
      // Fall back to largest image
      const sortedBySize = images.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      return sortedBySize[0]?.url || null;
    };

    const imageUrl = getBestImage(event.images) || getBestImage(attraction?.images);

    return {
      // Use Ticketmaster ID with a prefix to avoid conflicts
      id: `tm_${event.id}`,
      artist: attraction?.name || event.name,
      venue: venue?.name || 'TBA',
      city: venue ? `${venue.city.name}, ${venue.state?.stateCode || venue.country.countryCode}` : 'TBA',
      date: event.dates.start.localDate,
      time: event.dates.start.localTime || 'TBA',
      price: priceRange ? `$${priceRange.min}-$${priceRange.max}` : 'TBA',
      genre: classification?.genre?.name || classification?.subGenre?.name || 'Music',
      imageUrl,
      ticketUrl: event.url,
      description: `${attraction?.name || event.name} at ${venue?.name || 'TBA'}${venue?.city ? ` in ${venue.city.name}` : ''}`,
      // Additional metadata
      ticketmasterId: event.id,
      venueId: venue?.id,
      attractionId: attraction?.id,
      eventStatus: event.dates.status.code,
      timezone: event.dates.timezone,
    };
  }
}

export const ticketmasterService = new TicketmasterService();