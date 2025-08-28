// Analytics providers
type AnalyticsProvider = "amplitude" | "segment" | "google-analytics" | "mixpanel";

interface AnalyticsConfig {
  providers: AnalyticsProvider[];
  amplitude?: {
    apiKey: string;
  };
  segment?: {
    writeKey: string;
  };
  googleAnalytics?: {
    measurementId: string;
  };
  mixpanel?: {
    projectToken: string;
  };
  debug?: boolean;
}

export type AnalyticsEvent =
  | "playlist_opened"
  | "playlist_play_all"
  | "playlist_shuffle_all"
  | "track_play_pressed"
  | "track_next"
  | "track_prev"
  | "seek"
  | "regen_started"
  | "regen_progress"
  | "regen_completed"
  | "regen_paused"
  | "regen_resumed"
  | "regen_canceled"
  | "track_cover_updated"
  | "cover_restored"
  | "share_opened"
  | "share_completed"
  | "full_player_swiped"
  | "user_signup"
  | "user_login"
  | "subscription_started"
  | "subscription_completed"
  | "page_view"
  | "error_occurred"
  | "analytics_initialized"
  | "user_interaction";

export type EventProperties = Record<string, any>;
export type UserProperties = Record<string, any>;

class AnalyticsService {
  private config: AnalyticsConfig;
  private isInitialized = false;
  private providers: Map<AnalyticsProvider, any> = new Map();
  private userId: string | null = null;
  private sessionId: string;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize analytics providers
   */
  async initialize(userId?: string): Promise<void> {
    if (this.isInitialized) return;

    if (userId) {
      this.userId = userId;
    }

    // Initialize each provider
    for (const provider of this.config.providers) {
      try {
        await this.initializeProvider(provider);
      } catch (error) {
        console.error(`Failed to initialize ${provider}:`, error);
      }
    }

    this.isInitialized = true;

    // Track initialization
    this.track("analytics_initialized", {
      providers: this.config.providers,
      session_id: this.sessionId,
    });
  }

  /**
   * Track an event
   */
  track(event: AnalyticsEvent, properties?: EventProperties): void {
    if (!this.isInitialized) {
      // Queue events until initialized
      this.queueEvent(event, properties);
      return;
    }

    const enrichedProperties = this.enrichProperties(properties);

    // Log for debugging
    if (this.config.debug) {
      console.log("[Analytics]", event, enrichedProperties);
    }

    // Send to each provider
    for (const [providerName, provider] of this.providers.entries()) {
      try {
        this.trackWithProvider(providerName, provider, event, enrichedProperties);
      } catch (error) {
        console.error(`Failed to track with ${providerName}:`, error);
      }
    }

    // Send to dataLayer (GTM)
    this.sendToDataLayer(event, enrichedProperties);
  }

  /**
   * Identify a user
   */
  identify(userId: string, userProperties?: UserProperties): void {
    this.userId = userId;

    const enrichedProperties = {
      ...userProperties,
      identified_at: new Date().toISOString(),
      session_id: this.sessionId,
    };

    for (const [providerName, provider] of this.providers.entries()) {
      try {
        this.identifyWithProvider(providerName, provider, userId, enrichedProperties);
      } catch (error) {
        console.error(`Failed to identify with ${providerName}:`, error);
      }
    }
  }

  /**
   * Track page view
   */
  pageView(page: string, properties?: EventProperties): void {
    this.track("page_view", {
      page,
      ...properties,
    });
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties): void {
    for (const [providerName, provider] of this.providers.entries()) {
      try {
        this.setUserPropertiesWithProvider(providerName, provider, properties);
      } catch (error) {
        console.error(`Failed to set user properties with ${providerName}:`, error);
      }
    }
  }

  /**
   * Reset analytics (for logout)
   */
  reset(): void {
    this.userId = null;
    this.sessionId = this.generateSessionId();

    for (const [providerName, provider] of this.providers.entries()) {
      try {
        this.resetProvider(providerName, provider);
      } catch (error) {
        console.error(`Failed to reset ${providerName}:`, error);
      }
    }
  }

  // Private methods

