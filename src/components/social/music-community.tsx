"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import {
  Heart, MessageCircle, Share2, TrendingUp, Users,
  Music, Play, Pause, SkipForward, SkipBack, Volume2,
  Mic, Headphones, Radio, Star, Crown, Award,
  Activity, Clock, Calendar, MapPin, Hash,
  Zap, Sparkles, Flame, Target, Compass,
  ChevronRight, ChevronLeft, MoreHorizontal,
  User, UserPlus, UserMinus, Settings,
  HeartStraight, StarStraight, CrownStraight,
  Chat, Megaphone, Wifi
} from "lucide-react";

// Core social music community interfaces
interface SocialProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  preferences: {
    genres: string[];
    mood: string[];
    discoveryMode: 'social' | 'algorithmic' | 'both';
    privacy: 'public' | 'friends_only' | 'private';
  };
  stats: {
    followers: number;
    following: number;
    playlistLikes: number;
    trackShouts: number;
    monthlyListeners: number;
  };
  badges: CommunityBadge[];
  socialScore: number;
  lastActive: Date;
  location?: GeoLocation;
  currentlyPlaying?: CurrentTrack;
}

interface CommunityBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: Date;
  category: 'playlist' | 'discovery' | 'social' | 'leaderboard';
}

interface MusicActivity {
  id: string;
  type: ActivityType;
  userId: string;
  trackId?: string;
  playlistId?: string;
  message?: string;
  createdAt: Date;
  likes: number;
  replies: ReplyActivity[];
  metadata: ActivityMetadata;
}

type ActivityType =
  | 'track_like' | 'track_hate'
  | 'track_shout' | 'track_share'
  | 'playlist_create' | 'playlist_like' | 'playlist_share'
  | 'friend_add' | 'now_playing'
  | 'badge_earned' | 'discovery_suggestion'
  | 'trend_joined' | 'genre_explorer'
  | 'mood_shift' | 'recommendation_accepted';

interface ActivityMetadata {
  mood?: string;
  genre?: string;
  tempo?: number;
  energy?: number;
  valence?: number;
  quality?: 'low' | 'medium' | 'high';
  context?: 'workout' | 'study' | 'commute' | 'party' | 'relax';
}

interface ReplyActivity {
  id: string;
  userId: string;
  message: string;
  createdAt: Date;
  likes: number;
}

interface MusicTrend {
  id: string;
  name: string;
  description: string;
  participants: number;
  trendingFactor: number;
  tracks: Array<{
    trackId: string;
    position: number;
    velocity: number; // how fast it's trending
  }>;
  mood: string;
  region?: string;
  startTime: Date;
  peakTime?: Date;
  endTime?: Date;
}

interface SocialDiscovery {
  id: string;
  sourceUserId: string;
  targetUserId: string;
  trackId: string;
  compatibility: number; // 0-1 based on taste matching
  discoveryMethod: 'friend_activity' | 'taste_match' | 'mood_sync' | 'trend_following';
  sharedAt: Date;
  liked?: boolean;
  addedToQueue?: boolean;
}

interface RealTimeChat {
  id: string;
  participants: string[];
  type: 'direct' | 'group' | 'track' | 'playlist' | 'trend';
  subjectId?: string; // track ID, playlist ID, etc.
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'track' | 'playlist' | 'emoji' | 'reaction';
  attachment?: {
    type: 'track' | 'playlist' | 'album';
    id: string;
    name?: string;
  };
  sentAt: Date;
  editedAt?: Date;
  reactions: MessageReaction[];
}

interface MessageReaction {
  userId: string;
  emoji: string;
  addedAt: Date;
}

interface GeoLocation {
  lat: number;
  lng: number;
  city: string;
  country: string;
  timezone: string;
}

interface CurrentTrack {
  trackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  coverUrl: string;
  duration: number;
  progress: number;
  playState: 'playing' | 'paused' | 'stopped';
}

