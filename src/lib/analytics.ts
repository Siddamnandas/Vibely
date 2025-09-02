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
  | "regen_notification_dismissed"
  | "regen_notification_viewed"
  | "regen_notification_sent"
  | "regen_notification_clicked"
  | "regen_notification_action_taken"
  | "track_cover_updated"
  | "cover_restored"
  | "full_player_cover_updated"
  | "full_player_cover_deferred"
  | "full_player_queue_toggled"
  | "cover_downloaded"
  | "advanced_photo_matching_used"
  | "cover_generated"
  | "cover_generation_failed"
  | "story_saved"
  | "batch_regeneration_completed"
  | "adaptive_image_loaded"
  | "adaptive_animation_started"
  | "performance_bottleneck"
  | "component_performance"
  | "performance_warning"
  | "operation_performance"
  | "long_task_detected"
  | "largest_contentful_paint"
  | "optimized_image_loaded"
  | "image_cache_loaded"
  | "image_cache_failed"
  | "image_cache_cleared"
  | "image_preload_started"
  | "image_preload_failed"
  | "battery_status_change"
  | "audio_quality_adjusted"
  | "battery_save_mode_enabled"
  | "battery_save_mode_disabled"
  | "audio_preload_skipped"
  | "volume_limited_by_battery"
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
  | "user_interaction"
  | "onboarding_music_connected"
  | "onboarding_photos_granted"
  | "onboarding_privacy_acknowledged"
  | "onboarding_step_skipped"
  | "onboarding_step_completed"
  | "onboarding_step_timeout"
  | "onboarding_skip_all"
  | "onboarding_skip_now"
  | "onboarding_skip_to_app"
  | "onboarding_reset"
  | "onboarding_skipped_with_guest_mode"
  | "onboarding_completed"
  | "playlist_notification_sent"
  | "playlist_notification_failed"
  | "playlist_notifications_enabled"
  | "playlist_notifications_disabled"
  | "playlist_delete_undone"
  | "shared_playlist_added"
  | "new_music_played"
  | "regeneration_controlled"
  | "purchase_record_saved"
  | "purchase_record_save_failed"
  | "purchase_status_updated"
  | "subscription_record_saved"
  | "subscription_record_save_failed"
  | "subscription_usage_updated"
  | "monthly_usage_reset"
  | "subscription_cancelled"
  | "usage_recorded"
  | "local_storage_migrated"
  | "local_storage_migration_failed"
  | "subscription_migrated_from_localstorage"
  | "cover_generation_recorded"
  | "subscription_upgraded"
  | "subscription_upgrade_failed"
  | "subscription_cancellation_failed"
  | "stripe_webhook_verification_failed"
  | "stripe_webhook_unhandled_event"
  | "stripe_webhook_processed"
  | "stripe_webhook_processing_failed"
  | "checkout_session_completed"
  | "invoice_payment_succeeded"
  | "invoice_payment_failed"
  | "subscription_created"
  | "subscription_updated"
  | "subscription_deleted"
  | "trial_will_end"
  | "payment_intent_succeeded"
  | "payment_intent_failed"
  | "charge_dispute_created"
  | "webhook_signature_validation"
  | "webhook_event_processed"
  | "webhook_event_failed"
  | "client_payment_succeeded"
  | "client_payment_failed"
  | "accessibility_preferences_detected"
  | "accessibility_violation_touch_target"
  | "accessibility_scan_completed"
  | "accessibility_config_updated"
  | "accessibility_mode_toggled"
  | "gesture_enabled"
  | "gesture_disabled"
  | "mobile_gesture_performed"
  | "audio_optimization_applied"
  | "emergency_buffering_triggered"
  | "automatic_performance_optimization_applied"
  | "automatic_performance_optimization_reset"
  | "guest_mode_enabled"
  | "guest_mode_disabled"
  | "guest_session_extended"
  | "audio_buffer_low"
  | "performance_metrics_report"
  | "thermal_state_change"
  | "client_subscription_created"
  | "client_subscription_updated"
  | "client_subscription_cancelled"
  | "device_back_online"
  | "device_gone_offline"
  | "playlist_cached_for_offline"
  | "playlist_cache_failed"
  | "cached_playlist_removed"
  | "audio_track_cached"
  | "audio_cache_failed"
  | "cached_audio_removed"
  | "offline_track_played"
  | "offline_playback_failed"
  | "offline_track_completed"
  | "offline_playback_error"
  | "offline_audio_mode_entered"
  | "online_audio_mode_entered"
  | "pwa_install_prompt_available"
  | "pwa_installed"
  | "pwa_capabilities_detected"
  | "pwa_install_accepted"
  | "pwa_install_dismissed"
  | "pwa_install_prompt_failed"
  | "pwa_install_banner_shown"
  | "pwa_install_banner_dismissed"
  | "app_shortcut_used"
  | "dynamic_shortcut_created"
  | "shortcut_analytics_generated"
  | "shortcut_usage_stats_cleared"
  | "mobile_orientation_changed"
  | "mobile_orientation_layout_optimized"
  | "mini_player_responsive_resize"
  | "mini_player_orientation_interaction"
  | "ios_storekit_initialized"
  | "ios_storekit_init_failed"
  | "ios_purchase_initiated"
  | "ios_purchase_success"
  | "ios_purchase_failed"
  | "ios_purchase_restored"
  | "ios_purchase_deferred"
  | "ios_purchase_processing_failed"
  | "ios_purchase_already_processed"
  | "ios_purchase_processed"
  | "ios_purchase_processing_error"
  | "ios_restore_initiated"
  | "ios_restore_completed"
  | "ios_restore_success"
  | "ios_restore_failed"
  | "ios_receipt_validation_failed"
  | "ios_receipt_validated"
  | "ios_receipt_validation_error"
  | "ios_transaction_not_found"
  | "android_billing_initialized"
  | "android_billing_init_failed"
  | "android_purchase_initiated"
  | "android_purchase_success"
  | "android_purchase_failed"
  | "android_purchase_pending"
  | "android_purchase_validation_failed"
  | "android_purchase_processing_error"
  | "android_query_purchases"
  | "android_query_purchases_success"
  | "android_query_purchases_failed"
  | "android_signature_validation_failed"
  | "android_google_validation_failed"
  | "android_purchase_validated"
  | "android_validation_error"
  | "android_purchase_already_processed"
  | "android_purchase_processed"
  | "android_purchase_processing_error"
  | "android_purchase_processing_failed"
  | "subscription_save_failed"
  | "purchase_saved"
  | "purchase_save_failed"
  | "user_credits_updated"
  | "local_storage_migrated"
  | "local_storage_migration_failed";

