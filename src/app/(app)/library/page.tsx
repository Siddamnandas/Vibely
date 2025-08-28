"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { songs } from "@/lib/data";
import { playlists } from "@/lib/playlists";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { motion, PanInfo } from "framer-motion";
import PlaylistDetailOverlay from "@/components/playlist-detail-overlay";

// Using shared playlists data

function PlaylistSwipeCards({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);

  const handleDragEnd = (event: any, info: PanInfo, index: number) => {
    const swipeThreshold = 120;
    const swipeVelocityThreshold = 600;

    if (
      Math.abs(info.offset.x) > swipeThreshold ||
      Math.abs(info.velocity.x) > swipeVelocityThreshold
    ) {
      if (info.offset.x > 0) {
        // Swiped right - previous playlist
        const newIndex = currentIndex > 0 ? currentIndex - 1 : playlists.length - 1;
        setCurrentIndex(newIndex);
      } else {
        // Swiped left - next playlist
        const newIndex = (currentIndex + 1) % playlists.length;
        setCurrentIndex(newIndex);
      }
    }
    setDraggedCardIndex(null);
  };

  const getVisibleCards = () => {
    const visibleCards = [];
    for (let i = 0; i < 3; i++) {
      const cardIndex = (currentIndex + i) % playlists.length;
      visibleCards.push({
        playlist: playlists[cardIndex],
        index: cardIndex,
        stackPosition: i,
      });
    }
    return visibleCards;
  };

  const handleCardTap = (playlistId: string) => {
    onOpenDetail(playlistId);
  };

  return (
    <div className="relative w-full h-[500px] flex items-center justify-center mb-12">
      {getVisibleCards().map(({ playlist, index, stackPosition }) => {
        const isTopCard = stackPosition === 0;

        // Enhanced crossed positioning for more dramatic effect
        const rotations = [0, -12, 15]; // More pronounced angles
        const xOffsets = [0, -15, 20]; // Horizontal offsets for crossed effect
        const yOffsets = [0, 8, 12]; // Vertical offsets
        const scales = [1, 0.95, 0.9]; // Different scales for depth

        const rotation = rotations[stackPosition] || 0;
        const xOffset = xOffsets[stackPosition] || 0;
        const yOffset = yOffsets[stackPosition] || 0;
        const scale = scales[stackPosition] || 0.85;

        return (
          <motion.div
            key={`${playlist.id}-${currentIndex}`}
            className={`absolute w-[320px] h-[420px] rounded-[32px] shadow-2xl cursor-pointer overflow-hidden bg-white`}
            initial={{
              scale: scale,
              x: xOffset,
              y: yOffset,
              zIndex: 10 - stackPosition,
              rotate: rotation,
            }}
            animate={{
              scale: scale,
              x: xOffset,
              y: yOffset,
              zIndex: 10 - stackPosition,
              rotate: draggedCardIndex === index ? 0 : rotation,
            }}
            whileTap={{ scale: isTopCard ? 0.95 : scale }}
            drag={isTopCard ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragStart={() => setDraggedCardIndex(index)}
            onDragEnd={(event, info) => handleDragEnd(event, info, index)}
            onClick={() => isTopCard && handleCardTap(playlist.id)}
            dragElastic={0.2}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 35,
            }}
          >
            {/* Cover image filling the entire card */}
            <div className="relative w-full h-full">
              <Image
                src={playlist.coverImage}
                alt={playlist.name}
                fill
                className="object-cover"
                priority={stackPosition === 0 && currentIndex === 0} // Priority for first visible image
                sizes="(max-width: 768px) 320px, 320px"
              />

              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              {/* Optional playful gradient overlay based on playlist */}
              <div
                className={`absolute inset-0 mix-blend-multiply opacity-20 ${
                  index % 3 === 0
                    ? "bg-gradient-to-br from-[#9FFFA2]/40 to-transparent"
                    : index % 3 === 1
                      ? "bg-gradient-to-br from-[#FF6F91]/40 to-transparent"
                      : "bg-gradient-to-br from-[#8FD3FF]/40 to-transparent"
                }`}
              />
            </div>

            {/* Playlist name at top-left */}
            <div className="absolute top-6 left-6 right-6">
              <h3 className="text-white font-black text-3xl leading-tight drop-shadow-xl mb-1">
                {playlist.name}
              </h3>
              <p className="text-white/90 font-bold text-base drop-shadow-lg">
                {playlist.count} songs
              </p>
            </div>

            {/* Minimal swipe indicators only on top card */}
            {isTopCard && (
              <>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 bg-black/20 backdrop-blur-sm rounded-full p-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                  </svg>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 bg-black/20 backdrop-blur-sm rounded-full p-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </div>
              </>
            )}
          </motion.div>
        );
      })}

      {/* Minimal stack depth indicator */}
      <div className="absolute bottom-[-50px] left-1/2 -translate-x-1/2 flex gap-2">
        {playlists.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? "bg-[#9FFFA2] w-6" : "bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  return (
    <div className="min-h-screen bg-[#0E0F12] text-white">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-black tracking-tight text-white">Music Library</h1>
          <p className="mt-2 text-lg text-white/70">Your favorite tracks and playlists.</p>
        </header>

        <div className="space-y-16">
          {/* Playlists Section - Now at the top */}
          <section>
            <h2 className="text-3xl font-black mb-8 text-white">Playlists</h2>
            <PlaylistSwipeCards onOpenDetail={(id) => setOpenPlaylistId(id)} />
          </section>

          {/* Top Songs Section - Moved down */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
              <Star className="text-accent" />
              Top Songs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {songs.map((song) => (
                <Card
                  key={song.id}
                  className="overflow-hidden bg-white/5 border border-white/10 shadow-lg hover:bg-white/10 transition-colors duration-300 rounded-3xl"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Image
                        src={song.originalCoverUrl}
                        alt={`${song.title} cover`}
                        width={80}
                        height={80}
                        className="rounded-2xl aspect-square object-cover"
                        data-ai-hint="album cover"
                      />
                      <div className="flex-grow overflow-hidden">
                        <p className="font-bold truncate text-lg text-white">{song.title}</p>
                        <p className="text-sm text-white/70 truncate">{song.artist}</p>
                        <Badge variant="outline" className="mt-2 text-xs border-accent text-accent">
                          {song.mood}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
      {openPlaylistId && (
        <PlaylistDetailOverlay
          playlistId={openPlaylistId}
          onClose={() => setOpenPlaylistId(null)}
        />
      )}
    </div>
  );
}
