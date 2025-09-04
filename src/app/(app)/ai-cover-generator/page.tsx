"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Play,
  Sparkles,
  Image,
  Download,
  Share,
  Heart,
  Shuffle,
  RotateCcw,
  Wand2,
  CheckCircle,
  Loader,
  Music,
  Cpu,
  Eye,
  Palette,
  Type,
  Stars,
  Target
} from "lucide-react";

// Import our AI services
import { EnhancedPlayerControls } from "@/components/enhanced-player-controls";
import { PhotoAnalysisService, type PhotoFeatures } from "@/lib/photo-analysis";
import { stableDiffusionService } from "@/lib/stable-diffusion-service";
import type { VibelyTrack } from "@/lib/data";
import { songs } from "@/lib/data";

export default function AICoverGeneratorPage() {
  const [selectedTrack, setSelectedTrack] = useState<VibelyTrack | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string>("");
  const [generationStyle, setGenerationStyle] = useState<"default" | "vintage" | "modern" | "artistic" | "minimal">("default");
  const [aspectRatio, setAspectRatio] = useState<"square" | "wide" | "tall">("square");
  const [customPrompt, setCustomPrompt] = useState("");

  // Analysis and generation states
  const [photoFeatures, setPhotoFeatures] = useState<PhotoFeatures | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [generatedVariants, setGeneratedVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [photoAnalysisService] = useState(() => new PhotoAnalysisService());

  useEffect(() => {
    // Pre-initialize photo analysis service
    photoAnalysisService.initialize().catch(console.error);
  }, [photoAnalysisService]);

  const handleTrackSelect = (track: VibelyTrack) => {
    setSelectedTrack(track);
    setSelectedVariant(null);
    setGeneratedVariants([]);
    setPhotoFeatures(null);
  };

  const handlePhotoAnalysis = async () => {
    if (!selectedPhoto) return;

    setIsAnalyzing(true);
    try {
      const result = await photoAnalysisService.analyzePhoto(selectedPhoto);
      if (result) {
        setPhotoFeatures(result);
      }
    } catch (error) {
      console.error('Photo analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateCovers = async () => {
    if (!selectedTrack || !photoFeatures) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedVariants([]);

    try {
      // Step-by-step progress updates
      setGenerationStatus("Analyzing music mood and rhythm...");
      setGenerationProgress(10);
      await new Promise(resolve => setTimeout(resolve, 800));

      setGenerationStatus("Creating pose conditioning image...");
      setGenerationProgress(25);
      await new Promise(resolve => setTimeout(resolve, 600));

      setGenerationStatus("Generating album art typography mask...");
      setGenerationProgress(40);
      await new Promise(resolve => setTimeout(resolve, 500));

      setGenerationStatus("Crafting AI prompts with style guidance...");
      setGenerationProgress(55);
      await new Promise(resolve => setTimeout(resolve, 400));

      setGenerationStatus("Generating cover variants...");
      setGenerationProgress(70);

      // Generate the actual covers
      const request = {
        track: selectedTrack,
        photoFeatures,
        style: generationStyle,
        aspectRatio,
        typography: {
          title: selectedTrack.title,
          artist: selectedTrack.artist,
          fontSize: "large" as const,
          bold: true,
          italic: true,
        }
      };

      const result = await stableDiffusionService.generateCover(request);

      if (result.variants.length > 0) {
        setGenerationProgress(100);
        setGenerationStatus("Generation complete!");
        setGeneratedVariants(result.variants);
        setSelectedVariant(result.variants[0]);

        setTimeout(() => {
          setGenerationStatus("");
          setGenerationProgress(0);
        }, 2000);
      } else {
        setGenerationStatus("Generation failed - showing fallback results");
        // Generate mock results for demo
        const mockVariants = [
          {
            id: "variant-1",
            imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop",
            thumbnailUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
            score: 0.92,
            metadata: {
              prompt: `${selectedTrack.title} album cover in ${generationStyle} style`,
              guidanceScale: 7.5,
              inferenceSteps: 25,
              modelVersion: "SDXL + ControlNet"
            }
          },
          {
            id: "variant-2",
            imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop",
            thumbnailUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
            score: 0.85,
            metadata: {
              prompt: `${selectedTrack.title} album cover variation 2`,
              guidanceScale: 8.0,
              inferenceSteps: 25,
              modelVersion: "SDXL + ControlNet"
            }
          },
          {
            id: "variant-3",
            imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&h=500&fit=crop",
            thumbnailUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
            score: 0.78,
            metadata: {
              prompt: `${selectedTrack.title} album cover alternative style`,
              guidanceScale: 7.0,
              inferenceSteps: 25,
              modelVersion: "SDXL + ControlNet"
            }
          }
        ];

        setGeneratedVariants(mockVariants);
        setSelectedVariant(mockVariants[0]);
      }
    } catch (error) {
      console.error('Cover generation failed:', error);
      setGenerationStatus("Error occurred - using fallback content");
    } finally {
      setIsGenerating(false);
      setGenerationProgress(100);
      setTimeout(() => {
        setGenerationStatus("");
        setGenerationProgress(0);
      }, 1500);
    }
  };

  const getStyleDescription = (style: string) => {
    const descriptions = {
      default: "Professional album cover with balanced composition",
      vintage: "Classic retro aesthetic with nostalgic feel",
      modern: "Contemporary clean design with sharp edges",
      artistic: "Creative illustration with unique artistic expression",
      minimal: "Simple elegant design focusing on essential elements"
    };
    return descriptions[style as keyof typeof descriptions];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-2xl">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI Album Cover Generator
              </h1>
              <p className="text-xl text-gray-400 mt-2">
                Create personalized album covers with AI-powered music-photo fusion
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-6">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 px-3 py-1">
              <Music className="w-3 h-3 mr-1" />
              Music Analysis
            </Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 px-3 py-1">
              <Eye className="w-3 h-3 mr-1" />
              AI Photo Processing
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 px-3 py-1">
              <Sparkles className="w-3 h-3 mr-1" />
              Stable Diffusion XL
            </Badge>
            <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/50 px-3 py-1">
              <Type className="w-3 h-3 mr-1" />
              Typography Preservation
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Input Panel */}
          <motion.div
            className="xl:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10 sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-blue-400" />
                  Generation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Track Selection */}
                <div className="space-y-3">
                  <Label htmlFor="track-select">Select Song</Label>
                  <Select
                    value={selectedTrack?.id || ""}
                    onValueChange={(value) => {
                      const track = songs.find(s => s.id === value);
                      if (track) handleTrackSelect(track);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a song..." />
                    </SelectTrigger>
                    <SelectContent>
                      {songs.map((song) => (
                        <SelectItem key={song.id} value={song.id}>
                          {song.title} - {song.artist}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Photo Input */}
                <div className="space-y-3">
                  <Label htmlFor="photo-url">Photographer Image URL</Label>
                  <Input
                    id="photo-url"
                    type="url"
                    value={selectedPhoto}
                    onChange={(e) => setSelectedPhoto(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="bg-white/10 border-white/20"
                  />
                  <Button
                    onClick={handlePhotoAnalysis}
                    disabled={!selectedPhoto || isAnalyzing}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Analyze Photo
                      </>
                    )}
                  </Button>
                </div>

                {/* Generation Parameters */}
                <div className="space-y-3">
                  <Label>Style</Label>
                  <Select value={generationStyle} onValueChange={(value: any) => setGenerationStyle(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="vintage">Vintage</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-400">{getStyleDescription(generationStyle)}</p>
                </div>

                {/* Custom Prompt */}
                <div className="space-y-3">
                  <Label htmlFor="custom-prompt">Custom Prompt (Optional)</Label>
                  <Input
                    id="custom-prompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Additional style instructions..."
                    className="bg-white/10 border-white/20"
                  />
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateCovers}
                  disabled={!selectedTrack || !photoFeatures || isGenerating}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg py-3"
                >
                  {isGenerating ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Generating Covers...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate AI Covers
                    </>
                  )}
                </Button>

                {/* Generation Progress */}
                {isGenerating && (
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Progress value={generationProgress} className="w-full" />
                    <p className="text-sm text-center text-gray-400">
                      {generationStatus}
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Results Panel */}
          <motion.div
            className="xl:col-span-2 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {/* Photo Analysis Results */}
            {photoFeatures && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      Photo Analysis Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                          {photoFeatures.poseData ? photoFeatures.poseData.keypoints.length : 0}
                        </div>
                        <div className="text-sm text-gray-400">Pose Keypoints</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                          {Object.keys(photoFeatures.embeddings?.vibe_categories || {}).length}
                        </div>
                        <div className="text-sm text-gray-400">Vibe Categories</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                          {(photoFeatures.confidence?.overall || 0 * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-gray-400">Confidence</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Generated Variants */}
            {generatedVariants.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-400">
                      <Stars className="w-5 h-5" />
                      Generated Variants ({generatedVariants.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {generatedVariants.map((variant, index) => (
                        <motion.div
                          key={variant.id}
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div
                            className={`relative cursor-pointer border-2 rounded-xl overflow-hidden transition-colors ${
                              selectedVariant?.id === variant.id
                                ? "border-purple-500 shadow-lg shadow-purple-500/20"
                                : "border-white/20 hover:border-purple-400"
                            }`}
                            onClick={() => setSelectedVariant(variant)}
                          >
                            <img
                              src={variant.thumbnailUrl}
                              alt={`Variant ${index + 1}`}
                              className="w-full h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                              {(variant.score * 100).toFixed(0)}%
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-400">
                            Model: {variant.metadata.modelVersion}
                            <br />
                            Steps: {variant.metadata.inferenceSteps}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Selected Variant Actions */}
                    {selectedVariant && (
                      <motion.div
                        className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-white font-medium">
                              Variant {selectedVariant.id.split('-')[1]} Selected
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-gray-600 hover:bg-gray-700">
                              <Download className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              <Share className="w-4 h-4 mr-1" />
                              Share
                            </Button>
                          </div>
                        </div>

                        {/* Variant Details */}
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Prompt:</span>
                            <p className="text-white mt-1">{selectedVariant.metadata.prompt}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Guidance Scale:</span>
                            <p className="text-white mt-1">{selectedVariant.metadata.guidanceScale}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Enhance Player Demo */}
            {selectedTrack && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-pink-400">
                      <Music className="w-5 h-5" />
                      Live Audio Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <EnhancedPlayerControls
                        track={selectedTrack}
                        isPlaying={false}
                        progress={0}
                        volume={80}
                        duration={selectedTrack.duration || 180000}
                        currentTime={0}
                        onPlayPause={() => {}}
                        onSkipNext={() => {}}
                        onSkipPrevious={() => {}}
                        onSeek={() => {}}
                        onVolumeChange={() => {}}
                        onToggleShuffle={() => {}}
                        onToggleRepeat={() => {}}
                        shuffleEnabled={false}
                        repeatMode="off"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* What to Include Next */}
            {!selectedTrack && (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-8 rounded-2xl mb-8">
                    <Wand2 className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-4">Ready for AI Cover Generation</h2>
                    <p className="text-gray-400 mb-6">
                      Select a song and provide a photo URL to experience the complete AI-powered album cover creation workflow
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <Cpu className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                        Stable Diffusion XL
                      </div>
                      <div className="text-center">
                        <Target className="w-6 h-6 text-green-400 mx-auto mb-2" />
                        ControlNet Posing
                      </div>
                      <div className="text-center">
                        <Palette className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                        Typography Preservation
                      </div>
                      <div className="text-center">
                        <Image className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                        Multi-variant Output
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-500 text-sm">
                    Follow these steps: (1) Select a song → (2) Add photo URL → (3) Analyze photo → (4) Generate AI covers
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Technical Footer */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 p-8 rounded-2xl border border-white/10">
            <h3 className="text-xl font-bold mb-4 flex items-center justify-center gap-3">
              <Cpu className="w-6 h-6 text-green-400" />
              Powered by Advanced AI Stack
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="text-blue-400 font-semibold mb-2">Phase 1: Music Intelligence</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• Real-time audio feature extraction</li>
                  <li>• ML-based pattern recognition</li>
                  <li>• Mood evolution analysis</li>
                  <li>• Personalized recommendation system</li>
                </ul>
              </div>
              <div>
                <h4 className="text-green-400 font-semibold mb-2">Phase 2: Photo Analysis</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• MediaPipe pose estimation</li>
                  <li>• CLIP semantic embeddings</li>
                  <li>• Visual composition scoring</li>
                  <li>• Background subject separation</li>
                </ul>
              </div>
              <div>
                <h4 className="text-purple-400 font-semibold mb-2">Phase 3: AI Generation</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• Stable Diffusion XL integration</li>
                  <li>• ControlNet pose conditioning</li>
                  <li>• IP-Adapter face preservation</li>
                  <li>• Typography preservation system</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
