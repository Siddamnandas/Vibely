"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Shuffle,
  Sparkles,
  Image as ImageIcon,
  Save,
  Check,
  Share2,
  Download,
  Wand2,
  Palette,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMusicData } from "@/hooks/use-music-data";
import { coverGenerator, GenerationOptions, GeneratedCover } from "@/lib/cover-generator";
import { photoAI, PhotoMatchScore, getMoodColor, getMoodIcon } from "@/lib/photo-ai";
import { userPhotos } from "@/lib/data";
import PhotoGallery from "@/components/photo-gallery";
import { usePerformance, useComponentPerformance } from "@/components/performance-provider";
import { useOfflineAware } from "@/components/service-worker-provider";

interface GeneratorState {
  currentTrackIndex: number;
  selectedPhotoId: string | null;
  selectedUserPhoto: string | null; // From photo gallery
  generatedCovers: GeneratedCover[];
  isGenerating: boolean;
  selectedStyle: "auto" | "classic" | "modern" | "neon" | "vintage";
  photoMatches: PhotoMatchScore[];
  isAnalyzingPhotos: boolean;
}

export default function GeneratorPage() {
  const { tracks, isLoading: tracksLoading } = useMusicData();
  const { toast } = useToast();
  const { trackInteraction } = useComponentPerformance("GeneratorPage");
  const { isOffline, isSlowConnection } = useOfflineAware();

  const [state, setState] = useState<GeneratorState>({
    currentTrackIndex: 0,
    selectedPhotoId: null,
    selectedUserPhoto: null,
    generatedCovers: [],
    isGenerating: false,
    selectedStyle: "auto",
    photoMatches: [],
    isAnalyzingPhotos: false,
  });

  const currentTrack = tracks[state.currentTrackIndex];

  const handleShuffle = async () => {
    const startTime = performance.now();

    const newIndex = (state.currentTrackIndex + 1) % tracks.length;
    setState((prev) => ({
      ...prev,
      currentTrackIndex: newIndex,
      generatedCovers: [],
      isAnalyzingPhotos: true,
    }));

    // Analyze photos for the new track
    try {
      const newTrack = tracks[newIndex];
      const audioFeatures = newTrack.audioFeatures
        ? {
            valence: newTrack.audioFeatures.valence,
            energy: newTrack.audioFeatures.energy,
            tempo: newTrack.audioFeatures.tempo,
          }
        : undefined;

      const matches = await photoAI.matchPhotosToSong(
        userPhotos,
        newTrack.mood.toLowerCase() as any,
        audioFeatures,
      );

      setState((prev) => ({
        ...prev,
        photoMatches: matches,
        isAnalyzingPhotos: false,
      }));

      // Track performance
      trackInteraction("shuffle-track", startTime);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isAnalyzingPhotos: false,
        photoMatches: [],
      }));
    }
  };

  const handlePhotoSelect = (photoId: string) => {
    setState((prev) => ({
      ...prev,
      selectedPhotoId: prev.selectedPhotoId === photoId ? null : photoId,
    }));
  };

  const handleUserPhotoSelect = (photoUrl: string) => {
    setState((prev) => ({
      ...prev,
      selectedUserPhoto: photoUrl || null,
    }));
  };

  const handleStyleSelect = (style: "auto" | "classic" | "modern" | "neon" | "vintage") => {
    setState((prev) => ({ ...prev, selectedStyle: style }));
  };

  const handleGenerate = async () => {
    if (!currentTrack) {
      toast({
        variant: "destructive",
        title: "No track selected",
        description: "Please select a track to generate covers for.",
      });
      return;
    }

    // Check offline status
    if (isOffline) {
      toast({
        variant: "destructive",
        title: "Offline Mode",
        description: "Cover generation requires an internet connection.",
      });
      return;
    }

    // Warn about slow connection
    if (isSlowConnection) {
      toast({
        title: "Slow Connection",
        description: "Generation may take longer due to slow internet.",
      });
    }

    const startTime = performance.now();
    setState((prev) => ({ ...prev, isGenerating: true }));

    try {
      // Prioritize user-selected photo from gallery, then fallback to demo photos
      let userPhoto: string | undefined;

      if (state.selectedUserPhoto) {
        userPhoto = state.selectedUserPhoto;
      } else if (state.selectedPhotoId) {
        const selectedPhoto = userPhotos.find((p) => p.id === state.selectedPhotoId);
        userPhoto = selectedPhoto?.url;
      }

      const options: GenerationOptions = {
        userPhoto,
        style: state.selectedStyle === "auto" ? undefined : state.selectedStyle,
        colorPalette: "vibrant",
      };

      const variants = await coverGenerator.generateVariants(currentTrack, options);

      setState((prev) => ({
        ...prev,
        generatedCovers: variants,
        isGenerating: false,
      }));

      toast({
        title: "Covers Generated!",
        description: `Created ${variants.length} unique variants for ${currentTrack.title}.`,
      });

      // Track performance
      trackInteraction("generate-covers", startTime);
    } catch (error) {
      setState((prev) => ({ ...prev, isGenerating: false }));
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Failed to generate album covers. Please try again.",
      });
    }
  };

  if (tracksLoading || tracks.length === 0) {
    return (
      <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-[#9FFFA2]" />
          <p className="text-lg font-medium">Loading your music...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0F12] text-white">
      <div className="container mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-black text-white mb-2">AI Album Art</h1>
            <h2 className="text-3xl font-black bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] bg-clip-text text-transparent mb-4">
              Generator
            </h2>
            <p className="text-white/70 text-lg">
              Transform your music with personalized AI covers
            </p>
          </motion.div>
        </header>

        {/* Current Track */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <Image
                    src={currentTrack.originalCoverUrl}
                    alt={`${currentTrack.title} cover`}
                    fill
                    className="rounded-2xl object-cover"
                  />
                </div>

                <div className="flex-grow text-center sm:text-left">
                  <div className="flex items-center gap-2 mb-3 justify-center sm:justify-start">
                    <Badge className="bg-[#9FFFA2]/20 text-[#9FFFA2] border-[#9FFFA2]/30">
                      {currentTrack.mood}
                    </Badge>
                    <Badge className="bg-[#8FD3FF]/20 text-[#8FD3FF] border-[#8FD3FF]/30">
                      {currentTrack.tempo} BPM
                    </Badge>
                  </div>

                  <h2 className="text-2xl font-black mb-1">{currentTrack.title}</h2>
                  <p className="text-white/80 text-lg font-semibold mb-4">{currentTrack.artist}</p>

                  <Button
                    onClick={handleShuffle}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Shuffle className="mr-2 h-4 w-4" />
                    Shuffle Track
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Style Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
            <Palette className="text-[#FF6F91]" /> Style Selection
          </h3>
          <div className="flex gap-3 flex-wrap">
            {(["auto", "classic", "modern", "neon", "vintage"] as const).map((style) => (
              <Button
                key={style}
                onClick={() => handleStyleSelect(style)}
                variant={state.selectedStyle === style ? "default" : "outline"}
                className={cn(
                  "rounded-full capitalize",
                  state.selectedStyle === style
                    ? "bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-bold"
                    : "border-white/20 text-white hover:bg-white/10",
                )}
              >
                {style}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Photo Gallery Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <PhotoGallery
            onPhotoSelect={handleUserPhotoSelect}
            selectedPhotoUrl={state.selectedUserPhoto || ""}
            maxPhotos={5}
          />
        </motion.div>

        {/* Demo Photos with AI Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
            <ImageIcon className="text-[#8FD3FF]" />
            Demo Photos
            {state.isAnalyzingPhotos && <Loader2 className="w-5 h-5 animate-spin text-[#9FFFA2]" />}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(state.photoMatches.length > 0
              ? state.photoMatches
              : userPhotos.map((p) => ({
                  photoId: p.id,
                  photoUrl: p.url,
                  matchScore: 0,
                  analysis: null,
                  reasons: [],
                }))
            ).map((match) => {
              const isSelected = state.selectedPhotoId === match.photoId;
              const hasAnalysis = state.photoMatches.length > 0;

              return (
                <motion.div
                  key={match.photoId}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={cn(
                      "overflow-hidden aspect-square cursor-pointer transition-all duration-300 border-2 relative",
                      isSelected
                        ? "border-[#9FFFA2] shadow-lg shadow-[#9FFFA2]/20 scale-105"
                        : hasAnalysis && match.matchScore > 70
                          ? "border-[#FFD36E] shadow-md shadow-[#FFD36E]/20"
                          : "border-white/20 hover:border-white/40",
                    )}
                    onClick={() => handlePhotoSelect(match.photoId)}
                  >
                    <Image
                      src={match.photoUrl}
                      alt="Demo photo"
                      width={200}
                      height={200}
                      className="h-full w-full object-cover"
                    />

                    {/* Match Score Badge */}
                    {hasAnalysis && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge
                          className={cn(
                            "text-xs font-bold",
                            match.matchScore > 80
                              ? "bg-[#9FFFA2]/90 text-black"
                              : match.matchScore > 60
                                ? "bg-[#FFD36E]/90 text-black"
                                : "bg-white/20 text-white backdrop-blur-sm",
                          )}
                        >
                          {Math.round(match.matchScore)}%
                        </Badge>
                      </div>
                    )}

                    {/* Best Match Indicator */}
                    {hasAnalysis &&
                      match.matchScore ===
                        Math.max(...state.photoMatches.map((m) => m.matchScore)) &&
                      match.matchScore > 70 && (
                        <div className="absolute top-2 left-2 z-10">
                          <Badge className="bg-[#9FFFA2] text-black font-bold text-xs">
                            ✨ BEST
                          </Badge>
                        </div>
                      )}

                    {/* Mood Indicator */}
                    {hasAnalysis && match.analysis && (
                      <div className="absolute bottom-2 left-2 z-10">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                          style={{ backgroundColor: getMoodColor(match.analysis.mood) + "90" }}
                          title={`${match.analysis.mood} mood`}
                        >
                          {getMoodIcon(match.analysis.mood)}
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4 text-sm">
            {state.isAnalyzingPhotos ? (
              <p className="text-white/60 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing photos for mood matching...
              </p>
            ) : state.photoMatches.length > 0 ? (
              <div className="space-y-2">
                <p className="text-white/70">
                  {state.selectedPhotoId
                    ? `Selected photo will be integrated into the cover`
                    : `AI recommends: ${state.photoMatches.find((m) => m.matchScore === Math.max(...state.photoMatches.map((p) => p.matchScore)))?.reasons?.[0] || "Best match available"}`}
                </p>
                {state.selectedPhotoId && (
                  <div className="text-xs text-[#9FFFA2]">
                    {state.photoMatches
                      .find((m) => m.photoId === state.selectedPhotoId)
                      ?.reasons?.slice(0, 2)
                      .join(" • ")}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-white/50">Select a photo or let AI choose the best match</p>
            )}
          </div>
        </motion.div>

        {/* Generate Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8"
        >
          <Button
            onClick={handleGenerate}
            disabled={state.isGenerating || isOffline}
            className="w-full bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-black text-xl py-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {state.isGenerating ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                {isSlowConnection ? "Generating (Slow Connection)..." : "Generating Magic..."}
              </>
            ) : isOffline ? (
              <>
                <ImageIcon className="mr-3 h-6 w-6" />
                Offline - Cannot Generate
              </>
            ) : (
              <>
                <Wand2 className="mr-3 h-6 w-6" />
                Generate Album Covers
              </>
            )}
          </Button>
        </motion.div>

        {/* Generated Covers */}
        <AnimatePresence>
          {state.generatedCovers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h3 className="text-2xl font-black mb-6 text-center">
                <span className="bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] bg-clip-text text-transparent">
                  Your Generated Covers
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {state.generatedCovers.map((cover, index) => (
                  <motion.div
                    key={cover.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/20 backdrop-blur-sm">
                      <div className="relative">
                        <Image
                          src={cover.imageUrl}
                          alt={`Generated cover ${index + 1}`}
                          width={400}
                          height={400}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-black/50 backdrop-blur-sm text-white border-white/20">
                            {cover.template.name}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-white hover:bg-white/10"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-white hover:bg-white/10"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-white hover:bg-white/10"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-[#9FFFA2]/30 text-[#9FFFA2] text-xs"
                          >
                            Variant {index + 1}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
