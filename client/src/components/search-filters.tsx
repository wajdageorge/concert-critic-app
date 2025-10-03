import { Search, Filter, MapPin, Calendar, CalendarDays, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

interface SearchFiltersProps {
  onSearch?: (query: string) => void;
  onLocationChange?: (location: string) => void;
  onGenreChange?: (genre: string) => void;
  onDateRange?: (dateRange: { startDate?: string; endDate?: string } | null) => void;
  onPriceRange?: (priceRange: [number, number]) => void;
}

export default function SearchFilters({
  onSearch,
  onLocationChange,
  onGenreChange,
  onDateRange,
  onPriceRange,
}: SearchFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Get today's date for disabling past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleSearch = () => {
    onSearch?.(searchQuery);
    console.log('Searching for:', searchQuery);
  };

  const handleLocationChange = (value: string) => {
    onLocationChange?.(value);
    console.log('Location changed to:', value);
  };

  const handleGenreChange = (value: string) => {
    onGenreChange?.(value);
    console.log('Genre changed to:', value);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    
    if (range) {
      const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');
      const startDate = range.from ? formatDate(range.from) : undefined;
      const endDate = range.to ? formatDate(range.to) : undefined;
      
      onDateRange?.({ startDate, endDate });
      console.log('Date range changed to:', { startDate, endDate });
    } else {
      onDateRange?.(null);
      console.log('Date range cleared');
    }
  };

  const clearDateRange = () => {
    setDateRange(undefined);
    onDateRange?.(null);
    setIsDatePickerOpen(false);
  };

  const getDateRangeDisplayText = () => {
    if (!dateRange?.from) return "Select dates";
    if (!dateRange.to) return format(dateRange.from, 'MMM d, yyyy');
    return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
  };

  const handlePriceRangeChange = (value: number[]) => {
    setPriceRange(value);
    onPriceRange?.([value[0], value[1]]);
    console.log('Price range changed to:', value);
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Main Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search artists, venues, or events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Button onClick={handleSearch} data-testid="button-search">
          Search
        </Button>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Select onValueChange={handleLocationChange}>
          <SelectTrigger className="w-[160px]" data-testid="select-location">
            <MapPin className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="los-angeles">Los Angeles, CA</SelectItem>
            <SelectItem value="new-york">New York, NY</SelectItem>
            <SelectItem value="chicago">Chicago, IL</SelectItem>
            <SelectItem value="austin">Austin, TX</SelectItem>
            <SelectItem value="seattle">Seattle, WA</SelectItem>
            <SelectItem value="denver">Denver, CO</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={handleGenreChange}>
          <SelectTrigger className="w-[140px]" data-testid="select-genre">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rock">Rock</SelectItem>
            <SelectItem value="pop">Pop</SelectItem>
            <SelectItem value="hip-hop">Hip Hop</SelectItem>
            <SelectItem value="electronic">Electronic</SelectItem>
            <SelectItem value="country">Country</SelectItem>
            <SelectItem value="indie">Indie</SelectItem>
            <SelectItem value="jazz">Jazz</SelectItem>
            <SelectItem value="classical">Classical</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`w-[200px] justify-start text-left font-normal ${
                !dateRange?.from && "text-muted-foreground"
              }`}
              data-testid="button-date-picker"
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              {getDateRangeDisplayText()}
              {dateRange?.from && (
                <X
                  className="ml-auto h-4 w-4 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearDateRange();
                  }}
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
              disabled={(date) => date < today}
              data-testid="calendar-date-range"
            />
            {dateRange?.from && (
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDateRange}
                  className="w-full"
                  data-testid="button-clear-dates"
                >
                  Clear dates
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="button-filters">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Price Range</Label>
                <div className="mt-2">
                  <Slider
                    value={priceRange}
                    onValueChange={handlePriceRangeChange}
                    max={200}
                    min={0}
                    step={5}
                    className="w-full"
                    data-testid="slider-price"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setPriceRange([0, 200]);
                    console.log('Filters cleared');
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setIsFiltersOpen(false);
                    console.log('Filters applied');
                  }}
                  data-testid="button-apply-filters"
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
