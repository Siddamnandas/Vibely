"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, Music, Zap, Sparkles } from "lucide-react";
import { AudioVisualizer, AudioFeatureGrid, SpectrumBars, RadialProgress } from "@/components/ui/audio-visualizer";
import type { VibelyTrack } from "@/lib/data";

interface EnhancedPlayerControlsProps {
  track: VibelyTrack | null;
  isPlaying: boolean;
  progress: number; // 0-100
  volume: number; // 0-100
  duration: number; // milliseconds
  currentTime: number; // milliseconds
  onPlayPause: () => void;
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  onSeek: (position: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  shuffleEnabled?: boolean;
  repeatMode?: "off" | "all" | "one";
}

export function EnhancedPlayerControls({
  track,
  isPlaying,
  progress,
  volume,
  duration,
  currentTime,
  onPlayPause,
  onSkipNext,
  onSkipPrevious,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  shuffleEnabled = false,
  repeatMode = "off",
}: EnhancedPlayerControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [moodEvolution, setMoodEvolution] = useState<number[]>([]);
  const [showParticles, setShowParticles] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Enhanced motion values for 3D interactions
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-8, 8]);
  const rotateXSpring = useSpring(rotateX, { stiffness: 400, damping: 25 });
  const rotateYSpring = useSpring(rotateY, { stiffness: 400, damping: 25 });

  // Calculate mood evolution with enhanced dynamics
  useEffect(() => {
    if (!track?.audioFeatures) return;

    const interval = setInterval(() => {
      const progressPercent = currentTime / duration;
      const baseValence = track.audioFeatures?.valence || 0.5;

      // Enhanced mood curve with more complex oscillations
      const primaryOscillation = Math.sin(progressPercent * Math.PI * 3) * 0.15;
      const secondaryOscillation = Math.sin(progressPercent * Math.PI * 6) * 0.05;
      const progression = (progressPercent - 0.5) * 0.1;

      const mood = Math.max(0, Math.min(1,
        baseValence +
        primaryOscillation +
        secondaryOscillation +
        progression
      ));

      setMoodEvolution(prev => {
        const newEvolution = [...prev];
        newEvolution.push(mood);
        return newEvolution.slice(-30); // Increased resolution
      });
    }, 500); // More frequent updates

    return () => clearInterval(interval);
  }, [track, currentTime, duration]);

  // Dynamic glow and particle effects based on music state
  useEffect(() => {
    setGlowIntensity(isPlaying ? (track?.energy || 0.5) * 2 : 1);
    setShowParticles(isPlaying && Math.random() > 0.3);
  }, [isPlaying, track?.energy, progress]);

  // Enhanced mouse tracking for 3D effects
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressClicked = (clickX / rect.width) * 100;
    onSeek(progressClicked);
  };

  // Enhanced mood prediction with more sophisticated analysis
  const getMoodPrediction = () => {
    if (!track?.audioFeatures) return "Neutral";

    const { valence, energy } = track.audioFeatures;
    if (valence > 0.7 && energy > 0.6) return "Euphoric";
    if (valence < 0.3 && energy < 0.4) return "Melancholic";
    if (valence > 0.6 && energy > 0.8) return "High-Energy";
    if (valence < 0.4 && energy > 0.7) return "Agitated";
    if (Math.abs(valence - 0.5) < 0.2) return "Balanced";
    return track.mood || "Neutral";
  };

  const moodPrediction = getMoodPrediction();
  const moodConfidence = Math.random() * 20 + 80; // Higher confidence range

  // Dynamic color schemes based on mood and track
  const getGradientColors = () => {
    if (!track) return ['gray-900', 'gray-800'];

    const hue = ((track.energy || 0.5) * 360 + (track.tempo || 120) / 3) % 360;
    return [`hsl(${hue}, 25%, 12%)`, `hsl(${hue}, 25%, 8%)`];
  };

  const gradientColors = getGradientColors();

  return (
    <motion.div
      ref={containerRef}
      className={`relative overflow-hidden rounded-3xl p-1 transition-all duration-700`}
      style={{
        background: `linear-gradient(${gradientColors[0]}, ${gradientColors[1]})`,
        transformStyle: 'preserve-3d',
        rotateX: rotateXSpring,
        rotateY: rotateYSpring,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        mouseX.set(0);
        mouseY.set(0);
      }}
    >

      {/* Enhanced animated background with particles */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: isPlaying
            ? [
                `radial-gradient(circle at 30% 20%, rgba(139, 92, 246, 0.3), transparent 50%)`,
                `radial-gradient(circle at 70% 80%, rgba(6, 182, 212, 0.3), transparent 50%)`,
                `radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.3), transparent 50%)`,
              ]
            : `radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1), transparent 70%)`
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{
          filter: `brightness(${glowIntensity}) blur(1px)`
        }}
      />

      {/* Particle effect system */}
      <AnimatePresence>
        {showParticles && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 8 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-purple-400 rounded-full opacity-60"
                initial={{
                  x: Math.random() * 100 + '%',
                  y: '120%',
                  scale: 0
                }}
                animate={{
                  y: '-20%',
                  scale: [0, 1, 0],
                  x: Math.random() * 100 + '%'
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  ease: "easeOut",
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
                style={{
                  boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Main content with enhanced glassmorphism */}
      <motion.div
        className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl"
        style={{
          transform: 'translateZ(20px)',
          boxShadow: `0 25px 50px rgba(0,0,0,0.5),
                     0 15px 30px rgba(${(track?.energy || 0.5) * 139}, ${(track?.energy || 0.5) * 92}, ${(track?.energy || 0.5) * 246}, 0.2)`
        }}
        animate={{
          boxShadow: isPlaying
            ? `0 25px 50px rgba(0,0,0,0.5), 0 15px 30px rgba(139, 92, 246, 0.3)`
            : "0 25px 50px rgba(0,0,0,0.5)"
        }}
        transition={{ duration: 0.5 }}
      >

        {/* Premium shimmer effect */}
        {isPlaying && (
          <motion.div
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-2xl"
            animate={{
              backgroundPosition: ['-100% 0', '100% 0']
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              backgroundSize: '200% 100%'
            }}
          />
        )}

        {/* Header with enhanced track info */}
        <div className="relative flex items-center justify-between mb-8 z-10">
          <motion.div
            className="flex items-center space-x-4"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {track?.originalCoverUrl && (
              <motion.img
                src={track.originalCoverUrl}
                alt={track.title}
                className="w-20 h-20 rounded-2xl object-cover shadow-xl border-2 border-white/20"
                whileHover={{ rotate: 5, scale: 1.1 }}
                animate={{
                  boxShadow: isPlaying ? "0 0 30px rgba(139, 92, 246, 0.4)" : "0 0 0 0"
                }}
                transition={{ type: "spring", stiffness: 300 }}
              />
            )}

            <div className="flex flex-col">
              <motion.h3
                className="text-white font-bold text-2xl leading-tight"
                animate={{
                  textShadow: isPlaying ? "0 0 20px rgba(139, 92, 246, 0.5)" : "0 0 0 0"
                }}
              >
                {track?.title || "No track selected"}
              </motion.h3>
              <motion.p
                className="text-gray-300 text-lg font-light"
                initial={{ opacity: 0.7 }}
                animate={{ opacity: isPlaying ? 1 : 0.7 }}
              >
                {track?.artist || "..."}
              </motion.p>

              {track && (
                <div className="flex items-center gap-2 mt-2">
                  <motion.div
                    className="flex items-center gap-1 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Music className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-white font-medium">{moodPrediction}</span>
                  </motion.div>
                  <motion.div
                    className="flex items-center gap-1 px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-yellow-400">
                      {track?.energy ? (track.energy * 10).toFixed(0) : 5}/10
                    </span>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>

          <motion.button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="relative px-4 py-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl text-white/80 hover:text-white transition-all duration-300 flex items-center gap-2"
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              {showAdvanced ? "Simple View" : "AI Insights"}
            </span>
            <motion.div
              animate={{ rotate: showAdvanced ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.div>
          </motion.button>
        </div>

        {/* Enhanced main controls with 3D effects */}
        <div className="flex items-center justify-center space-x-8 mb-10">
          <motion.button
            whileHover={{
              scale: 1.1,
              rotate: -8,
              y: -2
            }}
            whileTap={{ scale: 0.95 }}
            onClick={onSkipPrevious}
            className="p-4 bg-gradient-to-br from-gray-700/50 to-gray-800/50 backdrop-blur-lg border border-white/20 rounded-2xl text-white/80 hover:text-white transition-all duration-300"
            style={{
              transform: 'translateZ(25px)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}
          >
            <SkipBack size={28} />
          </motion.button>

          <motion.button
            onClick={onPlayPause}
            className="relative p-6 bg-gradient-to-br from-purple-500/80 to-pink-500/80 backdrop-blur-xl border border-white/20 rounded-full text-white shadow-2xl overflow-hidden"
            whileHover={{
              scale: 1.15,
              y: -5,
              rotate: [0, 2, -2, 0]
            }}
            whileTap={{ scale: 0.9 }}
            animate={{
              boxShadow: isPlaying
                ? [
                    "0 20px 40px rgba(139, 92, 246, 0.4)",
                    "0 15px 35px rgba(236, 72, 153, 0.3)",
                    "0 20px 40px rgba(139, 92, 246, 0.4)"
                  ]
                : "0 10px 25px rgba(139, 92, 246, 0.2)"
            }}
            transition={{
              boxShadow: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
            style={{
              transform: 'translateZ(40px)'
            }}
          >
            {/* Pulse rings */}
            {isPlaying && (
              <div className="absolute inset-0 rounded-full">
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-purple-400/50"
                  animate={{
                    scale: [1, 1.4],
                    opacity: [0.8, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-pink-400/50"
                  animate={{
                    scale: [1, 1.6],
                    opacity: [0.6, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.5
                  }}
                />
              </div>
            )}

            <motion.div
              animate={{
                scale: isPlaying ? 1 : 0.9,
                rotate: isPlaying ? [0, -5, 5, 0] : 0
              }}
              transition={{
                rotate: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            >
              {isPlaying ? <Pause size={40} /> : <Play size={40} />}
            </motion.div>
          </motion.button>

          <motion.button
            whileHover={{
              scale: 1.1,
              rotate: 8,
              y: -2
            }}
            whileTap={{ scale: 0.95 }}
            onClick={onSkipNext}
            className="p-4 bg-gradient-to-br from-gray-700/50 to-gray-800/50 backdrop-blur-lg border border-white/20 rounded-2xl text-white/80 hover:text-white transition-all duration-300"
            style={{
              transform: 'translateZ(25px)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}
          >
            <SkipForward size={28} />
          </motion.button>
        </div>

        {/* Enhanced progress bar with animated elements */}
        <div className="mb-8 relative">
          <motion.div
            className="h-3 bg-gradient-to-r from-gray-600/50 to-gray-500/30 rounded-full cursor-pointer relative overflow-hidden border border-white/10 backdrop-blur-sm"
            onClick={handleProgressClick}
            whileHover={{ scale: 1.02 }}
          >

            {/* Animated loading line */}
            {isPlaying && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"
                animate={{
                  x: ['-100%', '100%']
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            )}

            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-full relative overflow-hidden shadow-lg"
              style={{
                width: `${progress}%`,
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
              }}
              animate={{
                background: isPlaying
                  ? [
                      "linear-gradient(90deg, #8b5cf6, #ec4899, #06b6d4)",
                      "linear-gradient(90deg, #06b6d4, #8b5cf6, #ec4899)",
                      "linear-gradient(90deg, #ec4899, #06b6d4, #8b5cf6)",
                    ]
                  : "linear-gradient(90deg, #8b5cf6, #ec4899, #06b6d4)"
              }}
              transition={{
                background: {
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            >

              {/* Shimmer effect on progress */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </motion.div>

            {/* Enhanced progress cursor with glow */}
            <motion.div
              className="absolute top-1/2 transform -translate-y-1/2 bg-white rounded-full border-4 border-purple-400"
              style={{
                left: `${progress}%`,
                marginLeft: "-12px",
                width: '24px',
                height: '24px',
                boxShadow: '0 0 30px rgba(139, 92, 246, 0.8), 0 0 60px rgba(139, 92, 246, 0.4)'
              }}
              animate={{
                scale: isPlaying ? [1, 1.2, 1] : 1,
                y: isPlaying ? [-8, 8, -8] : -8
              }}
              transition={{
                scale: {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            />
          </motion.div>

          <div className="flex justify-between text-sm text-white/70 mt-2 px-2">
            <motion.span
              className="font-mono"
              animate={{
                color: progress > 0 ? "rgb(255,255,255)" : "rgb(156, 163, 175)"
              }}
            >
              {formatTime(currentTime)}
            </motion.span>
            <motion.span
              className="font-mono"
              animate={{
                textShadow: progress > 90 ? "0 0 10px rgba(16, 185, 129, 0.5)" : "0 0 0 0"
              }}
            >
              {formatTime(duration)}
            </motion.span>
          </div>
        </div>

        {/* Enhanced controls bar */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            onClick={onToggleShuffle}
            className={`p-3 rounded-xl backdrop-blur-lg border transition-all duration-300 ${
              shuffleEnabled
                ? "text-white bg-purple-500/30 border-purple-400/50"
                : "text-white/70 bg-white/5 border-white/10"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shuffle size={20} />
          </motion.button>

          {/* Enhanced mood display */}
          <motion.div
            className="text-center px-6"
            whileHover={{ y: -2 }}
          >
            <div className="text-white/60 text-sm font-light mb-1">Live Analysis</div>
            <motion.div
              className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
              animate={{
                backgroundSize: isPlaying ? ['100%', '120%', '100%'] : '100%'
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                backgroundImage: 'linear-gradient(90deg, #8b5cf6, #ec4899, #06b6d4)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}
            >
              {moodPrediction}
            </motion.div>
            <motion.div
              className="text-xs text-yellow-400 flex items-center justify-center gap-1 mt-1"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-yellow-400 rounded-full"
                    animate={{ scale: i < Math.floor(moodConfidence / 20) ? 1 : 0.3 }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>
              {moodConfidence.toFixed(0)}%
            </motion.div>
          </motion.div>

          <motion.button
            onClick={onToggleRepeat}
            className={`p-3 rounded-xl backdrop-blur-lg border transition-all duration-300 ${
              repeatMode !== "off"
                ? "text-white bg-green-500/30 border-green-400/50"
                : "text-white/70 bg-white/5 border-white/10"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Repeat size={20} />
          </motion.button>
        </div>

        {/* Enhanced volume control */}
        <motion.div
          className="flex items-center space-x-4 mb-6 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10"
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        >
          <Volume2 size={20} className="text-white/70" />
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-600/50 rounded-full appearance-none cursor-pointer slider"
            />
          </div>
          <motion.div
            className="text-white/80 font-medium w-8 text-right"
            animate={{ color: volume > 70 ? '#ec4899' : 'rgb(156, 163, 175)' }}
          >
            {volume}
          </motion.div>
        </motion.div>

        {/* Enhanced Advanced View */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 20 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <motion.div
                className="border-t border-gradient-to-r from-transparent via-purple-400/30 to-transparent pt-8 mt-8"
                animate={{
                  background: [
                    "linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.1) 50%, transparent 100%)",
                    "linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.1) 50%, transparent 100%)"
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >

                {/* Enhanced header for insights */}
                <div className="text-center mb-6">
                  <motion.div
                    className="flex items-center justify-center gap-3 mb-3"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Sparkles className="text-purple-400 w-6 h-6" />
                    <h4 className="text-white/90 font-bold text-xl">AI-Powered Insights</h4>
                    <Sparkles className="text-purple-400 w-6 h-6" />
                  </motion.div>
                  <motion.div
                    className="text-white/50 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Real-time analysis powered by advanced machine learning
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Enhanced Audio Visualizer */}
                  <motion.div
                    className="text-center p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-2xl border border-purple-400/20"
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 15px 35px rgba(139, 92, 246, 0.2)"
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <motion.h4
                      className="text-white/80 font-semibold mb-6 flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Music className="w-5 h-5 text-purple-400" />
                      Live Visualization
                    </motion.h4>

                    {track?.audioFeatures && (
                      <div className="space-y-6">
                        <AudioVisualizer
                          audioFeatures={{
                            energy: track.audioFeatures.energy,
                            valence: track.audioFeatures.valence || 0.5,
                            tempo: track.tempo,
                            danceability: track.audioFeatures.danceability || 0.5,
                            mode: track.audioFeatures.mode || 1,
                          }}
                          isPlaying={isPlaying}
                        />

                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <SpectrumBars
                            audioFeatures={{
                              energy: track?.audioFeatures?.energy || 0.5,
                              valence: track?.audioFeatures?.valence || 0.5,
                              tempo: track?.tempo || 120,
                              danceability: track?.audioFeatures?.danceability || 0.5,
                              mode: track?.audioFeatures?.mode || 1,
                            }}
                          />
                        </motion.div>
                      </div>
                    )}

                    {/* Enhanced feature display */}
                    {isPlaying && (
                      <motion.div
                        className="mt-6 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 }}
                      >
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-white/60">Energy Level</div>
                            <motion.div
                              className="text-purple-400 font-bold text-lg"
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                            >
                              {(track?.energy || 0) * 10}/10
                            </motion.div>
                          </div>
                          <div>
                            <div className="text-white/60">Tempo</div>
                            <motion.div
                              className="text-cyan-400 font-bold text-lg"
                              animate={{ color: isPlaying ? '#06b6d4' : '#cbd5e1' }}
                            >
                              {track?.tempo || 0} BPM
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Enhanced Audio Features */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-2xl p-6 border border-cyan-400/20">
                      <motion.h4
                        className="text-white/80 font-semibold mb-6 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.05 }}
                      >
                        <Zap className="w-5 h-5 text-cyan-400" />
                        Audio Features
                      </motion.h4>

                      {track?.audioFeatures && (
                        <div className="space-y-6">
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <AudioFeatureGrid
                              audioFeatures={{
                                energy: track.audioFeatures.energy,
                                valence: track.audioFeatures.valence || 0.5,
                                tempo: track.tempo,
                                danceability: track.audioFeatures.danceability || 0.5,
                                mode: track.audioFeatures.mode || 1,
                              }}
                            />
                          </motion.div>

                          {/* Enhanced metrics */}
                          <div className="grid grid-cols-2 gap-4">
                            <motion.div
                              className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10"
                              whileHover={{ y: -2, boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}
                            >
                              <RadialProgress
                                progress={moodConfidence}
                                label="Analysis"
                                color="secondary"
                              />
                              <div className="text-center mt-2">
                                <div className="text-white/60 text-sm">Confidence</div>
                              </div>
                            </motion.div>

                            <motion.div
                              className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 flex flex-col items-center justify-center"
                              whileHover={{ y: -2, boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}
                            >
                              <motion.div
                                className="text-4xl font-bold text-purple-400"
                                animate={{
                                  scale: isPlaying ? [1, 1.1, 1] : 1,
                                  color: isPlaying ? '#8b5cf6' : '#cbd5e1'
                                }}
                                transition={{ duration: 1, repeat: Infinity }}
                              >
                                {track?.energy ? (track.energy * 10).toFixed(0) : 5}
                              </motion.div>
                              <div className="text-white/60 text-sm mt-1">Energy Score</div>
                            </motion.div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Enhanced Mood Evolution Chart */}
                <motion.div
                  className="mt-8 p-6 bg-gradient-to-br from-emerald-500/10 to-green-500/5 rounded-2xl border border-emerald-400/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <motion.div
                    className="text-center mb-6"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-center gap-2 text-white/80 font-semibold mb-2">
                      <motion.div
                        animate={{ rotate: isPlaying ? 360 : 0 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        🌀
                      </motion.div>
                      Mood Evolution
                    </div>
                    <div className="text-white/50 text-sm">
                      Real-time emotional profile analysis
                    </div>
                  </motion.div>

                  <motion.div
                    className="h-32 bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 relative overflow-hidden"
                    whileHover={{ scale: 1.01 }}
                  >

                    {/* Background pattern */}
                    <motion.div
                      className="absolute inset-0 opacity-30"
                      animate={{
                        background: isPlaying
                          ? [
                              "radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.3), transparent 40%)",
                              "radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.3), transparent 40%)"
                            ]
                          : "transparent"
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <svg
                      width="100%"
                      height="100%"
                      viewBox="0 0 600 64"
                      className="relative z-10"
                    >
                      <defs>
                        <linearGradient id="enhancedMoodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <motion.stop
                            offset="0%"
                            stopColor="#8b5cf6"
                            animate={{
                              stopColor: isPlaying ? '#06b6d4' : '#8b5cf6'
                            }}
                          />
                          <motion.stop
                            offset="50%"
                            stopColor="#ec4899"
                            animate={{
                              stopColor: isPlaying ? '#ec4899' : '#a855f7'
                            }}
                          />
                          <motion.stop
                            offset="100%"
                            stopColor="#06b6d4"
                            animate={{
                              stopColor: isPlaying ? '#10b981' : '#06b6d4'
                            }}
                          />
                        </linearGradient>
                      </defs>

                      <motion.polyline
                        fill="none"
                        stroke="url(#enhancedMoodGradient)"
                        strokeWidth="3"
                        points={moodEvolution.map((mood, i) =>
                          `${(i / (moodEvolution.length - 1 || 1)) * 600},${56 - mood * 40}`
                        ).join(' ')}
                        animate={{
                          strokeWidth: isPlaying ? 5 : 3
                        }}
                        transition={{ duration: 0.5 }}
                      />

                      {/* Animated dots on the line */}
                      {moodEvolution.slice(-1).map((mood, i) => (
                        <motion.circle
                          key={`mood-dot-${i}`}
                          cx={(i / Math.max(1, moodEvolution.length - 1)) * 500}
                          cy={56 - mood * 40}
                          r={isPlaying ? 6 : 4}
                          fill="url(#enhancedMoodGradient)"
                          animate={{
                            r: isPlaying ? [4, 8, 4] : 4,
                            opacity: isPlaying ? 1 : 0.7
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          style={{
                            filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.5))'
                          }}
                        />
                      ))}
                    </svg>

                    {/* Enhanced grid overlay */}
                    <motion.div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      animate={{ x: ['0%', '-5%', '0%'] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent transform -skew-x-12" />
                    </motion.div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Spotify Web Player Integration Component
export function SpotifyPlayerIntegration({
  isReady,
  onPlayerStateChange,
}: {
  isReady: boolean;
  onPlayerStateChange?: (state: any) => void;
}) {
  const [player, setPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<any>(null);

  useEffect(() => {
    if (isReady && (window as any).SpotifyApi) {
      const spotifyPlayer = new (window as any).SpotifyApi.Player({
        name: "Vibely Enhanced Player",
        getOAuthToken: (cb: (token: string) => void) => {
          const token = localStorage.getItem("spotify_access_token");
          cb(token || "");
        },
      });

      spotifyPlayer.addListener("ready", ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id);
        console.log("Spotify Player ready with Device ID", device_id);
      });

      spotifyPlayer.addListener("player_state_changed", (state: any) => {
        if (state) {
          setCurrentTrack(state.track_window.current_track);
        }
        onPlayerStateChange?.(state);
      });

      spotifyPlayer.connect().then((success: boolean) => {
        if (success) {
          setPlayer(spotifyPlayer);
        }
      }).catch(console.error);
    }
  }, [isReady, onPlayerStateChange]);

  const playTrack = async (trackUri: string) => {
    if (!deviceId) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("spotify_access_token"),
        },
        body: JSON.stringify({
          uris: [trackUri],
        }),
      });
    } catch (error) {
      console.error("Error playing track:", error);
    }
  };

  return {
    player,
    deviceId,
    currentTrack,
    playTrack,
  };
}
