'use client';

import { useState, useEffect, useCallback } from 'react';
import { VibelyTrack } from '@/lib/data';
import { useSpotifyAuth } from '@/hooks/use-spotify-auth';
import { useAppleMusicAuth } from '@/hooks/use-apple-music-auth';
import { spotifyAPI } from '@/lib/spotify';
import appleMusicService from '@/lib/apple-music';

type MusicProvider = 'spotify' | 'apple-music' | null;

interface MusicServiceState {
  provider: MusicProvider;
  isLoading: boolean;
  tracks: VibelyTrack[];
  playlists: Array<{
    id: string;
    name: string;
    description: string;
    trackCount: number;
    coverUrl: string;
  }>;
  error: string | null;
}

export function useMusicService() {
  const spotifyAuth = useSpotifyAuth();
  const appleMusicAuth = useAppleMusicAuth();
  
  const [state, setState] = useState<MusicServiceState>({
    provider: null,
    isLoading: false,
    tracks: [],
    playlists: [],
    error: null,
  });

  // Determine which provider to use
  useEffect(() => {
    if (spotifyAuth.isAuthenticated) {
      setState(prev => ({ ...prev, provider: 'spotify' }));
    } else if (appleMusicAuth.isAuthenticated) {
      setState(prev => ({ ...prev, provider: 'apple-music' }));
    } else {
      setState(prev => ({ ...prev, provider: null }));
    }
  }, [spotifyAuth.isAuthenticated, appleMusicAuth.isAuthenticated]);

  const loadUserTracks = useCallback(async (limit: number = 50) => {
    if (!state.provider) return [];

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let tracks: VibelyTrack[] = [];

      if (state.provider === 'spotify') {
        // Prefer user's top tracks for better taste signals
        const spotifyTracks = (await spotifyAPI.getUserTopTracks('medium_term')).slice(0, limit);
        // Fetch audio features for better mood/tempo
        const trackIds = spotifyTracks.map(t => t.id);
        const features = await spotifyAPI.getAudioFeatures(trackIds);
        const featuresMap = new Map(features.map(f => [f.id, f]));
        // Fetch artist genres (primary artist per track)
        const artistIds = Array.from(new Set(spotifyTracks.flatMap(t => t.artists?.map(a => a.id) || [])));
        const artists = await spotifyAPI.getArtists(artistIds);
        const genreMap = new Map(artists.map(a => [a.id, a.genres]));

        // Convert Spotify tracks to Vibely format
        const { convertSpotifyToVibelyTrack } = await import('@/lib/data');
        tracks = spotifyTracks.map(track => {
          const v = convertSpotifyToVibelyTrack(track, featuresMap.get(track.id));
          const primaryArtistId = track.artists?.[0]?.id;
          const genres = (primaryArtistId && genreMap.get(primaryArtistId)) || [];
          return { ...v, genre: genres[0] || v.genre };
        });
      } else if (state.provider === 'apple-music') {
        // For Apple Music, we'll get tracks from the user's library
        const appleMusicPlaylists = await appleMusicService.getUserPlaylists();
        
        // Get tracks from the first few playlists (or a 'Library' playlist if available)
        const playlistTracks = [];
        for (const playlist of appleMusicPlaylists.slice(0, 3)) {
          const tracks = await appleMusicService.getPlaylistTracks(playlist.id);
          playlistTracks.push(...tracks.slice(0, limit / 3));
        }
        
        tracks = playlistTracks.map(track => appleMusicService.convertToVibelyTrack(track));
      }

      setState(prev => ({
        ...prev,
        tracks,
        isLoading: false,
      }));

      return tracks;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load tracks',
      }));
      return [];
    }
  }, [state.provider]);

  const loadUserPlaylists = useCallback(async () => {
    if (!state.provider) return [];

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let playlists: any[] = [];

      if (state.provider === 'spotify') {
        const spotifyPlaylists = await spotifyAPI.getUserPlaylists();
        playlists = spotifyPlaylists.map((playlist: any) => ({
          id: playlist.id,
          name: playlist.name,
          description: playlist.description || '',
          trackCount: playlist.tracks.total,
          coverUrl: playlist.images?.[0]?.url || '',
        }));
      } else if (state.provider === 'apple-music') {
        const appleMusicPlaylists = await appleMusicService.getUserPlaylists();
        playlists = appleMusicPlaylists.map(playlist => ({
          id: playlist.id,
          name: playlist.attributes.name,
          description: playlist.attributes.description?.short || '',
          trackCount: playlist.attributes.trackCount,
          coverUrl: playlist.attributes.artwork?.url.replace('{w}', '400').replace('{h}', '400') || '',
        }));
      }

      setState(prev => ({
        ...prev,
        playlists,
        isLoading: false,
      }));

      return playlists;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load playlists',
      }));
      return [];
    }
  }, [state.provider]);

  const getPlaylistTracks = useCallback(async (playlistId: string): Promise<VibelyTrack[]> => {
    if (!state.provider) return [];

    try {
      let tracks: VibelyTrack[] = [];

      if (state.provider === 'spotify') {
        const spotifyTracks = await spotifyAPI.getPlaylistTracks(playlistId);
        const { convertSpotifyToVibelyTrack } = await import('@/lib/data');
        tracks = spotifyTracks.map(track => convertSpotifyToVibelyTrack(track));
      } else if (state.provider === 'apple-music') {
        const appleMusicTracks = await appleMusicService.getPlaylistTracks(playlistId);
        tracks = appleMusicTracks.map(track => appleMusicService.convertToVibelyTrack(track));
      }

      return tracks;
    } catch (error) {
      console.error('Failed to get playlist tracks:', error);
      return [];
    }
  }, [state.provider]);

  const searchTracks = useCallback(async (query: string, limit: number = 20): Promise<VibelyTrack[]> => {
    if (!state.provider) return [];

    try {
      let tracks: VibelyTrack[] = [];

      if (state.provider === 'spotify') {
        const spotifyTracks = await spotifyAPI.searchTracks(query, limit);
        const { convertSpotifyToVibelyTrack } = await import('@/lib/data');
        tracks = spotifyTracks.map(track => convertSpotifyToVibelyTrack(track));
      } else if (state.provider === 'apple-music') {
        const appleMusicTracks = await appleMusicService.searchTracks(query, limit);
        tracks = appleMusicTracks.map(track => appleMusicService.convertToVibelyTrack(track));
      }

      return tracks;
    } catch (error) {
      console.error('Failed to search tracks:', error);
      return [];
    }
  }, [state.provider]);

  const connectProvider = useCallback(async (provider: 'spotify' | 'apple-music') => {
    try {
      if (provider === 'spotify') {
        await spotifyAuth.login();
      } else if (provider === 'apple-music') {
        await appleMusicAuth.login();
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : `Failed to connect to ${provider}`,
      }));
    }
  }, [spotifyAuth.login, appleMusicAuth.login]);

  const disconnectProvider = useCallback(() => {
    if (state.provider === 'spotify') {
      spotifyAuth.logout();
    } else if (state.provider === 'apple-music') {
      appleMusicAuth.logout();
    }
    
    setState({
      provider: null,
      isLoading: false,
      tracks: [],
      playlists: [],
      error: null,
    });
  }, [state.provider, spotifyAuth.logout, appleMusicAuth.logout]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    // Auth state from individual providers
    spotify: {
      isAuthenticated: spotifyAuth.isAuthenticated,
      isLoading: spotifyAuth.isLoading,
      user: spotifyAuth.userProfile,
    },
    appleMusic: {
      isAuthenticated: appleMusicAuth.isAuthenticated,
      isLoading: appleMusicAuth.isLoading,
      user: appleMusicAuth.user,
    },
    // Methods
    loadUserTracks,
    loadUserPlaylists,
    getPlaylistTracks,
    searchTracks,
    connectProvider,
    disconnectProvider,
    clearError,
  };
}
