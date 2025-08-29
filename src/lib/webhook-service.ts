"use client";

import { useEffect, useState, useCallback } from "react";
import { track as trackEvent } from "@/lib/analytics";

interface WebhookEvent {
  id: string;
  type: string;
  created: number;
  processed: boolean;
  data: any;
  error?: string;
}

interface WebhookServiceConfig {
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
}

class WebhookService {
  private static instance: WebhookService;
  private config: WebhookServiceConfig;
  private eventQueue: WebhookEvent[] = [];
  private processing = false;

  constructor(config: WebhookServiceConfig = {
    retryAttempts: 3,
    retryDelay: 1000,
    enableLogging: true,
  }) {
    this.config = config;
  }

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  /**
   * Validate webhook signature (client-side verification)
   */
  async validateWebhookSignature(payload: string, signature: string): Promise<boolean> {
    try {
      // In a real implementation, this would validate against your webhook secret
      // For now, we'll simulate validation
      const isValid = signature.startsWith("whsec_");
      
      trackEvent("webhook_signature_validation", {
        is_valid: isValid,
        signature_prefix: signature.substring(0, 10),
      });

      return isValid;
    } catch (error) {
      console.error("Webhook signature validation failed:", error);
      return false;
    }
  }

  /**
   * Process webhook event with retry logic
   */
  async processWebhookEvent(event: Omit<WebhookEvent, "processed">): Promise<boolean> {
    const fullEvent: WebhookEvent = { ...event, processed: false };
    this.eventQueue.push(fullEvent);

    if (this.processing) {
      return true; // Will be processed in queue
    }

    return this.processQueue();
  }

  /**
   * Process webhook queue
   */
  private async processQueue(): Promise<boolean> {
    if (this.processing) return true;
    
    this.processing = true;
    let allSuccessful = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        
        if (event.processed) continue;

        const success = await this.processEvent(event);
        if (!success) {
          allSuccessful = false;
        }
      }
    } finally {
      this.processing = false;
    }

    return allSuccessful;
  }

  /**
   * Process individual webhook event
   */
  private async processEvent(event: WebhookEvent): Promise<boolean> {
    let attempts = 0;
    
    while (attempts < this.config.retryAttempts) {
      try {
        await this.handleEventByType(event);
        event.processed = true;
        
        trackEvent("webhook_event_processed", {
          event_type: event.type,
          event_id: event.id,
          attempts: attempts + 1,
        });

        return true;
      } catch (error) {
        attempts++;
        event.error = error instanceof Error ? error.message : "Unknown error";
        
        if (attempts < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempts);
        }
      }
    }

    trackEvent("webhook_event_failed", {
      event_type: event.type,
      event_id: event.id,
      attempts,
      error: event.error,
    });

    return false;
  }

  /**
   * Handle different webhook event types
   */
  private async handleEventByType(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case "payment.succeeded":
        await this.handlePaymentSucceeded(event.data);
        break;
      
      case "payment.failed":
        await this.handlePaymentFailed(event.data);
        break;
      
      case "subscription.created":
        await this.handleSubscriptionCreated(event.data);
        break;
      
      case "subscription.updated":
        await this.handleSubscriptionUpdated(event.data);
        break;
      
      case "subscription.cancelled":
        await this.handleSubscriptionCancelled(event.data);
        break;

      default:
        if (this.config.enableLogging) {
          console.log(`Unhandled webhook event type: ${event.type}`);
        }
    }
  }

  private async handlePaymentSucceeded(data: any): Promise<void> {
    // Dispatch custom event for payment success
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("payment-succeeded", {
          detail: data,
        })
      );
    }
  }

  private async handlePaymentFailed(data: any): Promise<void> {
    // Dispatch custom event for payment failure
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("payment-failed", {
          detail: data,
        })
      );
    }
  }

  private async handleSubscriptionCreated(data: any): Promise<void> {
    // Dispatch custom event for subscription creation
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("subscription-created", {
          detail: data,
        })
      );
    }
  }

  private async handleSubscriptionUpdated(data: any): Promise<void> {
    // Dispatch custom event for subscription update
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("subscription-updated", {
          detail: data,
        })
      );
    }
  }

  private async handleSubscriptionCancelled(data: any): Promise<void> {
    // Dispatch custom event for subscription cancellation
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("subscription-cancelled", {
          detail: data,
        })
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get webhook processing statistics
   */
  getStats(): {
    queueLength: number;
    processing: boolean;
    totalProcessed: number;
    totalFailed: number;
  } {
    return {
      queueLength: this.eventQueue.length,
      processing: this.processing,
      totalProcessed: 0, // Would track this in a real implementation
      totalFailed: 0, // Would track this in a real implementation
    };
  }

  /**
   * Clear the webhook event queue
   */
  clearQueue(): void {
    this.eventQueue = [];
  }
}

// Export singleton instance
export const webhookService = WebhookService.getInstance();

// React hook for webhook event handling
export function useWebhookHandler() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState(webhookService.getStats());

  // Listen for webhook events from the server
  useEffect(() => {
    const handlePaymentSucceeded = (event: CustomEvent) => {
      trackEvent("client_payment_succeeded", {
        payment_data: event.detail,
      });
    };

    const handlePaymentFailed = (event: CustomEvent) => {
      trackEvent("client_payment_failed", {
        payment_data: event.detail,
      });
    };

    const handleSubscriptionCreated = (event: CustomEvent) => {
      trackEvent("client_subscription_created", {
        subscription_data: event.detail,
      });
    };

    const handleSubscriptionUpdated = (event: CustomEvent) => {
      trackEvent("client_subscription_updated", {
        subscription_data: event.detail,
      });
    };

    const handleSubscriptionCancelled = (event: CustomEvent) => {
      trackEvent("client_subscription_cancelled", {
        subscription_data: event.detail,
      });
    };

    // Add event listeners
    window.addEventListener("payment-succeeded", handlePaymentSucceeded as EventListener);
    window.addEventListener("payment-failed", handlePaymentFailed as EventListener);
    window.addEventListener("subscription-created", handleSubscriptionCreated as EventListener);
    window.addEventListener("subscription-updated", handleSubscriptionUpdated as EventListener);
    window.addEventListener("subscription-cancelled", handleSubscriptionCancelled as EventListener);

    return () => {
      window.removeEventListener("payment-succeeded", handlePaymentSucceeded as EventListener);
      window.removeEventListener("payment-failed", handlePaymentFailed as EventListener);
      window.removeEventListener("subscription-created", handleSubscriptionCreated as EventListener);
      window.removeEventListener("subscription-updated", handleSubscriptionUpdated as EventListener);
      window.removeEventListener("subscription-cancelled", handleSubscriptionCancelled as EventListener);
    };
  }, []);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(webhookService.getStats());
      setIsProcessing(webhookService.getStats().processing);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const processWebhookEvent = useCallback(async (event: Omit<WebhookEvent, "processed">) => {
    return webhookService.processWebhookEvent(event);
  }, []);

  const validateSignature = useCallback(async (payload: string, signature: string) => {
    return webhookService.validateWebhookSignature(payload, signature);
  }, []);

  return {
    processWebhookEvent,
    validateSignature,
    isProcessing,
    stats,
    clearQueue: webhookService.clearQueue.bind(webhookService),
  };
}

// Helper function to simulate webhook events for testing
export function simulateWebhookEvent(type: string, data: any) {
  if (typeof window !== "undefined") {
    const event = {
      id: `evt_${Date.now()}`,
      type,
      created: Math.floor(Date.now() / 1000),
      data,
    };
    
    webhookService.processWebhookEvent(event);
  }
}