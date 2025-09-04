"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle,
  Heart, Share, Download, Zap, Sparkles, Music, Users, Palette,
  Infinity, Wand2, Crown, Star, MessageCircle
} from "lucide-react";
import type { VibelyTrack } from "@/lib/data";

// Enhanced Background System Component
function EnhancedBackgroundSystem({
  isPlaying,
  vibeIntensity,
  currentVibe,
  track
}: {
  isPlaying: boolean;
  vibeIntensity: number;
  currentVibe: string;
  track: VibelyTrack | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Physics-based particle states
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    opacity: number;
    trail: Array<{x: number, y: number}>;
  }>>([]);

  // Liquid morphing state
  const [liquidPath, setLiquidPath] = useState("");

  // Gradient morphing state
  const [gradientStops, setGradientStops] = useState([
    {offset: "0%", color: "rgba(139, 92, 246, 0.3)"},
    {offset: "50%", color: "rgba(6, 182, 212, 0.3)"},
    {offset: "100%", color: "rgba(139, 92, 246, 0.3)"}
  ]);

  // Initialize advanced particles
  useEffect(() => {
    const initialParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 4 + 2,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      opacity: Math.random() * 0.8 + 0.2,
      trail: []
    }));
    setParticles(initialParticles);
  }, []);

  // Advanced physics simulation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setParticles(prevParticles =>
        prevParticles.map(particle => {
          // Physics calculations
          let newX = particle.x + particle.vx;
          let newY = particle.y + particle.vy;

          // Boundary bounce with energy loss
          if (newX <= 0 || newX >= window.innerWidth) {
            particle.vx *= -0.8;
            newX = Math.max(0, Math.min(window.innerWidth, newX));
          }
          if (newY <= 0 || newY >= window.innerHeight) {
            particle.vy *= -0.8;
            newY = Math.max(0, Math.min(window.innerHeight, newY));
          }

          // Add gravity toward center when energy is high
          if (vibeIntensity > 0.7) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const dx = centerX - newX;
            const dy = centerY - newY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
              particle.vx += (dx / distance) * 0.1 * vibeIntensity;
              particle.vy += (dy / distance) * 0.1 * vibeIntensity;
            }
          }

          // Update trail
          const newTrail = [...particle.trail, {x: newX, y: newY}].slice(-10);

          // Apply air resistance
          particle.vx *= 0.99;
          particle.vy *= 0.99;

          return {
            ...particle,
            x: newX,
            y: newY,
            trail: newTrail,
            opacity: particle.opacity * (0.98 + vibeIntensity * 0.02)
          };
        })
      );
    }, 16); // 60fps

    return () => clearInterval(interval);
  }, [isPlaying, vibeIntensity]);

  // Dynamic gradient morphing
  useEffect(() => {
    if (!isPlaying) return;

    const morphGradient = () => {
      setGradientStops(prevStops =>
        prevStops.map((stop, index) => {
          const hue = ((index * 120 + Date.now() * 0.05 * vibeIntensity) % 360);
          const saturation = 70 + Math.sin(Date.now() * 0.001 + index) * 20;
          const lightness = 50 + Math.cos(Date.now() * 0.001 + index * 2) * 30;

          return {
            ...stop,
            color: `hsl(${hue}, ${saturation}%, ${lightness}%)`
          };
        })
      );
    };

    const interval = setInterval(morphGradient, 100);
    return () => clearInterval(interval);
  }, [isPlaying, vibeIntensity]);

  // Generate liquid morphing path
  useEffect(() => {
    const generateLiquidPath = () => {
      let path = "M0,0";

      for (let i = 0; i <= window.innerWidth; i += 50) {
        const amplitude = 100 * vibeIntensity * (isPlaying ? Math.sin(i * 0.01 + Date.now() * 0.002) : 1);
        const y = window.innerHeight / 2 + amplitude;
        path += `L${i},${y}`;
      }

      path += `L${window.innerWidth},${window.innerHeight}L0,${window.innerHeight}Z`;
      setLiquidPath(path);
    };

    if (isPlaying) {
      const interval = setInterval(generateLiquidPath, 50);
      return () => clearInterval(interval);
    }
  }, [isPlaying, vibeIntensity]);

  const gradientString = `linear-gradient(45deg, ${gradientStops.map(stop => stop.color).join(', ')})`;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {/* Animated gradient backgrounds */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: isPlaying ? [
            `radial-gradient(circle at 20% 20%, rgba(139, 92, 246, ${vibeIntensity * 0.3}), transparent 70%)`,
            `radial-gradient(circle at 80% 80%, rgba(6, 182, 212, ${vibeIntensity * 0.6}), transparent 70%)`,
            `radial-gradient(circle at 50% 30%, rgba(236, 72, 153, ${vibeIntensity * 0.4}), transparent 70%)`
          ] : "transparent"
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Physics-based particles */}
      <AnimatePresence>
        {isPlaying && particles.map(particle => (
          <div key={particle.id}>
            {/* Main particle */}
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                opacity: particle.opacity
              }}
              animate={{
                scale: [1, 1.5, 1],
                boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2
              }}
            />

            {/* Particle trail */}
            {particle.trail.map((pos, index) => (
              <motion.div
                key={`${particle.id}-trail-${index}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: particle.size * (1 - index / particle.trail.length),
                  height: particle.size * (1 - index / particle.trail.length),
                  backgroundColor: particle.color
                }}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1 }}
              />
            ))}
          </div>
        ))}
      </AnimatePresence>

      {/* Liquid morphing overlay */}
      {isPlaying && (
        <motion.svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ filter: "blur(40px) opacity(0.1)" }}
        >
          <motion.path
            d={liquidPath}
            fill="url(#liquidGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: vibeIntensity }}
            transition={{ duration: 2 }}
          />
          <defs>
            <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              {gradientStops.map((stop, index) => (
                <stop key={index} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
          </defs>
        </motion.svg>
      )}

      {/* Dynamic lighting effects */}
      {isPlaying && (
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              `radial-gradient(circle at 20% 20%, rgba(255, 255, 255, ${vibeIntensity * 0.1}), transparent 40%)`,
              `radial-gradient(circle at 80% 80%, rgba(255, 255, 255, ${vibeIntensity * 0.05}), transparent 60%)`
            ]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </div>
  );
}

interface ImmersiveMusicPlayerProps {
  track: VibelyTrack | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
  duration: number;
  currentTime: number;
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

export function ImmersiveMusicPlayer({
  track, isPlaying, progress, volume, duration, currentTime,
  onPlayPause, onSkipNext, onSkipPrevious, onSeek,
  onVolumeChange, onToggleShuffle, onToggleRepeat,
  shuffleEnabled = false, repeatMode = "off"
}: ImmersiveMusicPlayerProps) {

  // Core state management
  const [currentVibe, setCurrentVibe] = useState('ambient');
  const [showSocial, setShowSocial] = useState(false);
  const [liked, setLiked] = useState(false);
  const [gestureMode, setGestureMode] = useState(false);
  const [vibeIntensity, setVibeIntensity] = useState(0.5);
  const [userVibes, setUserVibes] = useState([]);
  const [showDiscovery, setShowDiscovery] = useState(false);

  // 3D motion for immersive experience
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const tiltX = useTransform(mouseY, [-300, 300], [10, -10]);
  const tiltY = useTransform(mouseX, [-300, 300], [-10, 10]);

  // Get current vibe based on track analysis
  const getVibeAnalysis = useCallback(() => {
    if (!track?.audioFeatures) return 'ambient';

    const { valence, energy, danceability, tempo } = track.audioFeatures;

    if (valence > 0.7 && energy > 0.8) return 'euphoric';
    if (valence < 0.3 && energy < 0.3) return 'introspective';
    if (danceability > 0.8 && energy > 0.7) return 'dance';
    if (valence > 0.6 && energy > 0.6) return 'energetic';
    if (energy > 0.7 && danceability < 0.5) return 'intense';
    return 'ambient';
  }, [track]);

  useEffect(() => {
    setCurrentVibe(getVibeAnalysis());
    setVibeIntensity(track?.energy || 0.5);
  }, [track, getVibeAnalysis]);

  // Mouse tracking for 3D effects
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);

    if (gestureMode && e.buttons > 0) {
      // Handle gesture-based seeking
      const seekProgress = (e.clientX - rect.left) / rect.width;
      onSeek(seekProgress * 100);
    }
  };

  // Enhanced gesture controls
  const handleDoubleClick = () => setLiked(!liked);
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowSocial(!showSocial);
  };

  const handleVolumeGesture = (e: React.MouseEvent) => {
    if (gestureMode) {
      const newVolume = ((e.clientY - 100) / 300) * 100;
      onVolumeChange(Math.max(0, Math.min(100, newVolume)));
    }
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressClicked = (clickX / rect.width) * 100;
    onSeek(progressClicked);
  };

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black overflow-hidden"
      style={{
        transform: `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        transformStyle: 'preserve-3d'
      }}
      onMouseMove={handleMouseMove}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onClick={handleVolumeGesture}
    >

      {/* 🎪 ENHANCED VISUAL BACKGROUND ENGINE */}
      <EnhancedBackgroundSystem
        isPlaying={isPlaying}
        vibeIntensity={vibeIntensity}
        currentVibe={currentVibe}
        track={track}
      />

      {/* 🎯 MAIN TRACK VISUALIZATION */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">

        {/* 🎨 ALBUM COVER WITH IMMERSIVE EFFECTS */}
        {track?.originalCoverUrl && (
          <motion.div
            className="relative mb-12"
            animate={{
              rotate: isPlaying ? 360 : 0,
              scale: isPlaying ? [1, 1.1, 1] : 1,
              rotateX: tiltX,
              rotateY: tiltY
            }}
            transition={{
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity },
              rotateX: { type: "spring", stiffness: 300, damping: 25 },
              rotateY: { type: "spring", stiffness: 300, damping: 25 }
            }}
            style={{ transformStyle: 'preserve-3d' }}
          >

            {/* Album cover with holographic effect */}
            <motion.img
              src={track.originalCoverUrl}
              alt={track.title}
              className="w-96 h-96 rounded-3xl object-cover shadow-2xl border-4 border-white/20"
              style={{
                boxShadow: isPlaying
                  ? `0 0 100px rgba(139, 92, 246, 0.6), 0 25px 50px rgba(0,0,0,0.5)`
                  : '0 25px 50px rgba(0,0,0,0.5)',
                transform: 'translateZ(50px)'
              }}
              animate={{
                borderColor: isPlaying ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.2)'
              }}
              transition={{ duration: 1 }}
            />

            {/* Pulsing energy rings */}
            {isPlaying && (
              <div className="absolute inset-0 rounded-3xl">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-3xl border-2"
                    style={{
                      borderColor: `hsl(${120 + i * 30}, 70%, 60%)`,
                      transform: 'translateZ(40px)'
                    }}
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.6, 0.2, 0.6]
                    }}
                    transition={{
                      duration: 3 + i * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 🎭 TRACK INFO & VIBE DISPLAY */}
        <motion.div
          className="text-center mb-12 max-w-4xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >

          {/* Main track title with animated text effects */}
          <motion.h1
            className="text-8xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
            animate={{
              textShadow: isPlaying
                ? '0 0 50px rgba(139,92,246,0.8), 0 0 100px rgba(139,92,246,0.4)'
                : '0 0 0 0',
              backgroundPosition: isPlaying ? ['0% 50%', '100% 50%', '0% 50%'] : '0% 50%'
            }}
            transition={{
              textShadow: { duration: 2, repeat: Infinity },
              backgroundPosition: { duration: 4, repeat: Infinity }
            }}
          >
            {track?.title || "Discover Your Perfect Vibe"}
          </motion.h1>

          <motion.p
            className="text-3xl text-gray-300 mb-8 font-light"
            animate={{
              opacity: isPlaying ? [0.7, 1, 0.7] : 0.7,
              textShadow: isPlaying ? '0 0 20px rgba(139,92,246,0.3)' : 'none'
            }}
            transition={{
              opacity: { duration: 2, repeat: Infinity }
            }}
          >
            {track?.artist || "Let AI curate your musical journey"}
          </motion.p>

          {/* Current vibe indicator */}
          <motion.div
            className="flex items-center justify-center gap-6 mb-8"
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              className="flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20"
              animate={{
                borderColor: isPlaying ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.2)',
                boxShadow: isPlaying
                  ? '0 10px 30px rgba(139,92,246,0.3)'
                  : '0 5px 15px rgba(0,0,0,0.3)'
              }}
            >
              <Sparkles className="text-purple-400 w-8 h-8" />
              <span className="text-2xl font-semibold text-white capitalize">
                {currentVibe}
              </span>
              <motion.div
                animate={{
                  rotate: isPlaying ? 360 : 0,
                  scale: isPlaying ? [1, 1.2, 1] : 1
                }}
                transition={{
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1, repeat: Infinity }
                }}
              >
                <Zap className="text-yellow-400 w-6 h-6" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* AI-Powered mood analysis bars */}
          {track?.audioFeatures && (
            <motion.div
              className="flex items-center justify-center gap-12 mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {[
                { name: 'Energy', value: track.audioFeatures.energy || 0 },
                { name: 'Mood', value: track.audioFeatures.valence || 0 },
                { name: 'Flow', value: track.audioFeatures.danceability || 0 },
                { name: 'Acoustic', value: track.audioFeatures.acousticness || 0 }
              ].map((metric, i) => (
                <motion.div
                  key={metric.name}
                  className="flex flex-col items-center gap-3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4 + i * 0.1 }}
                >
                  <motion.div
                    className="text-white/70 text-lg font-medium mb-2"
                    whileHover={{ color: 'white' }}
                  >
                    {metric.name}
                  </motion.div>

                  <motion.div
                    className="relative w-6 h-32 bg-white/10 rounded-full overflow-hidden"
                    whileHover={{ scale: 1.1 }}
                  >
                    <motion.div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-purple-400 via-pink-400 to-cyan-400 rounded-full"
                      style={{ height: `${metric.value * 100}%` }}
                      initial={{ height: '0%' }}
                      animate={{ height: `${metric.value * 100}%` }}
                      transition={{ duration: 2, ease: "easeOut", delay: 1.6 + i * 0.1 }}
                    />

                    {/* Animated energy particles in bars */}
                    {isPlaying && (
                      <motion.div
                        className="absolute w-full h-2 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                        animate={{
                          y: ['0%', '100%']
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                          delay: i * 0.5
                        }}
                      />
                    )}
                  </motion.div>

                  <motion.span
                    className="text-white/60 text-sm font-mono mt-2"
                    animate={{
                      color: isPlaying ? 'white' : 'rgb(156, 163, 175)'
                    }}
                  >
                    {(metric.value * 100).toFixed(0)}%
                  </motion.span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* 🎮 INTERACTIVE CONTROLS PANEL */}
      <motion.div
        className="absolute bottom-0 left-0 w-full p-8"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
      >

        {/* Enhanced progress bar with multiple interaction zones */}
        <motion.div
          className="relative w-full h-4 bg-white/10 backdrop-blur-xl rounded-full cursor-pointer overflow-hidden mb-8 border border-white/20"
          onClick={handleProgressClick}
          whileHover={{ height: 6 }}
          transition={{ duration: 0.3 }}
        >

          {/* Background animated waves */}
          {isPlaying && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20"
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          )}

          {/* Progress fill with gradient animation */}
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-full relative overflow-hidden"
            style={{ width: `${progress}%` }}
            animate={{
              backgroundSize: isPlaying ? ['100%', '200%', '100%'] : '100%'
            }}
            transition={{
              backgroundSize: { duration: 3, repeat: Infinity }
            }}
          >

            {/* Shimmer effect */}
            {isPlaying && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            )}
          </motion.div>

          {/* Interactive progress cursor */}
          <motion.div
            className="absolute top-1/2 transform -translate-y-1/2 -ml-4 w-8 h-8 bg-white rounded-full shadow-2xl border-4 border-purple-400"
            style={{ left: `${progress}%` }}
            animate={{
              scale: isPlaying ? [1, 1.2, 1] : 1,
              boxShadow: isPlaying
                ? '0 0 40px rgba(139,92,246,0.8), 0 0 80px rgba(139,92,246,0.4)'
                : '0 0 20px rgba(139,92,246,0.4)',
              rotate: isPlaying ? [0, 360] : 0
            }}
            transition={{
              scale: { duration: 1.5, repeat: Infinity },
              rotate: { duration: 10, repeat: Infinity, ease: "linear" },
              boxShadow: { duration: 2, repeat: Infinity }
            }}
          >
            {isPlaying && (
              <motion.div
                className="absolute inset-2 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full"
                animate={{ scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.div>
        </motion.div>

        {/* Enhanced control buttons with 3D effects */}
        <motion.div
          className="flex items-center justify-center gap-12 mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 2 }}
        >
          <motion.button
            onClick={onToggleShuffle}
            className={`p-6 rounded-2xl backdrop-blur-xl border transition-all duration-500 ${
              shuffleEnabled
                ? "bg-purple-500/30 border-purple-400 text-white shadow-xl"
                : "bg-white/10 border-white/20 text-white/80 hover:text-white"
            }`}
            whileHover={{
              scale: 1.1,
              rotate: [-5, 5, -5],
              y: -3
            }}
            whileTap={{ scale: 0.95 }}
            style={{ transform: 'translateZ(30px)' }}
          >
            <Shuffle size={32} />
          </motion.button>

          {/* Main play controls */}
          <div className="flex items-center gap-8">
            <motion.button
              whileHover={{
                scale: 1.1,
                rotate: -15,
                x: -8
              }}
              whileTap={{ scale: 0.9 }}
              onClick={onSkipPrevious}
              className="p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white/80 hover:text-white transition-all duration-300"
              style={{ transform: 'translateZ(35px)' }}
            >
              <SkipBack size={36} />
            </motion.button>

            {/* Central play button with spectacular effects */}
            <motion.button
              onClick={onPlayPause}
              className={`relative p-12 rounded-full border-2 transition-all duration-500 overflow-hidden ${
                isPlaying
                  ? "border-purple-400 bg-gradient-to-br from-purple-500/20 to-pink-500/20"
                  : "border-white/30 bg-white/10 hover:bg-white/20"
              }`}
              whileHover={{
                scale: 1.2,
                rotate: [0, 10, -10, 0],
                rotateY: [0, 10, -10, 0]
              }}
              whileTap={{ scale: 0.95 }}
              animate={{
                boxShadow: isPlaying
                  ? [
                      "0 0 100px rgba(139,92,246,0.6)",
                      "0 0 150px rgba(236,72,153,0.4)",
                      "0 0 100px rgba(139,92,246,0.6)"
                    ]
                  : "0 0 40px rgba(139,92,246,0.2)",
                scale: isPlaying ? [1, 1.05, 1] : 1
              }}
              transition={{
                boxShadow: { duration: 4, repeat: Infinity },
                scale: { duration: 2, repeat: Infinity }
              }}
              style={{
                transform: 'translateZ(60px)',
                transformStyle: 'preserve-3d'
              }}
            >
              {isPlaying ? <Pause size={64} /> : <Play size={64} className="ml-3" />}

              {/* Explosive particle effects when playing */}
              {isPlaying && (
                <div className="absolute inset-0">
                  {Array.from({ length: 12 }, (_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                      initial={{
                        x: '50%',
                        y: '50%',
                        scale: 0,
                        opacity: 0
                      }}
                      animate={{
                        x: `${50 + Math.cos(i * 30 * Math.PI / 180) * 100}%`,
                        y: `${50 + Math.sin(i * 30 * Math.PI / 180) * 100}%`,
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "easeOut"
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.button>

            <motion.button
              whileHover={{
                scale: 1.1,
                rotate: 15,
                x: 8
              }}
              whileTap={{ scale: 0.9 }}
              onClick={onSkipNext}
              className="p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white/80 hover:text-white transition-all duration-300"
              style={{ transform: 'translateZ(35px)' }}
            >
              <SkipForward size={36} />
            </motion.button>
          </div>

          <motion.button
            onClick={onToggleRepeat}
            className={`p-6 rounded-2xl backdrop-blur-xl border transition-all duration-500 ${
              repeatMode !== "off"
                ? "bg-green-500/30 border-green-400 text-white shadow-xl"
                : "bg-white/10 border-white/20 text-white/80 hover:text-white"
            }`}
            whileHover={{
              scale: 1.1,
              rotate: [5, -5, 5],
              y: -3
            }}
            whileTap={{ scale: 0.95 }}
            style={{ transform: 'translateZ(30px)' }}
          >
            <Repeat size={32} />
          </motion.button>
        </motion.div>

        {/* Enhanced info and controls bar */}
        <motion.div
          className="flex items-center justify-between mb-6 text-white/80"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5 }}
        >
          <motion.div className="font-mono text-xl flex items-center gap-4">
            <span>{formatTime(currentTime)}</span>
            <span className="opacity-50">/</span>
            <span>{formatTime(duration)}</span>
            <motion.div
              animate={{
                opacity: isPlaying ? [0.3, 1, 0.3] : 0.5
              }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg"
                   style={{ boxShadow: '0 0 20px rgba(139,92,246,0.8)' }} />
            </motion.div>
          </motion.div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <Volume2 size={24} />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-32 h-2 bg-white/20 rounded-full slider opacity-80"
              />
              <span className="font-mono text-lg w-8 text-right">{volume}</span>
            </div>

            <motion.button
              onClick={() => setGestureMode(!gestureMode)}
              className={`px-4 py-2 rounded-xl backdrop-blur-lg border transition-all duration-300 ${
                gestureMode
                  ? "bg-cyan-500/30 border-cyan-400 text-cyan-300"
                  : "bg-white/10 border-white/20 text-white/60 hover:text-white"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Wand2 size={20} />
            </motion.button>
          </div>
        </motion.div>

        {/* Action buttons with enhanced UX */}
        <motion.div
          className="flex items-center justify-center gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3 }}
        >
          <motion.button
            onClick={() => setLiked(!liked)}
            className={`p-6 rounded-2xl backdrop-blur-xl border transition-all duration-300 flex items-center gap-3 ${
              liked
                ? "text-red-400 bg-red-500/20 border-red-400 shadow-xl"
                : "text-white/80 bg-white/10 border-white/20 hover:text-white"
            }`}
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
            animate={liked ? {
              rotate: [0, -10, 10, -5, 5, 0],
              scale: [1, 1.1, 1, 1.05, 1]
            } : {}}
            transition={{ duration: 0.8 }}
            style={{ transform: 'translateZ(25px)' }}
          >
            <Heart className={liked ? "fill-current" : ""} size={24} />
            <span className="text-sm font-medium">
              {liked ? "Loved" : "Love This"}
            </span>
          </motion.button>

          <motion.button
            onClick={() => setShowDiscovery(!showDiscovery)}
            className="p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white/80 hover:text-white transition-all duration-300 flex items-center gap-3"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
            style={{ transform: 'translateZ(25px)' }}
          >
            <Users size={24} />
            <span className="text-sm font-medium">Discover</span>
          </motion.button>

          <motion.button
            onClick={() => setShowSocial(!showSocial)}
            className="p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white/80 hover:text-white transition-all duration-300 flex items-center gap-3"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
            style={{ transform: 'translateZ(25px)' }}
          >
            <Share size={24} />
            <span className="text-sm font-medium">Share</span>
          </motion.button>

          <motion.button
            className="p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white/80 hover:text-white transition-all duration-300 flex items-center gap-3"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
            style={{ transform: 'translateZ(25px)' }}
          >
            <Download size={24} />
            <span className="text-sm font-medium">Save</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// AI-Powered Discovery Panel
export function AIDiscoveryPanel({ onTrackSelect }: { onTrackSelect: (track: any) => void }) {
  const [discoveries, setDiscoveries] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadDiscoveries = async () => {
    setLoading(true);
    // Simulate AI-powered music discovery
    setTimeout(() => {
      setDiscoveries([
        { id: 1, title: "Similar Energy", type: "playlist", count: 25 },
        { id: 2, title: "Artist Deep Cuts", type: "playlist", count: 18 },
        { id: 3, title: "Mood Elevation", type: "playlist", count: 32 },
        { id: 4, title: "Perfect Matches", type: "flags", count: 8 }
      ]);
      setLoading(false);
    }, 1500);
  };

  useEffect(() => {
    loadDiscoveries();
  }, []);

  return (
    <motion.div
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-2xl mx-auto"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-6">
        <motion.h2
          className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-3"
          whileHover={{ scale: 1.05 }}
        >
          <Crown className="text-yellow-400" size={28} />
          AI-Curated Discovery
        </motion.h2>
        <p className="text-white/60">Powered by advanced music intelligence</p>
      </div>

      {loading ? (
        <motion.div
          className="flex justify-center items-center py-12"
          animate={{ scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <div className="flex gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <motion.div
                key={i}
                className="w-4 h-4 bg-purple-400 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {discoveries.map((discovery, i) => (
            <motion.div
              key={discovery.id}
              className="p-4 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-xl border border-white/20 hover:border-purple-400/50 transition-all duration-300 cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">{discovery.title}</h3>
                <span className="text-purple-400 text-lg">⭐</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm capitalize">
                  {discovery.type} · {discovery.count} tracks
                </span>
                <motion.button
                  className="p-2 bg-purple-500/20 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Star size={16} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <motion.button
        className="w-full mt-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center justify-center gap-3"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={loadDiscoveries}
      >
        <Infinity size={20} />
        Generate New Discoveries
      </motion.button>
    </motion.div>
  );
}

// Social Sharing Component
export function SocialSharePanel({ track, onClose }: { track: any, onClose: () => void }) {

  const shareOptions = [
    {
      name: 'Instagram Story',
      icon: '📸',
      platform: 'instagram',
      color: 'bg-gradient-to-r from-red-400 via-pink-500 to-purple-600'
    },
    {
      name: 'Spotify Share',
      icon: '🎵',
      platform: 'spotify',
      color: 'bg-green-400'
    },
    {
      name: 'Twitter',
      icon: '🐦',
      platform: 'twitter',
      color: 'bg-blue-400'
    },
    {
      name: 'Facebook',
      icon: '👥',
      platform: 'facebook',
      color: 'bg-blue-500'
    }
  ];

  return (
    <motion.div
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 50 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl max-w-lg w-full mx-4"
        whileHover={{ scale: 1.02 }}
      >

        {/* Header */}
        <div className="text-center mb-8">
          <motion.h2
            className="text-2xl font-bold text-white mb-3 flex items-center justify-center gap-3"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Share className="text-purple-400" size={28} />
            Share Your Vibe
          </motion.h2>

          {track && (
            <motion.p
              className="text-white/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              "{track.title}" by {track.artist}
            </motion.p>
          )}
        </div>

        {/* Share Options Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {shareOptions.map((option, index) => (
            <motion.button
              key={option.platform}
              className={`p-6 ${option.color} rounded-2xl text-white font-semibold transition-all duration-300 flex flex-col items-center gap-3`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{
                scale: 1.05,
                y: -3,
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
              }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-3xl">{option.icon}</span>
              <span className="text-lg">{option.name}</span>
            </motion.button>
          ))}
        </div>

        {/* Close Button */}
        <motion.button
          onClick={onClose}
          className="w-full py-4 bg-white/10 border border-white/20 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300 font-medium"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Close
        </motion.button>
      </motion.div>

      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
    </motion.div>
  );
}
