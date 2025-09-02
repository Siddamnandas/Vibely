import { SpotifyTrack, SpotifyAudioFeatures } from "./spotify";
import { analyzeTrackMood, DetailedMood, MoodCategory, type AudioFeatures } from "./mood-analyzer";

export interface VibelyTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  originalCoverUrl: string;
  mood: MoodCategory;
  detailedMood?: DetailedMood;
  tempo: number;
  energy?: number;
  duration?: number;
  genre?: string;
  releaseDate?: string;
  trackNumber?: number;
  available?: boolean;
  audioFeatures?: {
    valence: number;
    energy: number;
    tempo: number;
    danceability: number;
    acousticness?: number;
    instrumentalness?: number;
    liveness?: number;
    speechiness?: number;
    loudness?: number;
    mode?: number;
  };
  spotifyData?: SpotifyTrack;
}

export const songs: VibelyTrack[] = [
  {
    id: "1",
    title: "Midnight Bloom",
    artist: "Luna Haze",
    originalCoverUrl: "https://picsum.photos/seed/mb/500/500",
    mood: "Chill",
    detailedMood: analyzeTrackMood({
      valence: 0.5,
      energy: 0.4,
      tempo: 95,
      danceability: 0.3,
      acousticness: 0.7,
      mode: 0,
    }),
    tempo: 95,
    energy: 0.4,
    available: true,
    audioFeatures: {
      valence: 0.5,
      energy: 0.4,
      tempo: 95,
      danceability: 0.3,
      acousticness: 0.7,
      mode: 0,
    },
  },
  {
    id: "2",
    title: "Neon Rush",
    artist: "SynthWave Surfers",
    originalCoverUrl: "https://picsum.photos/seed/nr/500/500",
    mood: "Energetic",
    detailedMood: analyzeTrackMood({
      valence: 0.8,
      energy: 0.9,
      tempo: 128,
      danceability: 0.8,
      acousticness: 0.1,
      mode: 1,
    }),
    tempo: 128,
    energy: 0.8,
    available: true,
    audioFeatures: {
      valence: 0.8,
      energy: 0.9,
      tempo: 128,
      danceability: 0.8,
      acousticness: 0.1,
      mode: 1,
    },
  },
  {
    id: "3",
    title: "Golden Hour",
    artist: "The Daydreamers",
    originalCoverUrl: "https://picsum.photos/seed/gh/500/500",
    mood: "Happy",
    detailedMood: analyzeTrackMood({
      valence: 0.85,
      energy: 0.7,
      tempo: 110,
      danceability: 0.6,
      acousticness: 0.4,
      mode: 1,
    }),
    tempo: 110,
    energy: 0.7,
    available: true,
    audioFeatures: {
      valence: 0.85,
      energy: 0.7,
      tempo: 110,
      danceability: 0.6,
      acousticness: 0.4,
      mode: 1,
    },
  },
  {
    id: "4",
    title: "Fading Embers",
    artist: "Echoes in Rain",
    originalCoverUrl: "https://picsum.photos/seed/fe/500/500",
    mood: "Sad",
    detailedMood: analyzeTrackMood({
      valence: 0.2,
      energy: 0.3,
      tempo: 80,
      danceability: 0.2,
      acousticness: 0.8,
      mode: 0,
    }),
    tempo: 80,
    energy: 0.2,
    available: true,
    audioFeatures: {
      valence: 0.2,
      energy: 0.3,
      tempo: 80,
      danceability: 0.2,
      acousticness: 0.8,
      mode: 0,
    },
  },
];

export const userPhotos = [
  { id: "p1", url: "https://picsum.photos/seed/user1/400/400" },
  { id: "p2", url: "https://picsum.photos/seed/user2/400/400" },
  { id: "p3", url: "https://picsum.photos/seed/user3/400/400" },
  { id: "p4", url: "https://picsum.photos/seed/user4/400/400" },
];

export const savedStories = [
  {
    id: "s1",
    title: "Midnight Bloom",
    artist: "Luna Haze",
    generatedCoverUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&h=890&q=80",
  },
  {
    id: "s2",
    title: "Neon Rush",
    artist: "SynthWave Surfers",
    generatedCoverUrl:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&h=890&q=80",
  },
  {
    id: "s3",
    title: "Golden Hour",
    artist: "The Daydreamers",
    generatedCoverUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&h=890&q=80",
  },
  {
    id: "s4",
    title: "Fading Embers",
    artist: "Echoes in Rain",
    generatedCoverUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&h=890&q=80",
  },
  {
    id: "s5",
    title: "Another Hit",
    artist: "DJ AI",
    generatedCoverUrl:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&h=890&q=80",
  },
  {
    id: "s6",
    title: "Summer Nights",
    artist: "Vibes",
    generatedCoverUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&h=890&q=80",
  },
];

