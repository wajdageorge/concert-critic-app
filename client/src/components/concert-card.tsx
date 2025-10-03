import { Calendar, MapPin, Star, Heart, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface ConcertCardProps {
  id: string;
  artist: string;
  venue: string;
  date: string;
  time: string;
  city: string;
  price: string;
  genre?: string;
  imageUrl?: string;
  rating?: number;
  isWishlisted?: boolean;
  ticketUrl?: string;
}

export default function ConcertCard({
  id,
  artist,
  venue,
  date,
  time,
  city,
  price,
  genre,
  imageUrl,
  rating,
  isWishlisted = false,
  ticketUrl,
}: ConcertCardProps) {
  const [wishlistState, setWishlistState] = useState(isWishlisted);

  const handleWishlistToggle = () => {
    setWishlistState(!wishlistState);
    console.log(`${wishlistState ? 'Removed from' : 'Added to'} wishlist: ${artist}`);
  };

  const handleCardClick = () => {
    console.log(`Viewing concert details: ${id}`);
  };

  const handleTicketClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ticketUrl) {
      window.open(ticketUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.log(`No ticket URL available for: ${artist}`);
    }
  };

  return (
    <Card 
      className="group hover-elevate overflow-hidden cursor-pointer" 
      onClick={handleCardClick}
      data-testid={`card-concert-${id}`}
    >
      <div className="relative">
        <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={artist}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-4xl font-bold text-primary/60">
              {artist.charAt(0)}
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-background/20 backdrop-blur-sm hover:bg-background/40"
          onClick={(e) => {
            e.stopPropagation();
            handleWishlistToggle();
          }}
          data-testid={`button-wishlist-${id}`}
        >
          <Heart className={`h-4 w-4 ${wishlistState ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </Button>

        {genre && (
          <Badge className="absolute top-2 left-2" variant="secondary">
            {genre}
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors" data-testid={`text-artist-${id}`}>
              {artist}
            </h3>
            <p className="text-muted-foreground text-sm" data-testid={`text-venue-${id}`}>
              {venue}
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{city}</span>
            </div>
          </div>

          {rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-lg font-semibold">{price}</span>
              <span className="text-sm text-muted-foreground ml-1">• {time}</span>
            </div>
            <Button 
              size="sm" 
              onClick={handleTicketClick}
              disabled={!ticketUrl}
              data-testid={`button-tickets-${id}`}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Tickets
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