  private async initializeProvider(provider: AnalyticsProvider): Promise<void> {
    switch (provider) {
      case "amplitude":
        await this.initializeAmplitude();
        break;
      case "segment":
        await this.initializeSegment();
        break;
      case "google-analytics":
        await this.initializeGoogleAnalytics();
        break;
      case "mixpanel":
        await this.initializeMixpanel();
        break;
    }
  }

  private async initializeAmplitude(): Promise<void> {
    if (!this.config.amplitude?.apiKey) return;

    // For now, just prepare for Amplitude initialization
    // In production, load Amplitude SDK dynamically
    if (typeof window !== "undefined") {
      console.log("Amplitude would be initialized with key:", this.config.amplitude.apiKey);
    }

    this.providers.set("amplitude", { ready: true });
  }

  private async initializeSegment(): Promise<void> {
    if (!this.config.segment?.writeKey) return;

    // Load Segment analytics.js
    const analytics = await this.loadSegmentScript(this.config.segment.writeKey);
    this.providers.set("segment", analytics);
  }

  private async initializeGoogleAnalytics(): Promise<void> {
    if (!this.config.googleAnalytics?.measurementId) return;

    // Initialize Google Analytics via gtag
    if (typeof window !== "undefined") {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.googleAnalytics.measurementId}`;
      document.head.appendChild(script);

      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) {
        (window as any).dataLayer.push(args);
      }

      gtag("config", this.config.googleAnalytics.measurementId);
      this.providers.set("google-analytics", gtag);
    }
  }

  private async initializeMixpanel(): Promise<void> {
    if (!this.config.mixpanel?.projectToken) return;

    // For now, just prepare for Mixpanel initialization
    console.log("Mixpanel would be initialized with token:", this.config.mixpanel.projectToken);
    this.providers.set("mixpanel", { ready: true });
  }

  private trackWithProvider(
    providerName: AnalyticsProvider,
    provider: any,
    event: AnalyticsEvent,
    properties: EventProperties,
  ): void {
    switch (providerName) {
      case "amplitude":
        console.log("[Amplitude]", event, properties);
        break;
      case "segment":
        if (provider.track) {
          provider.track(event, properties);
        }
        break;
      case "google-analytics":
        if (provider) {
          provider("event", event, properties);
        }
        break;
      case "mixpanel":
        console.log("[Mixpanel]", event, properties);
        break;
    }
  }

  private identifyWithProvider(
    providerName: AnalyticsProvider,
    provider: any,
    userId: string,
    properties: UserProperties,
  ): void {
    switch (providerName) {
      case "amplitude":
        console.log("[Amplitude] Identify:", userId, properties);
        break;
      case "segment":
        if (provider.identify) {
          provider.identify(userId, properties);
        }
        break;
      case "google-analytics":
        if (provider) {
          provider("config", this.config.googleAnalytics?.measurementId, {
            user_id: userId,
            custom_map: properties,
          });
        }
        break;
      case "mixpanel":
        console.log("[Mixpanel] Identify:", userId, properties);
        break;
    }
  }

  private setUserPropertiesWithProvider(
    providerName: AnalyticsProvider,
    provider: any,
    properties: UserProperties,
  ): void {
    switch (providerName) {
      case "amplitude":
        console.log("[Amplitude] Set Properties:", properties);
        break;
      case "segment":
        if (this.userId && provider.identify) {
          provider.identify(this.userId, properties);
        }
        break;
      case "google-analytics":
        // Google Analytics doesn't have user properties in the same way
        break;
      case "mixpanel":
        console.log("[Mixpanel] Set Properties:", properties);
        break;
    }
  }

  private resetProvider(providerName: AnalyticsProvider, provider: any): void {
    switch (providerName) {
      case "amplitude":
        console.log("[Amplitude] Reset");
        break;
      case "segment":
        if (provider.reset) {
          provider.reset();
        }
        break;
      case "google-analytics":
        // GA doesn't have a reset function
        break;
      case "mixpanel":
        console.log("[Mixpanel] Reset");
        break;
    }
  }

  private enrichProperties(properties?: EventProperties): EventProperties {
    return {
      ...properties,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      user_id: this.userId,
      page_url: typeof window !== "undefined" ? window.location.href : undefined,
      page_title: typeof window !== "undefined" ? document.title : undefined,
      referrer: typeof window !== "undefined" ? document.referrer : undefined,
      user_agent: typeof window !== "undefined" ? navigator.userAgent : undefined,
    };
  }

  private sendToDataLayer(event: AnalyticsEvent, properties: EventProperties): void {
    if (typeof window !== "undefined" && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event,
        eventCategory: this.getEventCategory(event),
        eventAction: event,
        ...properties,
      });
    }
  }

  private getEventCategory(event: AnalyticsEvent): string {
    if (event.startsWith("playlist_")) return "Playlist";
    if (event.startsWith("track_")) return "Track";
    if (event.startsWith("regen_")) return "Regeneration";
    if (event.startsWith("share_")) return "Sharing";
    if (event.startsWith("user_")) return "User";
    if (event.startsWith("subscription_")) return "Subscription";
    return "General";
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private eventQueue: Array<{ event: AnalyticsEvent; properties?: EventProperties }> = [];

  private queueEvent(event: AnalyticsEvent, properties?: EventProperties): void {
    this.eventQueue.push({ event, properties });
  }

  private async loadSegmentScript(writeKey: string): Promise<any> {
    return new Promise((resolve) => {
      const analytics = ((window as any).analytics = (window as any).analytics || []);
      if (!analytics.initialize) {
        if (analytics.invoked) {
          console.error("Segment snippet included twice.");
          return resolve(analytics);
        } else {
          analytics.invoked = true;
          analytics.methods = [
            "trackSubmit",
            "trackClick",
            "trackLink",
            "trackForm",
            "pageview",
            "identify",
            "reset",
            "group",
            "track",
            "ready",
            "alias",
            "debug",
            "page",
            "once",
            "off",
            "on",
            "addSourceMiddleware",
            "addIntegrationMiddleware",
            "setAnonymousId",
            "addDestinationMiddleware",
          ];
          analytics.factory = function (method: string) {
            return function () {
              const args = Array.prototype.slice.call(arguments);
              args.unshift(method);
              analytics.push(args);
              return analytics;
            };
          };
          for (let i = 0; i < analytics.methods.length; i++) {
            const key = analytics.methods[i];
            analytics[key] = analytics.factory(key);
          }
          analytics.load = function (key: string, options?: any) {
            const script = document.createElement("script");
            script.type = "text/javascript";
            script.async = true;
            script.src = "https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";
            const first = document.getElementsByTagName("script")[0];
            first.parentNode?.insertBefore(script, first);
            analytics._loadOptions = options;
          };
          analytics._writeKey = writeKey;
          analytics.SNIPPET_VERSION = "4.15.3";
          analytics.load(writeKey);
        }
      }
      resolve(analytics);
    });
  }
}

// Create analytics instance
const analyticsConfig: AnalyticsConfig = {
  providers: [
    ...(process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ? ["amplitude" as AnalyticsProvider] : []),
    ...(process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY ? ["segment" as AnalyticsProvider] : []),
    ...(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? ["google-analytics" as AnalyticsProvider] : []),
    ...(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ? ["mixpanel" as AnalyticsProvider] : []),
  ],
  amplitude: process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY
    ? {
        apiKey: process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY,
      }
    : undefined,
  segment: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY
    ? {
        writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY,
      }
    : undefined,
  googleAnalytics: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    ? {
        measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
      }
    : undefined,
  mixpanel: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
    ? {
        projectToken: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
      }
    : undefined,
  debug: process.env.NODE_ENV !== "production",
};

const analytics = new AnalyticsService(analyticsConfig);

// Simplified tracking function that maintains backward compatibility
export function track(event: AnalyticsEvent, payload?: Record<string, any>) {
  try {
    analytics.track(event, payload);
  } catch (error) {
    // Fallback to console logging
    console.log("[analytics]", event, payload ?? {});
    if (typeof window !== "undefined" && (window as any).dataLayer) {
      (window as any).dataLayer.push({ event, ...(payload ?? {}) });
    }
  }
}

// Export analytics service for advanced usage
export { analytics };