export const user = {
  id: "user1",
  name: "Jane Doe",
  subscriptionTier: "Freemium" as "Freemium" | "Premium",
  coversGeneratedThisMonth: 0,
  maxCoversPerMonth: 3,
  profileImage:
    "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=400&auto=format&fit=crop",
  autoHashtags: ["#ChillVibes", "#MoodMusic", "#PersonalPlaylist", "#AIArt"],
  topGenres: ["Electronic", "Indie", "Alternative", "Ambient"],
  listeningStats: {
    totalMinutes: 2847,
    topArtist: "Luna Haze",
    topSong: "Midnight Bloom",
    averageSessionLength: 32,
  },
};

// Helper functions for mood analysis
export function getMoodDescription(track: VibelyTrack): string {
  if (track.detailedMood) {
    return `${track.detailedMood.primary} mood with ${track.detailedMood.emotions.slice(0, 2).join(", ")} feeling`;
  }
  return `${track.mood} mood`;
}

export function getMoodForPhotoSelection(track: VibelyTrack): string {
  if (track.detailedMood) {
    const { primary, emotions, descriptors, visualThemes } = track.detailedMood;
    return `${primary} mood - feels ${emotions.slice(0, 2).join(" and ")}, has a ${descriptors.slice(0, 2).join(", ")} quality. Visual themes: ${visualThemes.slice(0, 3).join(", ")}`;
  }
  return `${track.mood} mood with ${track.tempo > 120 ? "fast" : "slow"} tempo and ${track.energy && track.energy > 0.6 ? "high" : "low"} energy`;
}

// Helper functions for Spotify integration
export function convertSpotifyToVibelyTrack(
  spotifyTrack: SpotifyTrack,
  audioFeatures?: SpotifyAudioFeatures,
): VibelyTrack {
  const metadata = {
    title: spotifyTrack.name,
    artist: spotifyTrack.artists.map((a) => a.name).join(", "),
    genre: spotifyTrack.album.genres?.[0],
    releaseYear: spotifyTrack.album.release_date
      ? new Date(spotifyTrack.album.release_date).getFullYear()
      : undefined,
    popularity: spotifyTrack.popularity,
  };

  const mood = audioFeatures ? getMoodFromAudioFeatures(audioFeatures) : "Chill";
  const detailedMood = audioFeatures
    ? getDetailedMoodFromAudioFeatures(audioFeatures, metadata)
    : undefined;
  const tempo = audioFeatures?.tempo ? Math.round(audioFeatures.tempo) : 120;
  const energy = audioFeatures?.energy || 0.5;

  return {
    id: spotifyTrack.id,
    title: spotifyTrack.name,
    artist: spotifyTrack.artists.map((a) => a.name).join(", "),
    album: spotifyTrack.album.name,
    originalCoverUrl:
      spotifyTrack.album.images[0]?.url || "https://picsum.photos/seed/default/500/500",
    mood,
    detailedMood,
    tempo,
    energy,
    genre: metadata.genre,
    releaseDate: spotifyTrack.album.release_date,
    duration: spotifyTrack.duration_ms,
    spotifyData: spotifyTrack,
    audioFeatures: audioFeatures
      ? {
          valence: audioFeatures.valence,
          energy: audioFeatures.energy,
          tempo: audioFeatures.tempo,
          danceability: audioFeatures.danceability,
          acousticness: audioFeatures.acousticness,
          instrumentalness: audioFeatures.instrumentalness,
          liveness: audioFeatures.liveness,
          speechiness: audioFeatures.speechiness,
          loudness: audioFeatures.loudness,
          mode: audioFeatures.mode,
        }
      : undefined,
  };
}

function getMoodFromAudioFeatures(features: SpotifyAudioFeatures): MoodCategory {
  // Use the new advanced mood analyzer
  const detailedMood = analyzeTrackMood(features);
  return detailedMood.primary;
}

function getDetailedMoodFromAudioFeatures(
  features: SpotifyAudioFeatures,
  metadata?: { title: string; artist: string; genre?: string },
): DetailedMood {
  return analyzeTrackMood(features, metadata);
}