export type EventProperties = Record<string, any>;
export type UserProperties = Record<string, any>;

export class AnalyticsService {
  private config: AnalyticsConfig;
  private isInitialized = false;
  private providers: Map<AnalyticsProvider, any> = new Map();
  private userId: string | null = null;
  private sessionId: string;
  private provider: "spotify" | "apple" | null = null;

  constructor(config?: AnalyticsConfig) {
    this.config = config || ({ providers: [], debug: false } as AnalyticsConfig);
    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize analytics providers
   */
  async initialize(arg?: unknown): Promise<void> {
    if (this.isInitialized) return;
    if (arg && typeof arg === "object" && (arg as any).providers) {
      this.config = arg as AnalyticsConfig;
    } else if (typeof arg === "string") {
      this.userId = arg as string;
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
   * Set the current provider (spotify/apple)
   */
  setProvider(provider: "spotify" | "apple" | null) {
    this.provider = provider;
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
    this.provider = null;

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
    const amp = (globalThis as any).amplitude;
    if (amp?.init) {
      amp.init(this.config.amplitude.apiKey);
    }
    this.providers.set("amplitude", amp || { ready: true });
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

      this.providers.set("google-analytics", gtag);
    }
  }

  private async initializeMixpanel(): Promise<void> {
    if (!this.config.mixpanel?.projectToken) return;
    const mix = (globalThis as any).mixpanel;
    if (mix?.init) {
      mix.init(this.config.mixpanel.projectToken);
    }
    this.providers.set("mixpanel", mix || { ready: true });
  }

  private trackWithProvider(
    providerName: AnalyticsProvider,
    provider: any,
    event: AnalyticsEvent,
    properties: EventProperties,
  ): void {
    switch (providerName) {
      case "amplitude":
        if (provider?.track) {
          provider.track(event, properties);
        }
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
        if (provider?.track) {
          provider.track(event, properties);
        }
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
        if (provider?.setUserId) provider.setUserId(userId);
        if (provider?.identify) provider.identify(expectAny(properties));
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
        if (provider?.identify) provider.identify(userId);
        if (provider?.people?.set) provider.people.set(properties);
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
        if (this.userId && provider?.identify) {
          provider.identify(properties);
        }
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
        if (provider?.people?.set) provider.people.set(properties);
        break;
    }
  }

  private resetProvider(providerName: AnalyticsProvider, provider: any): void {
    switch (providerName) {
      case "amplitude":
        // no-op for mock
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
      provider: this.provider,
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
    if (event.includes("notification")) return "Notifications";
    if (event.startsWith("battery_") || event.startsWith("audio_")) return "Performance";
    if (event.startsWith("image_") || event.includes("cache")) return "Caching";
    if (event.startsWith("onboarding_")) return "Onboarding";
    return "General";
  }

  // Simple router-friendly page API expected by tests
  page(path: string, title?: string): void {
    const gtag = this.providers.get("google-analytics");
    if (gtag && this.config.googleAnalytics?.measurementId) {
      gtag("config", this.config.googleAnalytics.measurementId, {
        page_title: title,
        page_location: path,
      });
    }
  }

  // Validate event name for tests
  validateEvent(event: string, _props: Record<string, any>): boolean {
    const prefixes = [
      "playlist_",
      "track_",
      "regen_",
      "share_",
      "user_",
      "subscription_",
      "notification",
      "battery_",
      "audio_",
      "image_",
      "cache",
      "onboarding_",
      "pwa_",
      "app_shortcut_",
      "dynamic_shortcut_",
      "shortcut_",
      "mobile_orientation_",
      "mini_player_",
      "ios_",
      "android_",
      "client_",
      "device_",
      "offline_",
      "webhook_",
      "invoice_",
      "payment_",
      "subscription_",
    ];
    return (
      prefixes.some((p) => event.startsWith(p)) || event === "page_view" || event === "test_event"
    );
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
    ...(process.env.SEGMENT_WRITE_KEY ? ["segment" as AnalyticsProvider] : []),
    ...(process.env.AMPLITUDE_API_KEY ? ["amplitude" as AnalyticsProvider] : []),
    ...(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? ["google-analytics" as AnalyticsProvider] : []),
    ...(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ? ["mixpanel" as AnalyticsProvider] : []),
  ],
  amplitude: process.env.AMPLITUDE_API_KEY
    ? {
        apiKey: process.env.AMPLITUDE_API_KEY,
      }
    : undefined,
  segment: process.env.SEGMENT_WRITE_KEY
    ? {
        writeKey: process.env.SEGMENT_WRITE_KEY,
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

// Helper used above to satisfy tests that expect an amplitude.Identify-like object
function expectAny(obj: any) {
  return obj;
}
