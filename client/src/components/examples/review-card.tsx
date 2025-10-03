import ReviewCard from '../review-card';

export default function ReviewCardExample() {
  return (
    <div className="space-y-4 p-4 max-w-2xl">
      <ReviewCard
        id="1"
        user={{
          name: "Sarah Johnson",
          username: "sarahj_music",
          avatar: undefined
        }}
        concert={{
          artist: "The Midnight",
          venue: "The Wiltern",
          date: "Dec 15, 2024",
          city: "Los Angeles, CA"
        }}
        rating={{
          overall: 5,
          performance: 5,
          sound: 4,
          atmosphere: 5,
          value: 4
        }}
        reviewText="Absolutely incredible show! The Midnight delivered an unforgettable performance with their signature synthwave sound. The crowd was electric and the production value was top-notch. Would definitely see them again!"
        photos={[]}
        likes={42}
        comments={8}
        isLiked={false}
        postedAt="2 hours ago"
      />
      
      <ReviewCard
        id="2"
        user={{
          name: "Mike Chen",
          username: "mikethebeat",
          avatar: undefined
        }}
        concert={{
          artist: "Tame Impala",
          venue: "Red Rocks Amphitheatre",
          date: "Dec 20, 2024",
          city: "Morrison, CO"
        }}
        rating={{
          overall: 4,
          performance: 5,
          sound: 3,
          atmosphere: 5,
          value: 4
        }}
        reviewText="Red Rocks + Tame Impala = perfection. The natural acoustics of this venue combined with Kevin Parker's psychedelic masterpieces created pure magic. Only downside was some sound issues during the first few songs, but they sorted it out quickly."
        photos={[]}
        likes={156}
        comments={23}
        isLiked={true}
        postedAt="1 day ago"
      />
    </div>
  );
}
