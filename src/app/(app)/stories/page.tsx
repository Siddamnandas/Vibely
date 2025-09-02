"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { savedStories } from "@/lib/data";
import StoryViewer from "@/components/story-viewer";
import { Plus, Search, Filter } from "lucide-react";

export default function StoriesPage() {
  const router = useRouter();
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "recent" | "favorites">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isUnmounting = useRef(false);

  const filteredStories = savedStories.filter((story) => {
    const matchesSearch =
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.artist.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  useEffect(() => {
    setMounted(true);
    console.log("StoriesPage mounted with", savedStories.length, "stories");

    // Shorter timeout to ensure mounting doesn't get stuck
    const mountTimeout = setTimeout(() => {
      setMounted(true);
    }, 500); // Reduced from 1000ms to 500ms

    // Pre-load images in batches to avoid overwhelming the browser
    const loadImagesInBatches = async () => {
      const batchSize = 3; // Load 3 images at a time
      for (let i = 0; i < savedStories.length; i += batchSize) {
        const batch = savedStories.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(async (story) => {
            if (isUnmounting.current) return;
            setImageLoading((prev) => ({ ...prev, [story.id]: true }));

            try {
              await new Promise((resolve, reject) => {
                const img = new window.Image();
                img.onload = resolve;
                img.onerror = () => reject(new Error("Image load error"));
                img.src = story.generatedCoverUrl;

                // Add timeout for individual images
                setTimeout(() => reject(new Error("Image load timeout")), 3000);
              });

              if (!isUnmounting.current) {
                setImageLoading((prev) => ({ ...prev, [story.id]: false }));
              }
            } catch (error) {
              if (!isUnmounting.current) {
                console.warn(
                  `Failed to load image for story ${story.id}:`,
                  story.generatedCoverUrl,
                );
                setImageErrors((prev) => ({ ...prev, [story.id]: true }));
                setImageLoading((prev) => ({ ...prev, [story.id]: false }));
              }
            }
          }),
        );

        // Small delay between batches to prevent browser hanging
        if (i + batchSize < savedStories.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    };

    if (savedStories.length > 0 && !isUnmounting.current) {
      loadImagesInBatches();
    }

    return () => {
      clearTimeout(mountTimeout);
      isUnmounting.current = true;
    };
  }, []);

  const handleImageError = (storyId: string) => {
    if (isUnmounting.current) return;
    console.error(`Image load error for story ${storyId}`);
    setImageErrors((prev) => ({ ...prev, [storyId]: true }));
    setImageLoading((prev) => ({ ...prev, [storyId]: false }));
  };

  const handleImageLoad = (storyId: string) => {
    if (isUnmounting.current) return;
    setImageLoading((prev) => ({ ...prev, [storyId]: false }));
  };

  const handleOpenStoryViewer = (storyId: string) => {
    if (isUnmounting.current) return;
    const index = savedStories.findIndex((s) => s.id === storyId);
    if (index !== -1) {
      setSelectedStoryIndex(index);
      setIsDialogOpen(true);
    }
  };

  const handleCloseStoryViewer = () => {
    if (isUnmounting.current) return;
    setIsDialogOpen(false);
  };

  // Show loading until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center">
        <div className="text-white text-lg">Loading stories...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0F12] text-white">
      <div className="container mx-auto max-w-4xl px-6 py-8">
        {/* Header Section */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">Stories Archive</h1>
              <p className="text-white/70 text-lg">Your collection of AI-generated album covers</p>
            </div>
            <Button
              className="bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-bold hover:opacity-90 rounded-full"
              onClick={() => router.push("/generator?source=stories_header")}
              disabled={isUnmounting.current}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Search your stories..."
                value={searchQuery}
                onChange={(e) => !isUnmounting.current && setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-[#9FFFA2]/50 focus:bg-white/20 transition-all"
                disabled={isUnmounting.current}
              />
            </div>
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 rounded-2xl px-6"
              onClick={() => {
                /* TODO: Open filter modal */
              }}
              disabled={isUnmounting.current}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-black text-[#9FFFA2]">{savedStories.length}</div>
              <div className="text-white/60 text-sm font-medium">Total Covers</div>
            </div>
            <div className="w-px bg-white/20"></div>
            <div>
              <div className="text-2xl font-black text-[#FF6F91]">12</div>
              <div className="text-white/60 text-sm font-medium">This Month</div>
            </div>
            <div className="w-px bg-white/20"></div>
            <div>
              <div className="text-2xl font-black text-[#8FD3FF]">3.2K</div>
              <div className="text-white/60 text-sm font-medium">Total Views</div>
            </div>
            <div className="w-px bg-white/20"></div>
            <div>
              <div className="text-2xl font-black text-[#FFD36E]">89%</div>
              <div className="text-white/60 text-sm font-medium">Shared</div>
            </div>
          </div>

          {/* Social Sharing Tips */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/20 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">✨</span>
              </div>
              <h3 className="text-white font-bold">Pro Tip</h3>
            </div>
            <p className="text-white/80 text-sm">
              Use the hashtag button when sharing to automatically copy trending hashtags for
              maximum reach!
            </p>
          </div>
        </header>

        {/* Stories Grid */}
        {filteredStories.length === 0 ? (
          <div className="text-center py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#9FFFA2]/20 to-[#FF6F91]/20 rounded-full flex items-center justify-center border border-white/10">
                <div className="text-4xl">🎨</div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {searchQuery ? "No matching stories" : "No stories yet!"}
              </h3>
              <p className="text-white/60 mb-8 max-w-md mx-auto">
                {searchQuery
                  ? "Try adjusting your search terms to find more covers."
                  : "Start generating AI album covers to build your personal collection."}
              </p>
              <Button
                className="bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-bold hover:opacity-90 rounded-full px-8 py-3"
                onClick={() => router.push("/generator?source=stories_empty_state")}
                disabled={isUnmounting.current}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Cover
              </Button>
            </motion.div>
          </div>
        ) : (
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => !isUnmounting.current && setIsDialogOpen(open)}
          >
            <motion.div
              className="grid grid-cols-2 gap-4 md:gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, staggerChildren: 0.1 }}
            >
              {filteredStories.map((story, index) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <DialogTrigger
                    asChild
                    onClick={() => handleOpenStoryViewer(story.id)}
                    disabled={isUnmounting.current}
                  >
                    <div className="relative overflow-hidden aspect-[9/16] cursor-pointer group">
                      <motion.div
                        className="relative w-full h-full bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-[32px] border border-white/10 shadow-2xl overflow-hidden"
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                      >
                        {imageErrors[story.id] ? (
                          <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#9FFFA2]/10 to-[#FF6F91]/10">
                            <div className="text-center text-white p-6">
                              <div className="text-4xl mb-4">🎵</div>
                              <p className="font-bold text-lg mb-2">{story.title}</p>
                              <p className="text-white/70 text-sm mb-3">{story.artist}</p>
                              <p className="text-white/50 text-xs">Image unavailable</p>
                            </div>
                          </div>
                        ) : imageLoading[story.id] ? (
                          <div className="flex items-center justify-center h-full bg-gradient-to-br from-white/5 to-white/10">
                            <div className="text-center text-white p-6">
                              <div className="w-8 h-8 border-2 border-[#9FFFA2]/30 border-t-[#9FFFA2] rounded-full animate-spin mx-auto mb-4"></div>
                              <p className="text-white/70 text-sm">Loading cover...</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Image
                              src={story.generatedCoverUrl}
                              alt={`Generated cover for ${story.title}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 33vw"
                              onError={() => handleImageError(story.id)}
                              onLoad={() => handleImageLoad(story.id)}
                              priority={index < 4} // Prioritize first 4 images
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="absolute bottom-0 left-0 right-0 p-6">
                                <p className="font-black text-white text-lg drop-shadow-lg mb-1">
                                  {story.title}
                                </p>
                                <p className="text-white/90 text-sm drop-shadow-md font-medium">
                                  {story.artist}
                                </p>
                              </div>
                            </div>

                            {/* Glassmorphic Overlay for Hover Effect */}
                            <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </>
                        )}
                      </motion.div>
                    </div>
                  </DialogTrigger>
                </motion.div>
              ))}
            </motion.div>

            <DialogContent className="p-0 border-0 bg-transparent w-full max-w-md h-auto shadow-none">
              <StoryViewer
                stories={savedStories}
                initialIndex={selectedStoryIndex}
                onClose={handleCloseStoryViewer}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
