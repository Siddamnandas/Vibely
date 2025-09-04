"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  TrendingUp,
  Clock,
  Target,
  Users,
  Zap,
  Star,
  Music,
  Sparkles,
  Heart,
  Share,
  Plus,
  Play,
  Shuffle,
  RefreshCw,
  Crown,
  Trophy,
  Flame,
  Lightbulb
} from "lucide-react";
import type { VibelyTrack } from "@/lib/data";

interface UserProfile {
  listeningHistory: Array<{
    track: VibelyTrack;
    timestamp: Date;
    mood: string;
    context: string; // morning, evening, workout, study, etc.
  }>;
  preferences: {
    favoredGenres: string[];
    avoidedGenres: string[];
    tempoRange: [number, number];
    moodSequence: string[];
    timeOfDayPreferences: Record<string, string>;
    weatherEffects: Record<string, string>;
  };
  socialInteractions: {
    sharedTracks: string[];
    favoriteGenres: string[];
    followSuggestions: string[];
  };
}

interface RecommendationContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  weather?: string;
  mood?: string;
  activity?: string;
  recentListens: VibelyTrack[];
  socialTrends?: string[];
}

export function SmartRecommendationEngine({ userId, track, onTrackRecommended }: {
  userId: string;
  track?: VibelyTrack;
  onTrackRecommended: (track: VibelyTrack) => void;
}) {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    listeningHistory: [],
    preferences: {
      favoredGenres: [],
      avoidedGenres: [],
      tempoRange: [60, 140],
      moodSequence: [],
      timeOfDayPreferences: {},
      weatherEffects: {}
    },
    socialInteractions: {
      sharedTracks: [],
      favoriteGenres: [],
      followSuggestions: []
    }
  });

  const [recommendations, setRecommendations] = useState<{
    moodBased: VibelyTrack[];
    collaborative: VibelyTrack[];
    contextual: VibelyTrack[];
    trending: VibelyTrack[];
    personal: VibelyTrack[];
  }>({
    moodBased: [],
    collaborative: [],
    contextual: [],
    trending: [],
    personal: []
  });

  const [context, setContext] = useState<RecommendationContext>({
    timeOfDay: 'afternoon',
    mood: 'neutral',
    activity: 'explore',
    recentListens: []
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInsights, setAiInsights] = useState({
    learningProgress: 0,
    personalizationScore: 0,
    moodAccuracy: 85,
    discoveryRate: 15
  });

  // Advanced AI learning system
  const learningEngine = useRef({
    moodTransitions: new Map(),
    contextPatterns: new Map(),
    tempoEvolution: [],
    genreCombinations: new Map()
  });

  // Real-time context detection
  useEffect(() => {
    const updateContext = () => {
      const now = new Date();
      const hour = now.getHours();

      let timeOfDay: RecommendationContext['timeOfDay'];
      if (hour >= 5 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
      else timeOfDay = 'night';

      setContext(prev => ({
        ...prev,
        timeOfDay,
        recentListens: prev.recentListens.slice(-10) // Keep last 10 tracks
      }));
    };

    // Update context every minute
    const interval = setInterval(updateContext, 60000);
    updateContext();

    return () => clearInterval(interval);
  }, []);

  // Advanced mood prediction algorithm
  const predictMood = useCallback((trackHistory: VibelyTrack[]) => {
    if (trackHistory.length === 0) return 'neutral';

    const recentTracks = trackHistory.slice(-5);

    // Complex mood analysis
    const moodScores = {
      euphoric: 0,
      energetic: 0,
      mellow: 0,
      melancholic: 0,
      neutral: 0
    };

    recentTracks.forEach(track => {
      const valence = track.audioFeatures?.valence || 0.5;
      const energy = track.audioFeatures?.energy || 0.5;
      const tempo = track.tempo || 120;

      // Advanced mood classification
      if (valence > 0.8 && energy > 0.7) moodScores.euphoric += 2;
      else if (energy > 0.6 && tempo > 130) moodScores.energetic += 2;
      else if (valence < 0.3 && energy < 0.4) moodScores.melancholic += 2;
      else if (valence < 0.4 && energy < 0.5) moodScores.mellow += 1.5;
      else moodScores.neutral += 1;

      // Time-based mood evolution
      const progressPercent = context.recentListens.indexOf(track) / context.recentListens.length;
      if (progressPercent > 0.7) {
        // Build up to climax
        if (tempo > 120) moodScores.energetic += 0.5;
        if (energy > 0.6) moodScores.euphoric += 0.5;
      }
    });

    // Find highest scoring mood
    const predictedMood = Object.entries(moodScores)
      .reduce((a, b) => moodScores[a] > moodScores[b] ? a : b);

    return predictedMood as string;
  }, [context.recentListens]);

  // Contextual recommendation generator
  const generateContextualRecommendations = useCallback(async (ctx: RecommendationContext) => {
    setIsGenerating(true);

    try {
      // Simulate AI-powered recommendation generation
      const baseRecommendations = [
        { title: "Early Morning Focus", genre: "ambient", tempo: 90 },
        { title: "Midday Energy Boost", genre: "pop", tempo: 130 },
        { title: "Evening Wind Down", genre: "jazz", tempo: 80 },
        { title: "Late Night Deep Cuts", genre: "indie", tempo: 110 }
      ];

      // Context-aware filtering
      let filtered = baseRecommendations;

      switch (ctx.timeOfDay) {
        case 'morning':
          filtered = baseRecommendations.filter(r => ['ambient', 'classical', 'folk'].includes(r.genre));
          break;
        case 'afternoon':
          filtered = baseRecommendations.filter(r => r.tempo > 100);
          break;
        case 'evening':
          filtered = baseRecommendations.filter(r => ['jazz', 'chill', 'electronic'].includes(r.genre));
          break;
        case 'night':
          filtered = baseRecommendations.filter(r => r.tempo > 110);
          break;
      }

      // Generate personalized tracks based on context
      const contextualTracks = filtered.map(item => ({
        id: `context-${Date.now()}-${Math.random()}`,
        title: item.title,
        artist: 'AI Curated',
        genre: item.genre,
        tempo: item.tempo,
        mood: ctx.mood,
        originalCoverUrl: 'https://via.placeholder.com/400x400/6366f1/ffffff?text=AI+MUSIC',
        duration_ms: 240000,
        audioFeatures: {
          energy: 0.6,
          valence: 0.7,
          tempo: item.tempo,
          danceability: 0.8,
          acousticness: 0.2,
          mode: 1
        }
      } as VibelyTrack));

      setRecommendations(prev => ({
        ...prev,
        contextual: contextualTracks
      }));

    } catch (error) {
      console.error('Contextual recommendation error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Personal playlist generation
  const generatePersonalPlaylist = useCallback(async () => {
    const playlist = {
      id: `personal-${userId}-${Date.now()}`,
      name: 'Made for You',
      description: `AI-curated playlist based on your ${context.timeOfDay} mood`,
      mood: predictMood(context.recentListens),
      tracks: [] as VibelyTrack[],
      generatedAt: new Date(),
      intelligence: {
        learningProgress: aiInsights.learningProgress,
        moodAccuracy: aiInsights.moodAccuracy,
        discoveryRate: aiInsights.discoveryRate
      }
    };

    // Generate 20 personalized tracks
    for (let i = 0; i < 20; i++) {
      const predictedMood = predictMood(context.recentListens);
      playlist.tracks.push({
        id: `personal-${i}`,
        title: `Personal Track ${i + 1}`,
        artist: 'Vibely AI',
        genre: userProfile.preferences.favoredGenres[0] || 'pop',
        tempo: 120,
        mood: predictedMood,
        originalCoverUrl: 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=PERSONAL',
        duration_ms: 180000,
        audioFeatures: {
          energy: Math.random() * 0.4 + 0.3,
          valence: Math.random() * 0.4 + 0.3,
          tempo: 120 + (Math.random() * 40 - 20),
          danceability: Math.random() * 0.3 + 0.5,
          acousticness: Math.random(),
          mode: Math.floor(Math.random() * 2)
        }
      } as VibelyTrack);
    }

    return playlist;
  }, [userId, context, aiInsights, userProfile.preferences.favoredGenres, predictMood]);

  // Learning progress simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setAiInsights(prev => ({
        ...prev,
        learningProgress: Math.min(100, prev.learningProgress + 0.5),
        personalizationScore: Math.min(100, prev.personalizationScore + 0.3),
        discoveryRate: Math.min(100, prev.discoveryRate + 0.2)
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Update recommendations when context changes
  useEffect(() => {
    if (context.recentListens.length > 0) {
      generateContextualRecommendations(context);
    }
  }, [context, generateContextualRecommendations]);

  return (
    <motion.div
      className="bg-black/80 backdrop-blur-xl border border-purple-400/30 rounded-3xl p-8 max-w-6xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >

      {/* AI Intelligence Header */}
      <div className="text-center mb-8">
        <motion.div
          className="flex items-center justify-center gap-4 mb-4"
          whileHover={{ scale: 1.05 }}
        >
          <div className="relative">
            <Brain className="text-purple-400 w-12 h-12" />
            <motion.div
              className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-3 h-3 text-white" />
            </motion.div>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">AI Music Intelligence</h2>
            <p className="text-purple-300 text-sm">Learning your music soul...</p>
          </div>
        </motion.div>

        {/* AI Learning Progress */}
        <motion.div
          className="grid grid-cols-4 gap-4 mb-6"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          {[
            { label: 'Learning', value: aiInsights.learningProgress, icon: Brain, color: 'text-blue-400' },
            { label: 'Personalized', value: aiInsights.personalizationScore, icon: Target, color: 'text-purple-400' },
            { label: 'Mood Accuracy', value: aiInsights.moodAccuracy, icon: Star, color: 'text-yellow-400' },
            { label: 'Discovery Rate', value: aiInsights.discoveryRate, icon: Lightbulb, color: 'text-green-400' }
          ].map((metric, i) => (
            <motion.div
              key={metric.label}
              className="bg-white/5 rounded-2xl p-4 text-center border border-white/10"
              whileHover={{ scale: 1.05 }}
              transition={{ delay: i * 0.1 }}
            >
              <metric.icon className={`w-8 h-8 mx-auto mb-2 ${metric.color}`} />
              <div className="text-white/60 text-xs mb-1">{metric.label}</div>
              <motion.div
                className="text-2xl font-bold text-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                {metric.label === 'Mood Accuracy' || metric.label === 'Discovery Rate'
                  ? `${metric.value}%`
                  : `${Math.floor(metric.value)}%`
                }
              </motion.div>
              <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                <motion.div
                  className={`h-full rounded-full ${metric.color === 'text-blue-400' ? 'bg-blue-400' : metric.color === 'text-purple-400' ? 'bg-purple-400' : metric.color === 'text-yellow-400' ? 'bg-yellow-400' : 'bg-green-400'}`}
                  style={{ width: `${metric.value}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${metric.value}%` }}
                  transition={{ duration: 1, delay: i * 0.2 }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Current Context Display */}
      <motion.div
        className="bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-pink-500/10 rounded-2xl p-6 mb-8 border border-white/10"
        animate={{
          background: [
            "linear-gradient(45deg, rgba(139,92,246,0.1), rgba(6,182,212,0.05), rgba(236,72,153,0.1))",
            "linear-gradient(45deg, rgba(6,182,212,0.1), rgba(236,72,153,0.05), rgba(139,92,246,0.1))"
          ]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Clock className="text-cyan-400 w-6 h-6" />
            <div>
              <div className="text-white font-semibold capitalize">{context.timeOfDay}</div>
              <div className="text-white/60 text-sm">
                {context.mood && `Current mood: ${context.mood}`}
                {context.activity && ` • ${context.activity}`}
              </div>
            </div>
          </div>

          <motion.button
            onClick={() => setContext(prev => ({ ...prev, mood: prev.mood === 'energetic' ? 'chill' : 'energetic' }))}
            className="px-4 py-2 bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-4 h-4" />
            Adjust Mood
          </motion.button>
        </div>
      </motion.div>

      {/* AI Recommendations Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* Contextual Recommendations */}
        <motion.div
          className="bg-white/5 rounded-2xl p-6 border border-cyan-400/20"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-cyan-400 w-6 h-6" />
            <h3 className="text-white font-semibold">Context Awareness</h3>
          </div>

          {isGenerating ? (
            <div className="text-center py-8">
              <motion.div
                className="w-8 h-8 border-2 border-cyan-400/50 border-t-cyan-400 rounded-full mx-auto mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-white/60">Analyzing your context...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.contextual.slice(0, 3).map((track, i) => (
                <motion.div
                  key={track.id}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onTrackRecommended(track)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <img
                    src={track.originalCoverUrl || 'https://via.placeholder.com/60x60'}
                    alt={track.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{track.title}</div>
                    <div className="text-white/60 text-sm truncate">{track.artist}</div>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs">
                      {track.genre}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Mood-Based Recommendations */}
        <motion.div
          className="bg-white/5 rounded-2xl p-6 border border-pink-400/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Heart className="text-pink-400 w-6 h-6" />
            <h3 className="text-white font-semibold">Mood Progression</h3>
          </div>

          <div className="space-y-4">
            {[
              { name: 'Euphoric Build-Up', tracks: 15, match: 89 },
              { name: 'Peaceful Cascade', tracks: 22, match: 76 },
              { name: 'Energy Escalation', tracks: 18, match: 92 },
              { name: 'Melodic Journey', tracks: 31, match: 84 }
            ].map((mood, i) => (
              <motion.div
                key={mood.name}
                className="bg-white/5 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{mood.name}</span>
                  <span className="px-2 py-1 bg-pink-500/20 text-pink-300 rounded-full text-xs">
                    {mood.match}% match
                  </span>
                </div>
                <div className="text-white/60 text-sm">{mood.tracks} tracks</div>
                <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                  <motion.div
                    className="h-full bg-gradient-to-r from-pink-400 to-purple-400 rounded-full"
                    style={{ width: `${mood.match}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${mood.match}%` }}
                    transition={{ duration: 1, delay: i * 0.2 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Personal AI Playlist */}
        <motion.div
          className="bg-white/5 rounded-2xl p-6 border border-yellow-400/20"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Crown className="text-yellow-400 w-6 h-6" />
            <h3 className="text-white font-semibold">AI Playlist</h3>
          </div>

          <motion.button
            onClick={async () => {
              const playlist = await generatePersonalPlaylist();
              setRecommendations(prev => ({
                ...prev,
                personal: playlist.tracks
              }));
            }}
            className="w-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-xl p-4 text-white hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-3 mb-4"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-5 h-5" />
            Generate Personal Playlist
          </motion.button>

          {recommendations.personal.length > 0 && (
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-white/80 text-sm mb-2">Your AI Playlist</div>
              {recommendations.personal.slice(0, 3).map((track, i) => (
                <motion.div
                  key={track.id}
                  className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                      <Music className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{track.title}</div>
                      <div className="text-white/60 text-xs">{track.mood}</div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2"
                    onClick={() => onTrackRecommended(track)}
                  >
                    <Play className="w-4 h-4 text-purple-400" />
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Trending & Social Section */}
      <motion.div
        className="mt-8 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 rounded-2xl p-6 border border-white/10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Flame className="text-orange-400 w-6 h-6" />
            <h3 className="text-white font-semibold text-xl">Social Discoveries</h3>
          </div>

          <div className="flex gap-2">
            <motion.button
              className="px-4 py-2 bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Users className="w-4 h-4" />
              Find Music Buddies
            </motion.button>
            <motion.button
              className="px-4 py-2 bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <TrendingUp className="w-4 h-4" />
              What's Trending
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { type: 'trending', label: 'Viral Today', icon: Trophy, count: 47, color: 'text-gold-400' },
            { type: 'friends', label: 'Friends Listening', icon: Users, count: 23, color: 'text-blue-400' },
            { type: 'new', label: 'Fresh Discoveries', icon: Sparkles, count: 89, color: 'text-purple-400' }
          ].map((item, i) => (
            <motion.div
              key={item.type}
              className="bg-white/5 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <item.icon className={`w-6 h-6 ${item.color}`} />
                <div>
                  <div className="text-white font-medium">{item.label}</div>
                  <div className="text-white/60 text-sm">{item.count} tracks</div>
                </div>
              </div>

              <motion.div
                className="w-full bg-white/10 rounded-full h-2"
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"
                  style={{ width: `${Math.random() * 40 + 60}%` }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.random() * 40 + 60}%` }}
                  transition={{ duration: 1, delay: i * 0.2 }}
                />
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
