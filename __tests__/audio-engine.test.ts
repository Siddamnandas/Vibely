/**
 * @jest-environment jsdom
 */

import { AudioEngine } from '@/lib/audio-engine';

// Mock Spotify Web Playback SDK
const mockSpotifyPlayer = {
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn(),
  pause: jest.fn().mockResolvedValue(),
  resume: jest.fn().mockResolvedValue(),
  seek: jest.fn().mockResolvedValue(),
  setVolume: jest.fn().mockResolvedValue(),
  getCurrentState: jest.fn().mockResolvedValue({
    position: 45000,
    duration: 180000,
    paused: false,
    track_window: {
      current_track: {
        id: 'test-track',
        name: 'Test Song',
        artists: [{ name: 'Test Artist' }]
      }
    }
  }),
  addListener: jest.fn(),
  removeListener: jest.fn()
};

// Mock MusicKit
const mockMusicKit = {
  getInstance: jest.fn().mockReturnValue({
    isAuthorized: true,
    player: {
      play: jest.fn().mockResolvedValue(),
      pause: jest.fn().mockResolvedValue(),
      stop: jest.fn().mockResolvedValue(),
      seekToTime: jest.fn().mockResolvedValue(),
      volume: 1,
      currentPlaybackTime: 45,
      currentPlaybackDuration: 180,
      isPlaying: false,
      queue: {
        items: []
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }
  })
};

// Mock global objects
(global as any).Spotify = {
  Player: jest.fn().mockImplementation(() => mockSpotifyPlayer)
};

(global as any).MusicKit = mockMusicKit;

describe('Audio Engine Integration', () => {
  let audioEngine: AudioEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    audioEngine = new AudioEngine();
  });

  afterEach(async () => {
    await audioEngine.cleanup();
  });

  it('should initialize Spotify provider successfully', async () => {
    const success = await audioEngine.initializeProvider('spotify', 'test-token');
    
    expect(success).toBe(true);
    expect(mockSpotifyPlayer.connect).toHaveBeenCalled();
  });

  it('should initialize Apple Music provider successfully', async () => {
    const success = await audioEngine.initializeProvider('apple-music', 'test-token');
    
    expect(success).toBe(true);
    expect(mockMusicKit.getInstance).toHaveBeenCalled();
  });

  it('should play track using active provider', async () => {
    await audioEngine.initializeProvider('spotify', 'test-token');
    
    const track = {
      id: 'test-track',
      title: 'Test Song',
      artist: 'Test Artist',
      originalCoverUrl: 'https://example.com/cover.jpg',
      mood: 'Happy' as const,
      tempo: 120,
      provider: 'spotify' as const,
      uri: 'spotify:track:test-track'
    };

    const success = await audioEngine.playTrack(track);
    expect(success).toBe(true);
  });

  it('should handle playback controls correctly', async () => {
    await audioEngine.initializeProvider('spotify', 'test-token');

    await audioEngine.pause();
    expect(mockSpotifyPlayer.pause).toHaveBeenCalled();

    await audioEngine.resume();
    expect(mockSpotifyPlayer.resume).toHaveBeenCalled();

    await audioEngine.seek(60);
    expect(mockSpotifyPlayer.seek).toHaveBeenCalledWith(60000);
  });

  it('should manage volume correctly', async () => {
    await audioEngine.initializeProvider('spotify', 'test-token');

    await audioEngine.setVolume(0.5);
    expect(mockSpotifyPlayer.setVolume).toHaveBeenCalledWith(0.5);

    const volume = audioEngine.getVolume();
    expect(volume).toBe(0.5);
  });

  it('should get current playback state', async () => {
    await audioEngine.initializeProvider('spotify', 'test-token');

    const state = await audioEngine.getCurrentState();
    
    expect(state).toMatchObject({
      isPlaying: false,
      position: 45,
      duration: 180,
      currentTrack: expect.objectContaining({
        id: 'test-track',
        title: 'Test Song',
        artist: 'Test Artist'
      })
    });
  });

  it('should switch between providers', async () => {
    // Initialize Spotify first
    await audioEngine.initializeProvider('spotify', 'spotify-token');
    expect(audioEngine.getActiveProvider()).toBe('spotify');

    // Switch to Apple Music
    await audioEngine.initializeProvider('apple-music', 'apple-token');
    expect(audioEngine.getActiveProvider()).toBe('apple-music');
  });

  it('should handle provider initialization failures gracefully', async () => {
    // Mock a failed connection
    mockSpotifyPlayer.connect.mockRejectedValueOnce(new Error('Connection failed'));

    const success = await audioEngine.initializeProvider('spotify', 'invalid-token');
    expect(success).toBe(false);
  });
});