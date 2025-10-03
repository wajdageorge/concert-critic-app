import ConcertCard from '../concert-card';

export default function ConcertCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <ConcertCard
        id="1"
        artist="The Midnight"
        venue="The Wiltern"
        date="Dec 15, 2024"
        time="8:00 PM"
        city="Los Angeles, CA"
        price="$45.00"
        genre="Synthwave"
        rating={4.8}
        isWishlisted={false}
      />
      <ConcertCard
        id="2"
        artist="Tame Impala"
        venue="Red Rocks Amphitheatre"
        date="Dec 20, 2024"
        time="7:30 PM"
        city="Morrison, CO"
        price="$89.50"
        genre="Psychedelic Rock"
        rating={4.9}
        isWishlisted={true}
      />
      <ConcertCard
        id="3"
        artist="Billie Eilish"
        venue="Madison Square Garden"
        date="Jan 5, 2025"
        time="8:00 PM"
        city="New York, NY"
        price="$125.00"
        genre="Pop"
        rating={4.7}
      />
    </div>
  );
}
