import { songs } from "@/lib/data";

export type Playlist = {
  id: string;
  name: string;
  count: number;
  coverImage: string;
  songs: Array<{
    id: string;
    title: string;
    artist: string;
    coverUrl: string;
    available?: boolean;
  }>;
};

// Build demo playlists by repeating base songs to match count
function buildSongs(count: number, seed: number) {
  const base = songs.map((s, i) => ({
    id: `${s.id}-${seed}-${i}`,
    title: s.title,
    artist: s.artist,
    coverUrl: s.originalCoverUrl,
    available: Math.random() > 0.1, // 10% unavailable
  }));
  const out: Playlist["songs"] = [];
  while (out.length < count) {
    out.push({
      ...base[out.length % base.length],
      id: `${base[out.length % base.length].id}-${out.length}`,
    });
  }
  return out;
}

export const playlists: Playlist[] = [
  {
    id: "1",
    name: "Late Night Vibes",
    count: 42,
    coverImage: "https://picsum.photos/seed/playlist1/1200/800",
    songs: buildSongs(42, 1),
  },
  {
    id: "2",
    name: "Workout Hits",
    count: 88,
    coverImage: "https://picsum.photos/seed/playlist2/1200/800",
    songs: buildSongs(88, 2),
  },
  {
    id: "3",
    name: "Road Trip",
    count: 120,
    coverImage: "https://picsum.photos/seed/playlist3/1200/800",
    songs: buildSongs(120, 3),
  },
  {
    id: "4",
    name: "Focus Flow",
    count: 65,
    coverImage: "https://picsum.photos/seed/playlist4/1200/800",
    songs: buildSongs(65, 4),
  },
];

export function getPlaylistById(id: string) {
  return playlists.find((p) => p.id === id);
}
