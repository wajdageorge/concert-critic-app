import SearchFilters from '../search-filters';

export default function SearchFiltersExample() {
  return (
    <div className="p-4">
      <SearchFilters
        onSearch={(query) => console.log('Search:', query)}
        onLocationChange={(location) => console.log('Location:', location)}
        onGenreChange={(genre) => console.log('Genre:', genre)}
        onDateRange={(dateRange) => console.log('Date Range:', dateRange)}
        onPriceRange={(priceRange) => console.log('Price Range:', priceRange)}
      />
    </div>
  );
}
