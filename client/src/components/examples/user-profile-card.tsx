import UserProfileCard from '../user-profile-card';

export default function UserProfileCardExample() {
  return (
    <div className="flex flex-wrap gap-4 p-4">
      {/* Current User */}
      <UserProfileCard
        user={{
          id: "1",
          name: "Sarah Johnson",
          username: "sarahj_music",
          bio: "Live music enthusiast from LA. Always searching for the next great show! 🎵",
          avatar: undefined,
          location: "Los Angeles, CA",
          joinedDate: "Oct 2023",
          isVerified: true,
          isPrivate: false
        }}
        stats={{
          concertsAttended: 127,
          reviewsWritten: 89,
          followers: 1543,
          following: 892,
          averageRating: 4.3
        }}
        favoriteGenres={["Indie Rock", "Electronic", "Synthwave", "Jazz", "Folk"]}
        isFollowing={false}
        isCurrentUser={true}
      />
      
      {/* Other User */}
      <UserProfileCard
        user={{
          id: "2",
          name: "Mike Chen",
          username: "mikethebeat",
          bio: "Red Rocks is my second home. EDM and rock are life!",
          avatar: undefined,
          location: "Denver, CO",
          joinedDate: "Jan 2024",
          isVerified: false,
          isPrivate: false
        }}
        stats={{
          concertsAttended: 78,
          reviewsWritten: 52,
          followers: 892,
          following: 234,
          averageRating: 4.1
        }}
        favoriteGenres={["EDM", "Rock", "Dubstep"]}
        isFollowing={false}
        isCurrentUser={false}
      />
      
      {/* Private User */}
      <UserProfileCard
        user={{
          id: "3",
          name: "Emma Wilson",
          username: "emmaw_private",
          bio: "Music lover seeking authentic experiences.",
          avatar: undefined,
          location: "Seattle, WA",
          joinedDate: "Mar 2024",
          isVerified: false,
          isPrivate: true
        }}
        stats={{
          concertsAttended: 45,
          reviewsWritten: 23,
          followers: 156,
          following: 98
        }}
        favoriteGenres={["Indie", "Alternative"]}
        isFollowing={true}
        isCurrentUser={false}
      />
    </div>
  );
}
