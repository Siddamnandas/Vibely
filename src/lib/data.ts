import { SpotifyTrack, SpotifyAudioFeatures } from "./spotify";

export interface VibelyTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  originalCoverUrl: string;
  mood: "Happy" | "Sad" | "Energetic" | "Chill" | "Calm" | "Confident";
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
    tempo: 95,
    energy: 0.4,
    available: true,
  },
  {
    id: "2",
    title: "Neon Rush",
    artist: "SynthWave Surfers",
    originalCoverUrl: "https://picsum.photos/seed/nr/500/500",
    mood: "Energetic",
    tempo: 128,
    energy: 0.8,
    available: true,
  },
  {
    id: "3",
    title: "Golden Hour",
    artist: "The Daydreamers",
    originalCoverUrl: "https://picsum.photos/seed/gh/500/500",
    mood: "Happy",
    tempo: 110,
    energy: 0.7,
    available: true,
  },
  {
    id: "4",
    title: "Fading Embers",
    artist: "Echoes in Rain",
    originalCoverUrl: "https://picsum.photos/seed/fe/500/500",
    mood: "Sad",
    tempo: 80,
    energy: 0.2,
    available: true,
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
  subscriptionTier: "Freemium", // or 'Premium'
  coversGeneratedThisMonth: 0,
};

// Helper functions for Spotify integration
export function convertSpotifyToVibelyTrack(
  spotifyTrack: SpotifyTrack,
  audioFeatures?: SpotifyAudioFeatures,
): VibelyTrack {
  const mood = audioFeatures ? getMoodFromAudioFeatures(audioFeatures) : "Chill";
  const tempo = audioFeatures?.tempo ? Math.round(audioFeatures.tempo) : 120;
  const energy = audioFeatures?.energy || 0.5;

  return {
    id: spotifyTrack.id,
    title: spotifyTrack.name,
    artist: spotifyTrack.artists.map((a) => a.name).join(", "),
    originalCoverUrl:
      spotifyTrack.album.images[0]?.url || "https://picsum.photos/seed/default/500/500",
    mood: mood as "Happy" | "Sad" | "Energetic" | "Chill",
    tempo,
    energy,
    spotifyData: spotifyTrack,
    audioFeatures,
  };
}

function getMoodFromAudioFeatures(features: SpotifyAudioFeatures): string {
  if (features.valence > 0.7 && features.energy > 0.6) return "Happy";
  if (features.valence < 0.4 && features.energy < 0.5) return "Sad";
  if (features.energy > 0.7 && features.danceability > 0.6) return "Energetic";
  return "Chill";
}
