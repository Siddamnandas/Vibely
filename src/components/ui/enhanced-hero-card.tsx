"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Play, Sparkles, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { AdaptiveImage } from "@/components/ui/adaptive-image";
import classNames from "classnames";

interface EnhancedHeroCardProps {
  nameTop: string;
  nameBottom: string;
  photoUrl: string;
  chips: string[];
  topSong?: {
    title: string;
    artist: string;
    coverUrl: string;
  };
  stats?: {
    coversCreated: number;
    totalGenerations: number;
    premiumStatus?: boolean;
  };
  onProfileClick?: () => void;
  onTopSongClick?: () => void;
}

export function EnhancedHeroCard({
  nameTop,
  nameBottom,
  photoUrl,
  chips,
  topSong,
  stats,
  onProfileClick,
  onTopSongClick
}: EnhancedHeroCardProps) {
  const deviceProfile = useDevicePerformance();
  const [isHovered, setIsHovered] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Motion values for parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);

  // Smooth spring transforms for enhanced performance
  const rotateXSpring = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const rotateYSpring = useSpring(rotateY, { stiffness: 300, damping: 30 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      mouseX.set((e.clientX - centerX) / rect.width);
      mouseY.set((e.clientY - centerY) / rect.height);
    };

    const card = cardRef.current;
    if (card) {
      card.addEventListener('mousemove', handleMouseMove);
      return () => card.removeEventListener('mousemove', handleMouseMove);
    }
  }, [mouseX, mouseY]);

  // Floating animation sequence
  const floatingAnimation = {
    y: ["0%", "-2%", "0%"],
    transition: {
      repeat: Infinity,
      duration: 6,
      ease: "easeInOut"
    }
  };

  // Shimmer effect for premium users
  const shimmerVariants = {
    hidden: { x: "-100%" },
    visible: {
      x: "100%",
      transition: {
        repeat: Infinity,
        duration: 2,
        ease: "linear"
      }
    }
  };

  return (
    <motion.div
      ref={cardRef}
      style={{
        rotateY: rotateYSpring,
        rotateX: rotateXSpring,
        transformStyle: "preserve-3d"
      }}
      className="relative h-[65vh] max-h-[720px] w-full perspective-1000"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      animate={floatingAnimation}
    >
      {/* Ambient glow effect behind main card */}
      <motion.div
        className="absolute inset-0 rounded-[40px] opacity-0"
        animate={{
          opacity: showGlow ? 0.3 : 0,
          scale: showGlow ? 1.05 : 1
        }}
        style={{
          background: 'conic-gradient(from 45deg at top left, #ff6f91, #62b6f5, #9fff8e, #ff6f91)',
          filter: 'blur(25px)'
        }}
      />

      {/* Main card with enhanced styling */}
      <motion.div
        className="relative h-full w-full rounded-[40px] overflow-hidden shadow-2xl will-change-transform"
        style={{
          background: 'linear-gradient(135deg, #CFFFD7 0%, #9FFFA2 30%, #B8FFCE 70%, #D8FFE8 100%)',
          transform: 'translateZ(50px)'
        }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Premium shimmer overlay */}
        {stats?.premiumStatus && (
          <motion.div
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -rotate-12 origin-top-left"
            variants={shimmerVariants}
            initial="hidden"
            animate="visible"
            style={{ mixBlendMode: 'overlay' }}
          />
        )}

        {/* Enhanced gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />

        {/* Content container */}
        <div className="relative z-10 h-full p-8 flex items-end">
          {/* Left content */}
          <div className="flex-1 space-y-6">

            {/* Enhanced name display with animations */}
            <motion.div
              className="select-none"
              animate={isHovered ? { scale: 1.02 } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="text-black font-black leading-none tracking-tight"
                style={{
                  fontSize: deviceProfile.isLowEndDevice
                    ? Math.max(52, window?.innerWidth * 0.08)
                    : Math.max(64, window?.innerWidth * 0.12)
                }}
                animate={isHovered ? { textShadow: "0 0 20px rgba(0,0,0,0.3)" } : {}}
              >
                {nameTop}
              </motion.div>
              <motion.div
                className="text-black/45 font-black leading-none tracking-tight -mt-3"
                style={{
                  fontSize: deviceProfile.isLowEndDevice
                    ? Math.max(52, window?.innerWidth * 0.08)
                    : Math.max(64, window?.innerWidth * 0.12)
                }}
                animate={isHovered ? { textShadow: "0 0 20px rgba(0,0,0,0.2)" } : {}}
              >
                {nameBottom}
              </motion.div>
            </motion.div>

            {/* Animated hashtag chips with staggered effects */}
            <div className="grid grid-cols-2 gap-3 w-[70%] max-w-[480px]">
              {chips.map((chip, index) => (
                <motion.div
                  key={chip}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: 0.2 + index * 0.1,
                    duration: 0.5,
                    type: "spring",
                    stiffness: 200
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-3 rounded-full text-white text-[15px] font-bold bg-white/25 backdrop-blur-xl shadow-lg hover:bg-white/30 transition-all duration-200 border border-white/30"
                  style={{
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                  }}
                >
                  {chip}
                </motion.div>
              ))}
            </div>

            {/* Enhanced stats display */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="flex gap-4"
              >
                <Badge
                  variant="outline"
                  className="bg-white/10 text-black border-white/30 backdrop-blur-sm"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  {stats.coversCreated} covers
                </Badge>
                {stats.premiumStatus && (
                  <Badge className="bg-[#9FFFA2] text-black font-bold shadow-lg">
                    <Zap className="w-4 h-4 mr-1" />
                    Premium
                  </Badge>
                )}
              </motion.div>
            )}
          </div>

          {/* Enhanced portrait with better positioning */}
          <motion.div
            className="relative w-[38%] max-w-[420px] aspect-[3/4] mr-8 mb-4"
            animate={isHovered ? { scale: 1.02, rotateY: -5 } : { scale: 1, rotateY: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Portrait container with enhanced shadows */}
            <div className="relative h-full w-full rounded-[32px] overflow-hidden">
              {/* Multiple shadow layers for depth */}
              <div className="absolute inset-0 bg-black opacity-20 rounded-[32px] blur-xl scale-105 transform rotate-2" />
              <div className="absolute inset-0 bg-black opacity-10 rounded-[32px] blur-lg scale-102" />
              <div className="absolute inset-0 bg-black opacity-5 rounded-[32px] blur-md" />

              {/* Main portrait */}
              <motion.div
                className="relative h-full w-full rounded-[32px] overflow-hidden"
                style={{
                  boxShadow: '0 25px 50px rgba(0,0,0,0.4), 0 10px 20px rgba(0,0,0,0.2)',
                  transform: 'translateZ(10px)'
                }}
              >
                <AdaptiveImage
                  src={photoUrl}
                  alt="Profile portrait of user"
                  fill
                  priority
                  quality={90}
                  sizes="(max-width: 1024px) 38vw, 420px"
                  className="object-cover scale-105"
                  fallbackSrc="https://images.unsplash.com/photo-1544006659-f0b21884ce1d?w=640&auto=format&fit=crop"
                  placeholder="blur"
                  loading="eager"
                />

                {/* Interactive overlay */}
                <motion.button
                  onClick={onProfileClick}
                  className="absolute inset-0 bg-black/5 hover:bg-black/20 transition-colors duration-300 flex items-center justify-center cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="bg-white/20 backdrop-blur-lg rounded-full p-3"
                      >
                        <ChevronRight className="w-6 h-6 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Top song preview with enhanced styling */}
        {topSong && (
          <motion.div
            className="absolute top-8 right-8 z-20"
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 1, duration: 0.5, type: "spring" }}
          >
            <motion.button
              onClick={onTopSongClick}
              className="bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl p-4 hover:bg-black/40 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden">
                  <AdaptiveImage
                    src={topSong.coverUrl}
                    alt={`Album cover for ${topSong.title} by ${topSong.artist}`}
                    fill
                    quality={80}
                    className="object-cover"
                    fallbackSrc="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop"
                  />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-white text-sm font-semibold truncate max-w-[120px]">
                    {topSong.title}
                  </div>
                  <div className="text-white/70 text-xs truncate max-w-[120px]">
                    {topSong.artist}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-full bg-white text-black hover:bg-white/90 h-8 w-8 p-0"
                >
                  <Play className="w-4 h-4 ml-0.5" />
                </Button>
              </div>
            </motion.button>
          </motion.div>
        )}
      </motion.div>

      {/* Interactive hover indicators */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -inset-4 rounded-[48px] border-2 border-white/20 pointer-events-none"
            animate={{
              borderColor: ['rgba(255,255,255,0.2)', 'rgba(159,255,162,0.4)', 'rgba(255,255,255,0.2)']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default EnhancedHeroCard;
