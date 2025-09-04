"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Heart, Shuffle, Zap, Eye, EyeOff, Maximize2, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdaptiveImage } from "@/components/ui/adaptive-image";
import { usePerformanceMetrics } from "@/lib/performance";

interface EnhancedCoverDisplayProps {
  coverUrl: string;
  title?: string;
  artist?: string;
  album?: string;
  mood?: string;
  tempo?: number;
  energy?: number;
  isLiked?: boolean;
  isPremium?: boolean;
  variant: 'thumbnail' | 'medium' | 'large' | 'hero';
  showControls?: boolean;
  showStats?: boolean;
  onLike?: (liked: boolean) => void;
  onRegenerate?: () => void;
  onDownload?: () => void;
  onExpand?: () => void;
  quality?: 'low' | 'medium' | 'high' | 'premium';
  animationDelay?: number;
}

export function EnhancedCoverDisplay({
  coverUrl,
  title,
  artist,
  album,
  mood,
  tempo,
  energy,
  isLiked = false,
  isPremium = false,
  variant = 'medium',
  showControls = true,
  showStats = false,
  onLike,
  onRegenerate,
  onDownload,
  onExpand,
  quality = 'medium',
  animationDelay = 0
}: EnhancedCoverDisplayProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showPremiumOverlay, setShowPremiumOverlay] = useState(false);
  const performanceMetrics = usePerformanceMetrics();
  const imageRef = useRef<HTMLImageElement>(null);

  // Performance tracking
  const startTime = useRef<number>(Date.now());
  const loadStart = useRef<number>(performance.now());

  // Mouse tracking for subtle parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseX, [-1, 1], [-5, 5]);
  const rotateY = useTransform(mouseY, [-1, 1], [5, -5]);
  const scale = useTransform(mouseX, [0, 0.5], [1, 1.02]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left - rect.width / 2) / rect.width);
    mouseY.set((e.clientY - rect.top - rect.height / 2) / rect.height);
  }, [mouseX, mouseY]);

  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
    const loadTime = performance.now() - loadStart.current;
    console.log(`Image loaded in ${(loadTime).toFixed(2)}ms for ${title || 'Cover'}`);
    performanceMetrics.monitorInteraction(`image-load-${title || 'unknown'}`);
  }, [performanceMetrics, title]);

  const handleLike = useCallback(() => {
    if (onLike) {
      onLike(!isLiked);
      performanceMetrics.monitorInteraction(`${isLiked ? 'unlike' : 'like'}-cover`);
    }
  }, [onLike, isLiked, performanceMetrics]);

  const handleRegenerate = useCallback(() => {
    if (onRegenerate) {
      onRegenerate();
      performanceMetrics.monitorInteraction('regenerate-cover');
    }
  }, [onRegenerate, performanceMetrics]);

  const handleDownload = useCallback(() => {
    if (onDownload && (isPremium || quality !== 'premium')) {
      onDownload();
      performanceMetrics.monitorInteraction('download-cover');
    } else {
      setShowPremiumOverlay(true);
    }
  }, [onDownload, isPremium, quality, performanceMetrics]);

  const handleExpand = useCallback(() => {
    if (onExpand) {
      onExpand();
      performanceMetrics.monitorInteraction('expand-cover');
    }
  }, [onExpand, performanceMetrics]);

  // Determine cover dimensions based on variant
  const getDimensions = () => {
    switch (variant) {
      case 'thumbnail': return { width: 120, height: 120, rounded: 'rounded-xl' };
      case 'medium': return { width: 200, height: 200, rounded: 'rounded-2xl' };
      case 'large': return { width: 300, height: 300, rounded: 'rounded-3xl' };
      case 'hero': return { width: 400, height: 400, rounded: 'rounded-[32px]' };
      default: return { width: 200, height: 200, rounded: 'rounded-2xl' };
    }
  };

  const { width, height, rounded } = getDimensions();

  // Quality settings
  const qualitySettings = {
    low: { quality: 70, blurDataURL: "L9Eh6LI:H}=r=$dI]I.UQG^xZC" },
    medium: { quality: 80, blurDataURL: "L9Eh6LI:H}=r=$dI]I.UQG^xZC;m" },
    high: { quality: 90, blurDataURL: "L9Eh6LI:H}=r=$dI]I.UQG^xZC;n^" },
    premium: { quality: 100, blurDataURL: "L9Eh6LI:H}=r=$dI]I.UQG^xZC;n{" }
  };

  const currentQuality = qualitySettings[quality];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        delay: animationDelay,
        duration: 0.5,
        type: "spring",
        stiffness: 100
      }
    },
    hover: {
      scale: variant === 'thumbnail' ? 1.05 : 1.02,
      y: -4,
      transition: { duration: 0.2 }
    }
  };

  const shimmerVariants = {
    hidden: { x: "-100%" },
    visible: {
      x: "100%",
      transition: {
        repeat: Infinity,
        duration: 2,
        ease: "easeInOut"
      }
    }
  };

  // Generate mood-based gradient
  const getMoodGradient = () => {
    const moodGradients = {
      happy: "from-yellow-400 via-red-500 to-pink-600",
      sad: "from-blue-500 via-purple-600 to-indigo-800",
      energetic: "from-orange-400 via-red-500 to-pink-600",
      calm: "from-blue-400 via-cyan-500 to-teal-600",
      focus: "from-green-400 via-teal-500 to-cyan-600",
      romantic: "from-pink-400 via-purple-500 to-indigo-600"
    };
    return moodGradients[mood as keyof typeof moodGradients] || "from-gray-400 via-slate-500 to-zinc-600";
  };

  return (
    <motion.div
      ref={imageRef}
      className={classNames(
        "relative group overflow-hidden",
        `w-${width} h-${height}`,
        rounded,
        "bg-gradient-to-br from-black/20 to-black/40"
      )}
      style={{ width, height, cursor: showControls ? 'pointer' : 'default' }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Loading skeleton */}
      <AnimatePresence>
        {!isImageLoaded && (
          <motion.div
            className={classNames(
              "absolute inset-0 flex items-center justify-center",
              rounded,
              "bg-gradient-to-br from-gray-700 to-gray-800"
            )}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              <div className="text-xs text-white/60">Loading...</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium shimmer effect */}
      {isPremium && (
        <motion.div
          className={classNames(
            "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent",
            rounded
          )}
          variants={shimmerVariants}
          initial="hidden"
          animate="visible"
          style={{ mixBlendMode: 'overlay' }}
        />
      )}

      {/* Main cover image */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          scale
        }}
        className="w-full h-full"
      >
        <AdaptiveImage
          src={coverUrl}
          alt={`${title || 'Album cover'} - ${artist || 'Unknown artist'}`}
          fill
          quality={currentQuality.quality}
          sizes={`${width}px`}
          className="object-cover"
          fallbackSrc="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&crop=center"
          placeholder="blur"
          blurDataURL={currentQuality.blurDataURL}
          priority={variant === 'hero'}
          onLoad={handleImageLoad}
          style={{
            transform: isImageLoaded
              ? 'scale(1)'
              : 'scale(1.02)', // Slight scale for blur-to-sharp effect
            transition: 'transform 0.3s ease-out'
          }}
        />
      </motion.div>

      {/* Mood-based gradient overlay */}
      {mood && (
        <motion.div
          className={classNames(
            "absolute inset-0 opacity-0 bg-gradient-to-br",
            getMoodGradient()
          )}
          animate={isHovered ? { opacity: 0.3 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Quality badge */}
      {quality === 'premium' && (
        <motion.div
          className="absolute top-2 left-2 z-20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Badge className="bg-[#9FFFA2] text-black font-bold text-xs shadow-lg">
            <Zap className="w-3 h-3 mr-1" />
            HD
          </Badge>
        </motion.div>
      )}

      {/* Interactive controls overlay */}
      <AnimatePresence>
        {isHovered && showControls && (
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex gap-2">
              {/* Like button */}
              <motion.button
                onClick={handleLike}
                className={classNames(
                  "p-3 rounded-full transition-all duration-200",
                  isLiked
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-white/20 hover:bg-white/30 text-white"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </motion.button>

              {/* Regenerate button */}
              {onRegenerate && (
                <motion.button
                  onClick={handleRegenerate}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Shuffle className="w-5 h-5" />
                </motion.button>
              )}

              {/* Download button */}
              <motion.button
                onClick={handleDownload}
                className={classNames(
                  "p-3 rounded-full transition-all duration-200",
                  (!isPremium && quality === 'premium')
                    ? "bg-[#9FFFA2] hover:bg-[#9FFFA2]/80 text-black"
                    : "bg-white/20 hover:bg-white/30 text-white"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                disabled={!isPremium && quality === 'premium'}
              >
                <Download className="w-5 h-5" />
              </motion.button>

              {/* Expand button */}
              {variant !== 'hero' && onExpand && (
                <motion.button
                  onClick={handleExpand}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Maximize2 className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium upgrade overlay */}
      <AnimatePresence>
        {showPremiumOverlay && (
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center bg-white/10 rounded-2xl p-6 max-w-xs"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-[#9FFFA2]" />
              <h3 className="text-lg font-bold text-white mb-2">Premium Feature</h3>
              <p className="text-white/70 text-sm mb-4">
                HD downloads are available with Premium
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-[#9FFFA2] text-black hover:bg-[#9FFFA2]/90 flex-1"
                  onClick={() => {
                    setShowPremiumOverlay(false);
                    // Trigger premium upgrade flow
                  }}
                >
                  Upgrade
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPremiumOverlay(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats overlay (for admin/developer view) */}
      {showStats && (
        <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg p-2 text-xs text-white/80 space-y-1">
          <div className="flex justify-between">
            <span>Quality:</span>
            <span>{quality.toUpperCase()}</span>
          </div>
          {tempo && (
            <div className="flex justify-between">
              <span>Tempo:</span>
              <span>{tempo} BPM</span>
            </div>
          )}
          {energy && (
            <div className="flex justify-between">
              <span>Energy:</span>
              <span>{Math.round(energy * 100)}%</span>
            </div>
          )}
          {mood && (
            <div className="flex justify-between">
              <span>Mood:</span>
              <span>{mood}</span>
            </div>
          )}
        </div>
      )}

      {/* Mobile touch indicator */}
      {variant === 'thumbnail' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-transparent to-black/30 rounded-xl pointer-events-none"
          animate={isHovered ? { opacity: 0.5 } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  );
}

export default EnhancedCoverDisplay;
