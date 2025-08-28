"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Download, Share2, Trash2, Play, X, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSharing } from "@/hooks/use-sharing";
import { cn } from "@/lib/utils";

interface Story {
  id: string;
  title: string;
  artist: string;
  generatedCoverUrl: string;
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose?: () => void;
}

export default function StoryViewer({ stories, initialIndex = 0, onClose }: StoryViewerProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(initialIndex);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});
  const [isActionsVisible, setIsActionsVisible] = useState(true);
  const { toast } = useToast();
  const { shareTrack, isSharing } = useSharing();
  
  const currentStory = stories[current];

  // Hide actions after 3 seconds, show on tap
  useEffect(() => {
    const timer = setTimeout(() => setIsActionsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [current]);

  const toggleActions = () => {
    setIsActionsVisible(!isActionsVisible);
  };
  
  useEffect(() => {
    if (!api) return;
    
    // Set initial slide
    api.scrollTo(initialIndex);
    setCurrent(initialIndex);
    
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };
    
    api.on("select", onSelect);
    
    return () => {
      api.off("select", onSelect);
    };
  }, [api, initialIndex]);
  
  const handleImageError = (storyId: string) => {
    console.error(`StoryViewer image load error for story ${storyId}`);
    setImageErrors(prev => ({ ...prev, [storyId]: true }));
    setImageLoading(prev => ({ ...prev, [storyId]: false }));
  };
  
  const handleImageLoad = (storyId: string) => {
    setImageLoading(prev => ({ ...prev, [storyId]: false }));
  };
  
  const handleDownload = async () => {
    try {
      const response = await fetch(currentStory.generatedCoverUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentStory.title} - ${currentStory.artist}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Downloaded!",
        description: "Cover saved to your device.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not download the cover image.",
      });
    }
  };
  
  const handleShare = async () => {
    await shareTrack(
      currentStory.title,
      currentStory.artist,
      currentStory.generatedCoverUrl,
      'generic'
    );
  };
  
  const handleInstagramShare = async () => {
    await shareTrack(
      currentStory.title,
      currentStory.artist,
      currentStory.generatedCoverUrl,
      'instagram-stories'
    );
  };

  const handleDelete = () => {
    // This would need to be implemented with proper state management
    toast({
      title: "Delete feature",
      description: "Delete functionality would be implemented here.",
      variant: "destructive",
    });
  };

  return (
    <div className="relative w-full h-full bg-[#0E0F12]">
      {/* Close Button */}
      <AnimatePresence>
        {isActionsVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 right-4 z-50"
          >
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white hover:bg-black/70 transition-all"
            >
              <X className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Main Story Content */}
      <div className="w-full h-full" onClick={toggleActions}>
        <Carousel setApi={setApi} className="w-full h-full" opts={{ loop: true, startIndex: initialIndex }}>
          <CarouselContent className="h-full">
            {stories.map((story) => (
              <CarouselItem key={story.id} className="h-full">
                <div className="relative w-full h-full">
                  {imageErrors[story.id] ? (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#9FFFA2]/10 to-[#FF6F91]/10 rounded-3xl">
                      <div className="text-center text-white p-8">
                        <div className="text-6xl mb-6">🎨</div>
                        <h3 className="font-black text-3xl text-white drop-shadow-lg mb-3">{story.title}</h3>
                        <p className="text-white/80 text-xl drop-shadow-md mb-4">{story.artist}</p>
                        <p className="text-white/60 text-sm">Image unavailable</p>
                      </div>
                    </div>
                  ) : imageLoading[story.id] ? (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-white/5 to-white/10 rounded-3xl">
                      <div className="text-center text-white p-8">
                        <div className="w-16 h-16 border-4 border-[#9FFFA2]/30 border-t-[#9FFFA2] rounded-full animate-spin mx-auto mb-6"></div>
                        <p className="text-white/70 text-lg font-medium">Loading cover...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Image
                        src={story.generatedCoverUrl}
                        alt={`Generated cover for ${story.title}`}
                        fill
                        className="rounded-3xl object-cover"
                        sizes="(max-width: 768px) 100vw, 400px"
                        priority
                        onError={() => handleImageError(story.id)}
                        onLoad={() => handleImageLoad(story.id)}
                      />
                      
                      {/* Story Info Overlay */}
                      <AnimatePresence>
                        {isActionsVisible && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="absolute top-0 inset-x-0 p-8 text-center bg-gradient-to-b from-black/80 via-black/50 to-transparent rounded-t-3xl"
                          >
                            <h3 className="font-black text-3xl text-white drop-shadow-lg mb-2">{story.title}</h3>
                            <p className="text-white/90 text-xl drop-shadow-md font-semibold">{story.artist}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Navigation Arrows - Only visible when actions are shown */}
          <AnimatePresence>
            {isActionsVisible && stories.length > 1 && (
              <>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <CarouselPrevious className="left-4 bg-black/50 border-white/30 text-white hover:bg-black/70 backdrop-blur-sm w-12 h-12" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <CarouselNext className="right-4 bg-black/50 border-white/30 text-white hover:bg-black/70 backdrop-blur-sm w-12 h-12" />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </Carousel>
      </div>
      
      {/* Action Buttons */}
      <AnimatePresence>
        {isActionsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-4 px-6 py-4 bg-black/50 backdrop-blur-lg border border-white/20 rounded-full">
              {/* Download */}
              <Button 
                size="icon" 
                className="rounded-full w-14 h-14 bg-[#9FFFA2]/20 border border-[#9FFFA2]/30 text-[#9FFFA2] hover:bg-[#9FFFA2]/30 transition-all"
                onClick={handleDownload}
                aria-label="Download cover"
              >
                <Download className="w-6 h-6" />
              </Button>
              
              {/* Share */}
              <Button 
                size="icon" 
                className="rounded-full w-14 h-14 bg-[#8FD3FF]/20 border border-[#8FD3FF]/30 text-[#8FD3FF] hover:bg-[#8FD3FF]/30 transition-all"
                onClick={handleShare}
                aria-label="Share cover"
              >
                <Share2 className="w-6 h-6" />
              </Button>
              
              {/* Instagram Share */}
              <Button 
                size="icon" 
                className="rounded-full w-14 h-14 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 text-purple-300 hover:from-purple-500/30 hover:to-pink-500/30 transition-all"
                onClick={handleInstagramShare}
                aria-label="Share to Instagram"
              >
                <Instagram className="w-6 h-6" />
              </Button>
              
              {/* Delete */}
              <Button 
                size="icon" 
                className="rounded-full w-14 h-14 bg-[#FF6F91]/20 border border-[#FF6F91]/30 text-[#FF6F91] hover:bg-[#FF6F91]/30 transition-all"
                onClick={handleDelete}
                aria-label="Delete cover"
              >
                <Trash2 className="w-6 h-6" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Progress Indicators */}
      <AnimatePresence>
        {isActionsVisible && stories.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full">
              {stories.map((_, index) => (
                <motion.button
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index === current 
                      ? "w-8 bg-[#9FFFA2]" 
                      : "w-2 bg-white/40 hover:bg-white/60"
                  )}
                  onClick={() => api?.scrollTo(index)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={`Go to story ${index + 1}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
