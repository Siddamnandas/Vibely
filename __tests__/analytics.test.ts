/**
 * @jest-environment jsdom
 */

import { AnalyticsService } from '@/lib/analytics';

// Create a real instance for testing
const analyticsService = new AnalyticsService();

// Mock analytics providers
const mockAmplitude = {
  track: jest.fn(),
  identify: jest.fn(),
  setUserId: jest.fn(),
  init: jest.fn()
};

const mockSegment = {
  track: jest.fn(),
  identify: jest.fn(),
  page: jest.fn(),
  load: jest.fn()
};

const mockGoogleAnalytics = {
  gtag: jest.fn()
};

const mockMixpanel = {
  track: jest.fn(),
  identify: jest.fn(),
  people: {
    set: jest.fn()
  },
  init: jest.fn()
};

// Mock global objects
(global as any).amplitude = mockAmplitude;
(global as any).analytics = mockSegment;
(global as any).gtag = mockGoogleAnalytics.gtag;
(global as any).mixpanel = mockMixpanel;

// Mock script loading
global.document.createElement = jest.fn().mockImplementation((tagName) => {
  const element = {
    tagName,
    src: '',
    onload: null,
    onerror: null,
    setAttribute: jest.fn(),
    addEventListener: jest.fn()
  };
  
  // Simulate script load success
  setTimeout(() => {
    if (element.onload) element.onload();
  }, 10);
  
  return element;
});

global.document.head.appendChild = jest.fn();

describe('Analytics Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with multiple providers', async () => {
    const config = {
      providers: ['amplitude', 'segment', 'google-analytics', 'mixpanel'] as const,
      amplitude: { apiKey: 'test-amplitude-key' },
      segment: { writeKey: 'test-segment-key' },
      googleAnalytics: { measurementId: 'GA-TEST-123' },
      mixpanel: { projectToken: 'test-mixpanel-token' },
      debug: true
    };

    await analyticsService.initialize(config);

    expect(mockAmplitude.init).toHaveBeenCalledWith('test-amplitude-key');
    expect(mockMixpanel.init).toHaveBeenCalledWith('test-mixpanel-token');
  });

  it('should track events across all providers', async () => {
    const config = {
      providers: ['amplitude', 'segment'] as const,
      amplitude: { apiKey: 'test-key' },
      segment: { writeKey: 'test-key' }
    };

    await analyticsService.initialize(config);

    analyticsService.track('track_play_pressed', {
      trackId: 'test-track',
      trackTitle: 'Test Song',
      artist: 'Test Artist',
      timestamp: Date.now()
    });

    expect(mockAmplitude.track).toHaveBeenCalledWith('track_play_pressed', {
      trackId: 'test-track',
      trackTitle: 'Test Song',
      artist: 'Test Artist',
      timestamp: expect.any(Number)
    });

    expect(mockSegment.track).toHaveBeenCalledWith('track_play_pressed', {
      trackId: 'test-track',
      trackTitle: 'Test Song',
      artist: 'Test Artist',
      timestamp: expect.any(Number)
    });
  });

  it('should identify users across providers', async () => {
    const config = {
      providers: ['amplitude', 'mixpanel'] as const,
      amplitude: { apiKey: 'test-key' },
      mixpanel: { projectToken: 'test-token' }
    };

    await analyticsService.initialize(config);

    analyticsService.identify('user123', {
      email: 'test@example.com',
      subscriptionTier: 'premium',
      joinDate: '2024-01-01'
    });

    expect(mockAmplitude.setUserId).toHaveBeenCalledWith('user123');
    expect(mockAmplitude.identify).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      subscriptionTier: 'premium'
    }));

    expect(mockMixpanel.identify).toHaveBeenCalledWith('user123');
    expect(mockMixpanel.people.set).toHaveBeenCalledWith({
      email: 'test@example.com',
      subscriptionTier: 'premium',
      joinDate: '2024-01-01'
    });
  });

  it('should track page views for Google Analytics', async () => {
    const config = {
      providers: ['google-analytics'] as const,
      googleAnalytics: { measurementId: 'GA-TEST-123' }
    };

    await analyticsService.initialize(config);

    analyticsService.page('/generator', 'AI Generator');

    expect(mockGoogleAnalytics.gtag).toHaveBeenCalledWith('config', 'GA-TEST-123', {
      page_title: 'AI Generator',
      page_location: '/generator'
    });
  });

  it('should handle provider failures gracefully', async () => {
    // Mock a provider failure
    mockAmplitude.init.mockImplementationOnce(() => {
      throw new Error('Amplitude initialization failed');
    });

    const config = {
      providers: ['amplitude', 'segment'] as const,
      amplitude: { apiKey: 'test-key' },
      segment: { writeKey: 'test-key' },
      debug: true
    };

    await analyticsService.initialize(config);

    // Should still track to working providers
    analyticsService.track('test_event', { test: true });
    expect(mockSegment.track).toHaveBeenCalled();
  });

  it('should validate event properties', () => {
    const isValid = analyticsService.validateEvent('track_play_pressed', {
      trackId: 'test-123',
      trackTitle: 'Test Song',
      artist: 'Test Artist'
    });

    expect(isValid).toBe(true);

    const isInvalid = analyticsService.validateEvent('invalid_event', {});
    expect(isInvalid).toBe(false);
  });

  it('should track regen workflow events', async () => {
    const config = {
      providers: ['amplitude'] as const,
      amplitude: { apiKey: 'test-key' }
    };

    await analyticsService.initialize(config);

    // Track complete regen workflow
    analyticsService.track('regen_started', {
      playlistId: 'playlist-123',
      trackCount: 10,
      provider: 'spotify'
    });

    analyticsService.track('regen_progress', {
      playlistId: 'playlist-123',
      currentTrack: 5,
      totalTracks: 10,
      progressPercent: 50
    });

    analyticsService.track('regen_completed', {
      playlistId: 'playlist-123',
      trackCount: 10,
      duration: 45000,
      successRate: 0.9
    });

    expect(mockAmplitude.track).toHaveBeenCalledTimes(3);
    expect(mockAmplitude.track).toHaveBeenCalledWith('regen_started', expect.any(Object));
    expect(mockAmplitude.track).toHaveBeenCalledWith('regen_progress', expect.any(Object));
    expect(mockAmplitude.track).toHaveBeenCalledWith('regen_completed', expect.any(Object));
  });
});