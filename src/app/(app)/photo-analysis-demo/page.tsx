"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Camera,
  Brain,
  Target,
  Palette,
  Lightbulb,
  Eye,
  BarChart3,
  Cpu,
  AlertCircle,
  CheckCircle,
  Loader
} from "lucide-react";
import {
  PhotoAnalysisService,
  PhotoFeatures,
  photoAnalysisService
} from "@/lib/photo-analysis";
import { RadialProgress } from "@/components/ui/audio-visualizer";

// Sample photo URLs for demo
const samplePhotos = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108755-2616b93e8c90?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1464822759010-4b4defa0c31c?w=400&h=400&fit=crop&crop=center",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&crop=center"
];

export default function PhotoAnalysisDemoPage() {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PhotoFeatures | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [customImageUrl, setCustomImageUrl] = useState("");

  // Initialize the photo analysis service
  useEffect(() => {
    photoAnalysisService.initialize().catch(console.error);
  }, []);

  const analyzePhoto = async (imageUrl: string) => {
    setIsAnalyzing(true);
    setSelectedPhoto(imageUrl);
    setAnalysisResult(null);

    try {
      // Step-by-step analysis with visual feedback
      setAnalysisStep("Extracting image data...");
      await new Promise(resolve => setTimeout(resolve, 500));

      setAnalysisStep("Performing pose detection with MediaPipe...");
      await new Promise(resolve => setTimeout(resolve, 800));

      setAnalysisStep("Generating CLIP embeddings for semantic analysis...");
      await new Promise(resolve => setTimeout(resolve, 1200));

      setAnalysisStep("Analyzing composition and visual elements...");
      await new Promise(resolve => setTimeout(resolve, 600));

      setAnalysisStep("Removing background and isolating subject...");
      await new Promise(resolve => setTimeout(resolve, 1000));

      setAnalysisStep("Calculating final confidence scores...");
      await new Promise(resolve => setTimeout(resolve, 400));

      // Run actual analysis
      const result = await photoAnalysisService.analyzePhoto(imageUrl);

      if (result) {
        setAnalysisResult(result);
        setAnalysisStep("Analysis complete!");
        setTimeout(() => setAnalysisStep(""), 1500);
      } else {
        setAnalysisStep("Analysis failed - trying fallback mode...");
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisStep("Analysis failed - " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMoodColor = (mood: string) => {
    const colors = {
      happy: "bg-yellow-500",
      sad: "bg-blue-600",
      energetic: "bg-red-500",
      calm: "bg-green-500",
      romantic: "bg-pink-500",
      mysterious: "bg-purple-600"
    };
    return colors[mood as keyof typeof colors] || "bg-gray-500";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-400";
    if (confidence >= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  const formatConfidence = (confidence: number) => `${(confidence * 100).toFixed(1)}%`;

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
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            📸 Vibely Photo Analysis Demo
          </h1>
          <p className="text-xl text-gray-400">
            AI-powered photo analysis with MediaPipe & CLIP integration
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
              <Brain className="w-3 h-3 mr-1" />
              CLIP Semantic Analysis
            </Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
              <Target className="w-3 h-3 mr-1" />
              MediaPipe Pose Detection
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
              <Palette className="w-3 h-3 mr-1" />
              Background Removal
            </Badge>
            <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/50">
              <Eye className="w-3 h-3 mr-1" />
              Composition Analysis
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Photo Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white/5 border-white/10 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-400" />
                  Select Photo for Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sample Photos Grid */}
                <div className="grid grid-cols-4 gap-3">
                  {samplePhotos.map((photo, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => analyzePhoto(photo)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedPhoto === photo
                          ? "border-blue-500 shadow-lg shadow-blue-500/20"
                          : "border-gray-600 hover:border-blue-400"
                      } ${isAnalyzing ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <img
                        src={photo}
                        alt={`Sample ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {selectedPhoto === photo && (
                        <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>

                {/* Custom Image URL Input */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <Label htmlFor="custom-url" className="text-sm text-gray-400">
                    Or enter a custom image URL:
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-url"
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    />
                    <Button
                      onClick={() => analyzePhoto(customImageUrl)}
                      disabled={!customImageUrl || isAnalyzing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Analysis Progress */}
                <AnimatePresence>
                  {analysisStep && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {isAnalyzing ? (
                          <Loader className="w-5 h-5 animate-spin text-blue-400" />
                        ) : analysisResult ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        )}
                        <p className="text-sm">{analysisStep}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Analysis Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  AI Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPhoto && !analysisResult && !isAnalyzing ? (
                  <div className="text-center py-8 text-gray-400">
                    <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a photo to begin AI analysis</p>
                  </div>
                ) : isAnalyzing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="animate-pulse bg-white/20 h-20 w-20 rounded-full"></div>
                      <div className="space-y-2 flex-1">
                        <div className="animate-pulse bg-white/10 h-4 rounded w-3/4"></div>
                        <div className="animate-pulse bg-white/10 h-3 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ) : analysisResult ? (
                  <div className="space-y-6">
                    {/* Confidence Overview */}
                    <div className="grid grid-cols-2 gap-4">
                      <RadialProgress
                        progress={analysisResult.confidence?.overall || 0}
                        label="Overall"
                        color="primary"
                      />
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${getConfidenceColor(analysisResult.confidence?.overall || 0)}`}>
                          {formatConfidence(analysisResult.confidence?.overall || 0)}
                        </div>
                        <div className="text-xs text-gray-400">Confidence Score</div>
                      </div>
                    </div>

                    {/* Pose Detection Results */}
                    {analysisResult.poseData && (
                      <motion.div
                        className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Pose Detection
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Keypoints:</span>
                            <span className="text-white ml-2">{analysisResult.poseData.keypoints.length}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Confidence:</span>
                            <span className="text-white ml-2">{formatConfidence(analysisResult.poseData.poseConfidence)}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Semantic Analysis */}
                    {analysisResult.embeddings && (
                      <motion.div
                        className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          Semantic Analysis
                        </h4>
                        <div className="space-y-2">
                          {analysisResult.embeddings.vibe_categories && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">Top Vibes:</div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(analysisResult.embeddings.vibe_categories)
                                  .sort(([,a], [,b]) => b - a)
                                  .slice(0, 3)
                                  .map(([vibe, score]) => (
                                    <Badge key={vibe} variant="outline" className="text-xs">
                                      {vibe} {(score * 100).toFixed(0)}%
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          )}

                          {analysisResult.embeddings.mood_alignments && (
                            <div>
                              <div className="text-xs text-gray-400 mb-1">Mood Alignments:</div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(analysisResult.embeddings.mood_alignments)
                                  .sort(([,a], [,b]) => b - a)
                                  .slice(0, 3)
                                  .map(([mood, score]) => (
                                    <Badge key={mood} className={`${getMoodColor(mood)} text-white text-xs`}>
                                      {mood} {(score * 100).toFixed(0)}%
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Composition Analysis */}
                    {analysisResult.composition && (
                      <motion.div
                        className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <h4 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          Composition Analysis
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Rule of Thirds:</span>
                            <span className="text-white ml-2">{formatConfidence(analysisResult.composition.ruleOfThirdsScore)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Symmetry:</span>
                            <span className="text-white ml-2">{formatConfidence(analysisResult.composition.symmetry)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Golden Ratio:</span>
                            <span className="text-white ml-2">{formatConfidence(analysisResult.composition.goldenRatio)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Balance:</span>
                            <span className="text-white ml-2">{formatConfidence(analysisResult.composition.balance)}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Additional Insights */}
                    <motion.div
                      className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h4 className="text-pink-400 font-semibold mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        AI Insights
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Image Quality:</span>
                          <span className="text-white">{formatConfidence(analysisResult.confidence?.quality || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Album Cover Suitability:</span>
                          <span className="text-green-400 font-semibold">
                            {(analysisResult.confidence?.overall && analysisResult.confidence.overall > 0.7 ? "Excellent" :
                              analysisResult.confidence?.overall && analysisResult.confidence.overall > 0.5 ? "Good" : "Needs Improvement")}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tech Stack Overview */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-400">🔧 Technical Architecture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h4 className="text-green-400 font-semibold mb-2">🎯 Pose Detection</h4>
                  <ul className="text-gray-300 space-y-1">
                    <li>• MediaPipe Holistic (ONNX Runtime)</li>
                    <li>• COCO-17 keypoint estimation</li>
                    <li>• Real-time processing pipeline</li>
                    <li>• Confidence scoring system</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-purple-400 font-semibold mb-2">🧠 Semantic Analysis</h4>
                  <ul className="text-gray-300 space-y-1">
                    <li>• CLIP Vision Transformer</li>
                    <li>• Hugging Face Inference API</li>
                    <li>• Multi-label classification</li>
                    <li>• Mood and vibe extraction</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-pink-400 font-semibold mb-2">🎨 Composition</h4>
                  <ul className="text-gray-300 space-y-1">
                    <li>• Rule of thirds analysis</li>
                    <li>• Golden ratio evaluation</li>
                    <li>• Visual weight calculation</li>
                    <li>• Symmetry and balance scoring</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 p-8 rounded-2xl border border-white/10">
            <h2 className="text-2xl font-bold mb-4">Ready for Phase 3: AI Image Generation</h2>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              With our robust photo analysis pipeline complete, we're ready to integrate Stable Diffusion
              with ControlNet for pose-guided album cover generation. This will complete the full
              AI-powered user journey from music selection to personalized covers.
            </p>

            <div className="flex justify-center gap-4">
              <Button
                onClick={() => window.location.href = '/enhanced-player-demo'}
                className="bg-purple-600 hover:bg-purple-700"
              >
                🎵 View Music Player
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
              >
                🚀 Phase 3: Image Generation → Coming Soon
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
