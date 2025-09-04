"use client";

import { useRouter } from "next/navigation";
import { Play, Sparkles, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdaptiveImage } from "@/components/ui/adaptive-image";
import { AdaptiveMotion } from "@/components/ui/adaptive-motion";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { usePerformanceMonitor } from "@/hooks/use-performance-monitor";
import { usePlayback } from "@/context/playback-context";
import { songs as demoSongs } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import { useMusicData } from "@/hooks/use-music-data";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useUserStats } from "@/hooks/use-user-stats";
import { useOnboardingGuard } from "@/hooks/use-onboarding";
import { useMemo, useEffect, useCallback, lazy, Suspense } from "react";
import type { VibelyTrack } from "@/lib/data";

// Temporarily disabled lazy loading to prevent import crashes
// TODO: Re-enable once components are fully implemented
const LazySpotifyAuth = () => (
  <div className="w-full rounded-3xl bg-white/8 backdrop-blur-xl border border-white/10 p-6 text-center">
    <div className="text-white/70 text-sm">Connect Music Service</div>
    <div className="text-white/50 text-xs mt-1">Integrations coming soon</div>
  </div>
);

const LazyProgressiveGrid = () => null;

type HeroProps = {
  nameTop: string;
  nameBottom: string;
  photoUrl: string;
  chips: string[];
};

function HeroCard({ nameTop, nameBottom, photoUrl, chips }: HeroProps) {
  const deviceProfile = useDevicePerformance();

  return (
    <AdaptiveMotion
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative h-[60vh] max-h-[600px] w-full rounded-[32px] overflow-hidden shadow-2xl"
      as="div"
    >
      {/* Neon gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(65%_80%_at_50%_0%,#CFFFD7_0%,#9FFFA2_30%,#B8FFCE_60%,#D8FFE8_100%)]" />

      {/* Name behind cut-out (two lines) */}
      <div className="absolute left-5 top-5 z-[1] select-none">
        <div
          className="text-black font-black leading-none tracking-tight"
          style={{ fontSize: deviceProfile.isLowEndDevice ? 48 : 56 }}
        >
          {nameTop}
        </div>
        <div
          className="text-black/45 font-black leading-none tracking-tight -mt-2"
          style={{ fontSize: deviceProfile.isLowEndDevice ? 48 : 56 }}
        >
          {nameBottom}
        </div>
      </div>

      {/* Portrait cut-out (on top of text) */}
      <div className="absolute inset-0 z-[2] flex items-end justify-center pb-8 pointer-events-none">
        <div className="relative w-[68%] max-w-[360px] aspect-[3/4] drop-shadow-2xl">
          <AdaptiveImage
            src={photoUrl}
            alt="User portrait"
            fill
            priority
            quality={85} // Reduce quality for faster loading
            sizes="(max-width: 768px) 68vw, 360px" // Add responsive sizes
            className="object-cover rounded-[28px] [box-shadow:0_30px_60px_rgba(0,0,0,.35)]"
            fallbackSrc="https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=840&auto=format&fit=crop"
            placeholder="blur" // Add blur placeholder
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
        </div>
      </div>

      {/* Right vertical pager */}
      <div className="absolute top-1/2 -translate-y-1/2 right-3 z-[3] flex flex-col items-center gap-2 text-black">
        <span className="text-sm font-semibold">01</span>
        <div className="h-24 w-[3px] rounded-full bg-black/30 overflow-hidden">
          <div className="h-1/4 w-full bg-black" />
        </div>
        <span className="text-sm font-semibold">04</span>
      </div>

      {/* Hashtag chips (bottom-left) */}
      <div className="absolute left-4 bottom-4 z-[4] grid grid-cols-2 gap-3 w-[70%] max-w-[420px]">
        {chips.map((chip, index) => (
          <AdaptiveMotion
            key={chip}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.1, duration: 0.3 }}
            className="px-4 py-2 rounded-full text-white text-[14px] font-semibold bg-white/18 backdrop-blur-md shadow-sm border border-white/25"
          >
            {chip}
          </AdaptiveMotion>
        ))}
      </div>
    </AdaptiveMotion>
  );
}

