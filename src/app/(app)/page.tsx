"use client";

import Image from "next/image";
import { Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlayback } from "@/context/playback-context";
import { songs as demoSongs } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import { useMusicData } from "@/hooks/use-music-data";
import { SpotifyAuth } from "@/components/spotify-auth";
import { useMemo } from "react";
import type { VibelyTrack } from "@/lib/data";

type HeroProps = {
  nameTop: string;
  nameBottom: string;
  photoUrl: string;
  chips: string[];
};

function HeroCard({ nameTop, nameBottom, photoUrl, chips }: HeroProps) {
  return (
    <div
      className="relative h-[60vh] max-h-[600px] w-full rounded-[32px] overflow-hidden shadow-2xl"
      aria-label="Hero"
    >
      {/* Neon gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(65%_80%_at_50%_0%,#CFFFD7_0%,#9FFFA2_30%,#B8FFCE_60%,#D8FFE8_100%)]" />

      {/* Name behind cut-out (two lines) */}
      <div className="absolute left-5 top-5 z-[1] select-none">
        <div className="text-black font-black leading-none tracking-tight" style={{ fontSize: 56 }}>
          {nameTop}
        </div>
        <div
          className="text-black/45 font-black leading-none tracking-tight -mt-2"
          style={{ fontSize: 56 }}
        >
          {nameBottom}
        </div>
      </div>

      {/* Portrait cut-out (on top of text) */}
      <div className="absolute inset-0 z-[2] flex items-end justify-center pb-8 pointer-events-none">
        <div className="relative w-[68%] max-w-[360px] aspect-[3/4] drop-shadow-2xl">
          <Image
            src={photoUrl}
            alt="User portrait"
            fill
            priority
            className="object-cover rounded-[28px] [box-shadow:0_30px_60px_rgba(0,0,0,.35)]"
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
        {chips.map((chip) => (
          <div
            key={chip}
            className="px-4 py-2 rounded-full text-white text-[14px] font-semibold bg-white/18 backdrop-blur-md shadow-sm border border-white/25"
          >
            {chip}
          </div>
        ))}
      </div>
    </div>
  );
}