// Main Music Community Component
export function MusicCommunityHub({
  userId,
  selectedTrack,
  onTrackSelect,
  onFriendAdd
}: {
  userId: string;
  selectedTrack?: CurrentTrack;
  onTrackSelect: (trackId: string) => void;
  onFriendAdd: (friendId: string) => void;
}) {
  const [currentUser, setCurrentUser] = useState<SocialProfile | null>(null);
  const [friends, setFriends] = useState<SocialProfile[]>([]);
  const [activities, setActivities] = useState<MusicActivity[]>([]);
  const [trends, setTrends] = useState<MusicTrend[]>([]);

  // Real-time subscriptions
  const [realtimeActivities, setRealtimeActivities] = useState<MusicActivity[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<string[]>([]);
  const [activeChats, setActiveChats] = useState<RealTimeChat[]>([]);

  const [viewMode, setViewMode] = useState<'discovery' | 'social' | 'trends' | 'chats'>('discovery');
  const [isLoading, setIsLoading] = useState(false);

  // AI-powered friend recommendations
  const [friendRecommendations, setFriendRecommendations] = useState<Array<{
    user: SocialProfile;
    compatibility: number;
    reason: string;
  }>>([]);

  // Music taste matcher
  useEffect(() => {
    initializeUserProfile();
    loadSocialData();
    subscribeToRealtimeUpdates();
  }, [userId]);

  const initializeUserProfile = async () => {
    // Initialize user profile with AI analysis
    const profile: SocialProfile = {
      id: userId,
      username: 'music_lover_' + userId.slice(-4),
      displayName: 'Music Enthusiast',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      bio: 'Discovering the world through music 🎵',
      preferences: {
        genres: ['electronic', 'indie', 'folk'],
        mood: ['energetic', 'relaxed', 'focused'],
        discoveryMode: 'both',
        privacy: 'public'
      },
      stats: {
        followers: 147,
        following: 89,
        playlistLikes: 23,
        trackShouts: 156,
        monthlyListeners: 450
      },
      badges: [
        { id: '1', name: 'Early Adopter', description: 'Beta user since day one', icon: '🚀', rarity: 'rare', earnedAt: new Date(), category: 'social' },
        { id: '2', name: 'Trendsetter', description: 'Started 3 viral music trends', icon: '📈', rarity: 'epic', earnedAt: new Date(), category: 'discovery' }
      ],
      socialScore: 783,
      lastActive: new Date()
    };

    setCurrentUser(profile);
  };

  const loadSocialData = async () => {
    setIsLoading(true);
    try {
      // Simulate loading friends, activities, trends
      setFriends(generateMockFriends(8));
      setActivities(generateMockActivities(25));
      setTrends(generateMockTrends(6));
    } catch (error) {
      console.error('Failed to load social data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToRealtimeUpdates = () => {
    // Simulate realtime subscriptions
    // In production, this would connect to WebSocket/Socket.io
    console.log('Subscribed to realtime music community updates');
  };

  const generateMockFriends = (count: number): SocialProfile[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `friend_${i}`,
      username: `musicfan_${i + 100}`,
      displayName: ['Emma Davis', 'Marcus Chen', 'Sofia Rodriguez', 'Alex Kim', 'Luna Zhang', 'Diego Morales', 'Nina Peterson', 'Jordan Blake'][i],
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=friend_${i}`,
      bio: ['Music curator obsessed with lo-fi', 'Electronic music producer', 'Indie rock enthusiast', 'Hip-hop collector', 'Jazz lover from Tokyo', 'Reggaeton specialist', 'Classical music teacher', 'House music DJ'][i],
      preferences: {
        genres: [['lo-fi', 'ambient'], ['electronic', 'techno'], ['indie', 'rock'], ['hip-hop', 'rap'], ['jazz', 'blues'], ['reggaeton', 'latin'], ['classical', 'opera'], ['house', 'dance']][i],
        mood: [['relaxed', 'chill'], ['energetic', 'party'], ['creative', 'introspective'], ['intense', 'powerful'], ['sophisticated', 'elegant'], ['fun', 'festive'], ['peaceful', 'meditative'], ['uplifting', 'joyful']][i],
        discoveryMode: ['both', 'social', 'algorithmic'][i % 3] as any,
        privacy: ['public', 'friends_only', 'public'][i % 3] as any
      },
      stats: {
        followers: Math.floor(Math.random() * 500) + 50,
        following: Math.floor(Math.random() * 300) + 30,
        playlistLikes: Math.floor(Math.random() * 100) + 5,
        trackShouts: Math.floor(Math.random() * 200) + 10,
        monthlyListeners: Math.floor(Math.random() * 2000) + 100
      },
      badges: [],
      socialScore: Math.floor(Math.random() * 500) + 200,
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Within last 24 hours
      currentlyPlaying: Math.random() > 0.6 ? {
        trackId: `track_${Math.random().toString(36).substr(2, 9)}`,
        trackName: ['Neon Dreams', 'Midnight Coffee', 'Sunset Boulevard', 'Electric Soul', 'Crystal Waters', 'Digital Love', 'Urban Nights'][Math.floor(Math.random() * 7)],
        artistName: ['SynthWave Pro', 'LoFi Beats', 'IndieVision', 'Electronic Minds'][Math.floor(Math.random() * 4)],
        albumName: ['Future Sounds', 'Chill Vibes', 'Urban Dreams'][Math.floor(Math.random() * 3)],
        coverUrl: `https://source.unsplash.com/random/300x300?music&v=${Date.now()}`,
        duration: 180000 + Math.random() * 120000,
        progress: Math.random() * 180000,
        playState: ['playing', 'paused'][Math.floor(Math.random() * 2)] as any
      } : undefined
    }));
  };

  const generateMockActivities = (count: number): MusicActivity[] => {
    const activities: MusicActivity[] = [];
    const types: ActivityType[] = ['track_like', 'track_shout', 'track_share', 'playlist_create', 'playlist_like', 'now_playing'];
    const messages = [
      'This track hits different 🔥',
      'Just discovered this gem',
      'Forever in my rotation now',
      'Gaming soundtrack of the year',
      'Perfect for deep work sessions',
      'Beach days forever',
      'Workout anthem alert!',
      'Study session essential',
      'Late night vibes 💫'
    ];

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const friendIndex = Math.floor(Math.random() * 8);

      activities.push({
        id: `activity_${i}`,
        type,
        userId: `friend_${friendIndex}`,
        trackId: type !== 'playlist_create' ? `track_${Math.random().toString(36).substr(2, 9)}` : undefined,
        playlistId: type.includes('playlist') ? `playlist_${Math.random().toString(36).substr(2, 9)}` : undefined,
        message: Math.random() > 0.3 ? messages[Math.floor(Math.random() * messages.length)] : undefined,
        createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        likes: Math.floor(Math.random() * 20),
        replies: [],
        metadata: {
          mood: ['energetic', 'relaxed', 'focused', 'party', 'chill'][Math.floor(Math.random() * 5)],
          genre: ['electronic', 'indie', 'hip-hop', 'pop', 'jazz'][Math.floor(Math.random() * 5)],
          context: ['workout', 'study', 'commute', 'party', 'relax'][Math.floor(Math.random() * 5)]
        }
      });
    }

    return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  const generateMockTrends = (count: number): MusicTrend[] => {
    const moodTypes = ['energetic', 'chill', 'focused', 'party', 'romantic', 'sad'];
    const descriptions = [
      'High-energy electronic beats trending worldwide',
      'Lo-fi hip-hop for productivity and focus',
      'Summer party anthems taking over',
      'Cozy bedroom pop for late nights',
      'Jazz classics making a comeback',
      'Indie folk with introspective lyrics'
    ];

    return Array.from({ length: count }, (_, i) => ({
      id: `trend_${i}`,
      name: ['SynthWave Rise', 'LoFi Revival', 'Summer Party Hits', 'Bedroom Pop Boom', 'Jazz Renaissance', 'Indie Folk Wave'][i],
      description: descriptions[i],
      participants: Math.floor(Math.random() * 10000) + 1000,
      trendingFactor: Math.random() * 10 + 5,
      tracks: Array.from({ length: 5 }, (_, j) => ({
        trackId: `track_${Math.random().toString(36).substr(2, 9)}`,
        position: j + 1,
        velocity: Math.random() * 2 + 0.5
      })),
      mood: moodTypes[Math.floor(Math.random() * moodTypes.length)],
      startTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    }));
  };

  return (
    <motion.div
      className="fixed top-4 right-4 bottom-4 left-80 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 overflow-hidden"
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
    >

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <motion.div
          className="flex items-center gap-3"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Music Community</h2>
            <p className="text-white/60 text-sm">Discover music together</p>
          </div>
        </motion.div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          {[
            { id: 'discovery', icon: Compass, label: 'Discovery' },
            { id: 'social', icon: Users, label: 'Friends' },
            { id: 'trends', icon: TrendingUp, label: 'Trends' },
            { id: 'chats', icon: MessageCircle, label: 'Chats' }
          ].map(({ id, icon: Icon, label }) => (
            <motion.button
              key={id}
              onClick={() => setViewMode(id as any)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                viewMode === id
                  ? 'bg-purple-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline">{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'discovery' && (
          <DiscoveryView
            currentUser={currentUser}
            friends={friends}
            activities={activities}
            trends={trends}
            onTrackSelect={onTrackSelect}
            onFriendAdd={onFriendAdd}
          />
        )}

        {viewMode === '