function TopSongCard() {
  const { playTrackAt } = usePlayback();
  const { tracks, isLoading, provider } = useMusicData();

  // Get the user's top song (first in the list since tracks are sorted by relevance)
  const topSong = tracks && tracks.length > 0 ? tracks[0] : null;

  // Use demo songs as fallback to prevent empty states
  const queue = useMemo(() => {
    const songsToUse = tracks.length > 0 ? tracks : demoSongs;
    return songsToUse.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      coverUrl: s.originalCoverUrl,
      available: true,
    }));
  }, [tracks]);

  const onPlay = useCallback(() => {
    if (topSong) {
      playTrackAt(0, queue);
    }
  }, [topSong, playTrackAt, queue]);

  return (
    <div className="w-full rounded-3xl bg-white/8 backdrop-blur-xl border border-white/10 p-4 flex items-center gap-4 shadow-[0_10px_40px_rgba(0,0,0,.35)]">
      <div className="relative h-[72px] w-[72px] rounded-[12px] overflow-hidden bg-white/10">
        {isLoading ? (
          <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 animate-pulse" />
        ) : topSong ? (
          <AdaptiveImage
            src={topSong.originalCoverUrl}
            alt={topSong.title}
            fill
            loading="lazy" // Use lazy loading for secondary images
            quality={75} // Reduce quality for album covers
            className="object-cover"
            fallbackSrc="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=400&auto=format&fit=crop"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#9FFFA2]/20 to-[#FF6F91]/20 flex items-center justify-center">
            <Music className="w-6 h-6 text-white/50" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[17px] font-bold truncate">
          {isLoading ? (
            <div className="h-5 bg-white/20 rounded animate-pulse w-32" />
          ) : topSong ? (
            topSong.title
          ) : (
            "Discover Music"
          )}
        </div>
        <div className="text-white/70 text-sm truncate">
          {isLoading ? (
            <div className="h-4 bg-white/10 rounded animate-pulse w-24 mt-1" />
          ) : topSong ? (
            topSong.artist
          ) : (
            "Connect your music to see your top tracks"
          )}
        </div>
        {!isLoading && topSong && (
          <div className="mt-1 text-xs text-white/60">
            Tempo {topSong.tempo || 120} • Energy {Math.round((topSong.energy || 0.7) * 100)}%
          </div>
        )}
      </div>
      <Button
        size="sm"
        onClick={onPlay}
        disabled={isLoading || !topSong}
        className="rounded-full bg-white text-black hover:bg-white/90 disabled:bg-white/50"
      >
        <Play className="h-4 w-4 mr-1" />
        {topSong ? "Play" : "Explore"}
      </Button>
    </div>
  );
}

function TopArtistCard() {
  const { tracks, provider, isLoading } = useMusicData();
  const router = useRouter();

  // Calculate top artist from user's tracks
  const topArtistData = useMemo(() => {
    if (!tracks || tracks.length === 0) {
      return {
        name: "Top Artist",
        playCount: 0,
        isTopListener: false,
        imageUrl:
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop",
      };
    }

    // Count artist occurrences and track additional metrics
    const artistCounts = new Map<
      string,
      {
        count: number;
        artist: string;
        imageUrl?: string;
        totalEnergy: number;
        genres: Set<string>;
      }
    >();

    tracks.forEach((track) => {
      const artistName = track.artist;
      const current = artistCounts.get(artistName) || {
        count: 0,
        artist: artistName,
        totalEnergy: 0,
        genres: new Set<string>(),
      };

      artistCounts.set(artistName, {
        ...current,
        count: current.count + 1,
        imageUrl: current.imageUrl || track.originalCoverUrl,
        totalEnergy: current.totalEnergy + (track.energy || 0.5),
        genres: track.genre ? current.genres.add(track.genre) : current.genres,
      });
    });

    // Get top artist
    const topArtist = Array.from(artistCounts.entries()).sort((a, b) => b[1].count - a[1].count)[0];

    if (!topArtist) {
      return {
        name: "Top Artist",
        playCount: 0,
        isTopListener: false,
        imageUrl:
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop",
      };
    }

    const [artistName, data] = topArtist;
    const playCount = data.count;
    const avgEnergy = data.totalEnergy / playCount;

    // Calculate if user is a "top listener" based on multiple factors
    const totalTracks = tracks.length;
    const artistPercentage = (playCount / totalTracks) * 100;
    const isTopListener = playCount >= 3 && artistPercentage >= 20; // At least 3 songs and 20% of library

    // Calculate listening tier based on play count relative to total library
    let listenerTier = "Fan";
    if (artistPercentage >= 40) listenerTier = "Top 1%";
    else if (artistPercentage >= 30) listenerTier = "Top 5%";
    else if (artistPercentage >= 20) listenerTier = "Top 10%";

    return {
      name: artistName,
      playCount,
      isTopListener,
      listenerTier,
      avgEnergy,
      genres: Array.from(data.genres),
      imageUrl:
        data.imageUrl ||
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop",
    };
  }, [tracks]);

  const handleGenerateCovers = () => {
    // Navigate to generator page with artist context
    const params = new URLSearchParams({
      artist: topArtistData.name,
      genre: topArtistData.genres?.[0] || "",
      source: "home_top_artist",
    });
    router.push(`/generator?${params.toString()}`);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-white/8 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,.35)]">
      <div className="absolute inset-0">
        <div className="relative w-full h-full">
          <AdaptiveImage
            src={topArtistData.imageUrl}
            alt={topArtistData.name}
            fill
            className="object-cover"
            fallbackSrc="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        </div>
      </div>
      <div className="relative z-[2] p-5 flex items-end justify-between gap-4">
        <div>
          {topArtistData.isTopListener ? (
            <Badge className="bg-[#9FFFA2] text-black font-bold">
              {topArtistData.listenerTier} listener
            </Badge>
          ) : (
            <Badge className="bg-white/20 text-white font-bold border-white/30">
              {topArtistData.playCount} song{topArtistData.playCount !== 1 ? "s" : ""}
            </Badge>
          )}
          <div className="mt-2 text-lg font-semibold truncate">{topArtistData.name}</div>
          {provider && (
            <div className="text-white/70 text-sm capitalize">
              From {provider.replace("-", " ")}
              {topArtistData.genres && topArtistData.genres.length > 0 && (
                <span className="ml-2">• {topArtistData.genres[0]}</span>
              )}
            </div>
          )}
        </div>
        <Button
          className="rounded-full bg-white text-black hover:bg-white/90"
          onClick={handleGenerateCovers}
          disabled={isLoading}
        >
          Generate Covers
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { tracks, provider, isLoading } = useMusicData();
  const { stats, updateFavoriteGenres } = useUserStats();
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboardingGuard(false); // Disable auto-redirect for development
  const performanceMonitor = usePerformanceMonitor("HomePage");

  // Debug logging for troubleshooting
  console.log("📊 Home page state:", {
    user: user?.displayName || "No user",
    tracksLength: tracks?.length || 0,
    provider,
    isLoading,
    onboardingComplete: isOnboardingComplete,
    onboardingLoading,
  });



  // Always call useMemo to maintain consistent hook order
  const displayName = user?.displayName || "Music Lover";
  const [first, ...rest] = displayName.split(" ");
  const last = rest.join(" ") || "";
  const photo =
    user?.photoURL ||
    "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=840&auto=format&fit=crop";

  const chips = useMemo(() => {
    return generateHeroChips(tracks || []);
  }, [tracks]);

  // Update favorite genres when tracks change
  useEffect(() => {
    if (tracks && tracks.length > 0) {
      const genres = tracks
        .map((t) => t.genre)
        .filter(Boolean)
        .slice(0, 3) as string[];
      if (genres.length > 0) {
        updateFavoriteGenres(genres);
      }
    }
  }, [tracks, updateFavoriteGenres]);

  // Show skeleton instead of loading spinner for better perceived performance
  // Move this check after all hooks are defined
  if (isLoading && tracks.length === 0) {
    return <PageSkeleton />;
  }

  // Show loading state while checking onboarding
  // Move this check after all hooks are defined
  if (onboardingLoading) {
    console.log("⏳ Onboarding still loading...");
    return (
      <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#9FFFA2]/20 border-t-[#9FFFA2] rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-lg font-semibold">Setting up your vibe...</div>
          <div className="text-white/60 text-sm mt-2">This shouldn&apos;t take long</div>
        </div>
      </div>
    );
  }

  // Don't render main content if onboarding is incomplete (guard will redirect) - disabled for development
  // if (!isOnboardingComplete) {
  //   return (
  //     <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="text-white text-lg font-semibold">Redirecting to setup...</div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-[#0E0F12] text-white px-4 pt-6 pb-28 overflow-x-hidden">
      {/* Hero */}
      <HeroCard nameTop={first} nameBottom={last} photoUrl={photo} chips={chips} />

      {/* Content cards */}
      <div className="mt-5 space-y-4">
        <TopSongCard />
        <TopArtistCard />
      </div>

      {/* Optional Spotify connect prompt */}
      {!provider && (
        <div className="mt-6">
          <Suspense
            fallback={
              <div className="w-full rounded-3xl bg-white/8 backdrop-blur-xl border border-white/10 p-6 text-center">
                <div className="animate-pulse">
                  <div className="h-6 bg-white/20 rounded w-48 mx-auto mb-2"></div>
                  <div className="h-4 bg-white/10 rounded w-32 mx-auto"></div>
                </div>
              </div>
            }
          >
            <LazySpotifyAuth />
          </Suspense>
        </div>
      )}

      {/* Real user stats footer */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-3xl bg-gradient-to-br from-[#9FFFA2]/15 to-[#8FD3FF]/15 border border-white/10 p-5 text-center">
          <Sparkles className="w-6 h-6 mx-auto mb-1 text-[#9FFFA2]" />
          <div className="text-lg font-extrabold">{stats.coversCreated}</div>
          <div className="text-xs text-white/70">Covers Created</div>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-[#FF6F91]/15 to-[#FFD36E]/15 border border-white/10 p-5 text-center">
          <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-[#FF6F91]" />
          <div className="text-lg font-extrabold">{Math.round(stats.matchRate)}%</div>
          <div className="text-xs text-white/70">Match Rate</div>
        </div>
      </div>

      {/* Additional stats row when user has data */}
      {(stats.coversThisMonth > 0 || stats.streakDays > 1) && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-3xl bg-gradient-to-br from-[#8FD3FF]/15 to-[#9FFFA2]/15 border border-white/10 p-5 text-center">
            <div className="text-lg font-extrabold">{stats.coversThisMonth}</div>
            <div className="text-xs text-white/70">This Month</div>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-[#FFD36E]/15 to-[#FF6F91]/15 border border-white/10 p-5 text-center">
            <div className="text-lg font-extrabold">{stats.streakDays}</div>
            <div className="text-xs text-white/70">Day Streak</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Create 3-4 chips from the user's tracks using sophisticated analysis
function generateHeroChips(tracks: VibelyTrack[]): string[] {
  if (!tracks || tracks.length === 0) return ["#Indie", "#Chill", "#Workout", "#Roadtrip"]; // fallback

  const moods = new Map<string, number>();
  const genreCounts = new Map<string, number>();
  const energyLevels: number[] = [];
  const tempoRanges = new Map<string, number>();
  const timeBasedMoods = new Map<string, number>();

  tracks.forEach((track) => {
    // Count genres (convert to hashtag format)
    if (track.genre) {
      const genreTag = `#${track.genre.replace(/\s+/g, "")}`;
      genreCounts.set(genreTag, (genreCounts.get(genreTag) || 0) + 1);
    }

    // Count moods (convert to hashtag format)
    if (track.mood) {
      const moodTag = `#${track.mood.replace(/\s+/g, "")}`;
      moods.set(moodTag, (moods.get(moodTag) || 0) + 1);
    }

    // Analyze energy levels
    if (typeof track.energy === "number") {
      energyLevels.push(track.energy);
    }

    // Categorize by tempo
    if (track.tempo) {
      const tempo = parseInt(track.tempo.toString());
      let tempoCategory = "";
      if (tempo < 90) tempoCategory = "#Chill";
      else if (tempo < 120) tempoCategory = "#Mellow";
      else if (tempo < 140) tempoCategory = "#Upbeat";
      else tempoCategory = "#Energetic";

      tempoRanges.set(tempoCategory, (tempoRanges.get(tempoCategory) || 0) + 1);
    }
  });

  // Calculate average energy for activity suggestions
  const avgEnergy =
    energyLevels.length > 0
      ? energyLevels.reduce((sum, energy) => sum + energy, 0) / energyLevels.length
      : 0.5;

  // Generate activity-based hashtags
  if (avgEnergy > 0.7) {
    timeBasedMoods.set("#Workout", 3);
    timeBasedMoods.set("#Party", 2);
  } else if (avgEnergy > 0.4) {
    timeBasedMoods.set("#Roadtrip", 3);
    timeBasedMoods.set("#Focus", 2);
  } else {
    timeBasedMoods.set("#Study", 3);
    timeBasedMoods.set("#Relax", 2);
  }

  // Combine all hashtag sources
  const allTags = new Map<string, number>();

  // Add genre tags (weighted higher for uniqueness)
  genreCounts.forEach((count, tag) => {
    allTags.set(tag, count * 2);
  });

  // Add mood tags
  moods.forEach((count, tag) => {
    allTags.set(tag, (allTags.get(tag) || 0) + count);
  });

  // Add tempo-based tags
  tempoRanges.forEach((count, tag) => {
    allTags.set(tag, (allTags.get(tag) || 0) + count);
  });

  // Add activity tags (weighted lower)
  timeBasedMoods.forEach((count, tag) => {
    allTags.set(tag, (allTags.get(tag) || 0) + count * 0.5);
  });

  // Sort by frequency and select top 4
  const sortedTags = Array.from(allTags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag);

  // Ensure we have at least 4 hashtags
  const fallbackTags = ["#Vibes", "#Music", "#Mood", "#Creative"];
  while (sortedTags.length < 4) {
    const fallback = fallbackTags[sortedTags.length];
    if (!sortedTags.includes(fallback)) {
      sortedTags.push(fallback);
    }
  }

  return sortedTags;
}