function TopSongCard() {
  const { playTrackAt } = usePlayback();
  const { tracks, isLoading } = useMusicData();
  const visible = tracks && tracks.length > 0 ? tracks[0] : null;
  const queue = (tracks.length > 0 ? tracks : demoSongs).map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    coverUrl: s.originalCoverUrl,
    available: true,
  }));
  const onPlay = () => playTrackAt(0, queue);

  return (
    <div className="w-full rounded-3xl bg-white/8 backdrop-blur-xl border border-white/10 p-4 flex items-center gap-4 shadow-[0_10px_40px_rgba(0,0,0,.35)]">
      <div className="relative h-[72px] w-[72px] rounded-[12px] overflow-hidden bg-white/10">
        {visible ? (
          <Image src={visible.originalCoverUrl} alt={visible.title} fill className="object-cover" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[17px] font-bold truncate">
          {visible ? visible.title : "Midnight Drive"}
        </div>
        <div className="text-white/70 text-sm truncate">
          {visible ? visible.artist : "Luna Vox"}
        </div>
        <div className="mt-1 text-xs text-white/60">
          {visible
            ? `Tempo ${visible.tempo} • Energy ${visible.energy ?? 0.7}`
            : "Tempo 120 • Energy 0.7"}
        </div>
      </div>
      <Button
        size="sm"
        onClick={onPlay}
        disabled={isLoading}
        className="rounded-full bg-white text-black hover:bg-white/90"
      >
        <Play className="h-4 w-4 mr-1" />
        Play
      </Button>
    </div>
  );
}

function TopArtistCard() {
  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-white/8 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,.35)]">
      <div className="absolute inset-0">
        <div className="relative w-full h-full">
          <Image
            src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop"
            alt="Top Artist"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        </div>
      </div>
      <div className="relative z-[2] p-5 flex items-end justify-between gap-4">
        <div>
          <Badge className="bg-[#9FFFA2] text-black font-bold">Top 1% listener</Badge>
          <div className="mt-2 text-lg font-semibold">Top Artist</div>
        </div>
        <Button className="rounded-full bg-white text-black hover:bg-white/90">
          Generate Covers
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { tracks, provider, isLoading } = useMusicData();

  const displayName = user?.displayName || "Samanta Mikon";
  const [first, ...rest] = displayName.split(" ");
  const last = rest.join(" ") || "Mikon";
  const photo =
    user?.photoURL ||
    "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=840&auto=format&fit=crop";
  const chips = useMemo(() => generateHeroChips(tracks), [tracks]);

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
          <SpotifyAuth />
        </div>
      )}

      {/* Minimal footer stats to keep vibe */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-3xl bg-gradient-to-br from-[#9FFFA2]/15 to-[#8FD3FF]/15 border border-white/10 p-5 text-center">
          <Sparkles className="w-6 h-6 mx-auto mb-1 text-[#9FFFA2]" />
          <div className="text-lg font-extrabold">127</div>
          <div className="text-xs text-white/70">Covers Created</div>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-[#FF6F91]/15 to-[#FFD36E]/15 border border-white/10 p-5 text-center">
          <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-[#FF6F91]" />
          <div className="text-lg font-extrabold">95%</div>
          <div className="text-xs text-white/70">Match Rate</div>
        </div>
      </div>
    </div>
  );
}

// Create 3-4 chips from the user's tracks using simple heuristics
function generateHeroChips(tracks: VibelyTrack[]): string[] {
  if (!tracks || tracks.length === 0) return ["#Indie", "#Chill", "#Workout", "#Roadtrip"]; // fallback

  const moods = new Map<string, number>();
  const genreCounts = new Map<string, number>();
  let tempoSum = 0;
  let tempoCount = 0;
  let energySum = 0;
  let energyCount = 0;

  for (const t of tracks) {
    if (t.mood) moods.set(t.mood, (moods.get(t.mood) || 0) + 1);
    if (t.genre) {
      const label = normalizeGenre(t.genre);
      if (label) genreCounts.set(label, (genreCounts.get(label) || 0) + 1);
    }
    const tempo = t.tempo ?? t.audioFeatures?.tempo;
    if (typeof tempo === "number" && !Number.isNaN(tempo)) {
      tempoSum += tempo;
      tempoCount++;
    }
    const energy = t.energy ?? t.audioFeatures?.energy;
    if (typeof energy === "number" && !Number.isNaN(energy)) {
      energySum += energy;
      energyCount++;
    }
  }

  const avgTempo = tempoCount ? tempoSum / tempoCount : undefined;
  const avgEnergy = energyCount ? energySum / energyCount : undefined;

  const tags: string[] = [];
  const push = (label: string) => {
    if (label && !tags.includes(`#${label}`) && tags.length < 4) tags.push(`#${label}`);
  };

  const chillCount = moods.get("Chill") || 0;
  const energeticCount = moods.get("Energetic") || 0;
  const happyCount = moods.get("Happy") || 0;

  // Add top genre first if present
  if (genreCounts.size > 0) {
    const topGenre = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
    push(topGenre);
  }

  if ((avgEnergy ?? 0.5) < 0.5 || chillCount >= Math.max(2, energeticCount)) push("Chill");
  if ((avgEnergy ?? 0.5) >= 0.7 || energeticCount > chillCount) push("Workout");

  if (avgTempo && avgTempo >= 88 && avgTempo <= 112) push("Roadtrip");
  else if (avgTempo && avgTempo < 90) push("Lofi");
  else if (avgTempo && avgTempo > 125) push("Party");

  if (happyCount > 2 && tags.length < 4) push("Feelgood");

  while (tags.length < 4) {
    const fillers = ["Indie", "Focus", "Acoustic", "Chill"];
    const pick = fillers.find((f) => !tags.includes(`#${f}`));
    if (!pick) break;
    push(pick);
  }

  return tags.slice(0, 4);
}

function normalizeGenre(genre: string): string | null {
  const g = genre.toLowerCase();
  if (g.includes("indie")) return "Indie";
  if (g.includes("hip hop") || g.includes("hip-hop") || g.includes("rap")) return "HipHop";
  if (g.includes("r&b") || g.includes("rnb") || g.includes("soul")) return "RnB";
  if (
    g.includes("electro") ||
    g.includes("edm") ||
    g.includes("dance") ||
    g.includes("house") ||
    g.includes("techno")
  )
    return "Electronic";
  if (g.includes("rock")) return "Rock";
  if (g.includes("pop")) return "Pop";
  if (g.includes("country")) return "Country";
  if (g.includes("lo-fi") || g.includes("lofi")) return "Lofi";
  return null;
}
