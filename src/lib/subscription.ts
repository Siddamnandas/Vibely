import { firebasePurchaseService, type SubscriptionRecord, type PurchaseRecord } from "@/lib/firebase-purchase-service";
import { track as trackEvent } from "@/lib/analytics";

export type SubscriptionTier = "freemium" | "premium";

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  price: {
    monthly: number;
    yearly: number;
  };
  features: {
    coversPerMonth: number;
    watermark: boolean;
    hdExport: boolean;
    exclusiveStyles: boolean;
    prioritySupport: boolean;
    unlimitedStorage: boolean;
  };
  description: string;
  popular?: boolean;
}

export interface UserSubscription {
  id?: string;
  userId: string;
  plan: SubscriptionPlan;
  status: "active" | "cancelled" | "expired" | "grace_period" | "on_hold";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  coversUsedThisMonth: number;
  cancelAtPeriodEnd?: boolean;
  billingCycle?: "monthly" | "yearly";
  purchaseRecordId?: string;
}

// Subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "freemium",
    name: "Freemium",
    tier: "freemium",
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: {
      coversPerMonth: 3,
      watermark: true,
      hdExport: false,
      exclusiveStyles: false,
      prioritySupport: false,
      unlimitedStorage: false,
    },
    description: "Perfect for trying out Vibely with basic cover generation",
  },
  {
    id: "premium",
    name: "Vibely Pro",
    tier: "premium",
    price: {
      monthly: 9.99,
      yearly: 99.99,
    },
    features: {
      coversPerMonth: -1, // Unlimited
      watermark: false,
      hdExport: true,
      exclusiveStyles: true,
      prioritySupport: true,
      unlimitedStorage: true,
    },
    description: "Unlimited creativity with premium features and exclusive styles",
    popular: true,
  },
];

class SubscriptionService {
  private subscriptionCache: Map<string, { subscription: UserSubscription; timestamp: number }> = new Map();
  private cacheExpiryMs = 5 * 60 * 1000; // 5 minutes
  private migrationChecked: Set<string> = new Set();

  /**
   * Get current user subscription from Firebase with caching
   */
  async getCurrentSubscription(userId: string): Promise<UserSubscription> {
    // Check cache first
    const cached = this.subscriptionCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiryMs) {
      return cached.subscription;
    }

    try {
      // Check if we need to migrate from localStorage
      if (!this.migrationChecked.has(userId)) {
        await this.checkAndMigrateFromLocalStorage(userId);
        this.migrationChecked.add(userId);
      }

      // Try to get from Firebase
      const firebaseSubscription = await firebasePurchaseService.getUserActiveSubscription(userId);
      
      if (firebaseSubscription) {
        const plan = SUBSCRIPTION_PLANS.find(p => p.id === firebaseSubscription.planId) || SUBSCRIPTION_PLANS[0];
        
        const subscription: UserSubscription = {
          id: firebaseSubscription.id,
          userId: firebaseSubscription.userId,
          plan,
          status: firebaseSubscription.status as UserSubscription["status"],
          currentPeriodStart: firebaseSubscription.currentPeriodStart,
          currentPeriodEnd: firebaseSubscription.currentPeriodEnd,
          coversUsedThisMonth: firebaseSubscription.coversUsedThisMonth,
          cancelAtPeriodEnd: firebaseSubscription.cancelAtPeriodEnd,
          billingCycle: firebaseSubscription.billingCycle,
          purchaseRecordId: firebaseSubscription.purchaseRecordId,
        };

        // Cache the result
        this.subscriptionCache.set(userId, {
          subscription,
          timestamp: Date.now(),
        });

        return subscription;
      }

      // Return default freemium subscription if none found
      return this.createDefaultSubscription(userId);

    } catch (error) {
      console.error("Failed to get subscription from Firebase:", error);
      
      // Fallback to localStorage for compatibility
      const localSubscription = this.getSubscriptionFromLocalStorage(userId);
      if (localSubscription) {
        return localSubscription;
      }

      // Final fallback to default
      return this.createDefaultSubscription(userId);
    }
  }

  /**
   * Create default freemium subscription
   */
  private createDefaultSubscription(userId: string): UserSubscription {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    return {
      userId,
      plan: SUBSCRIPTION_PLANS[0], // Freemium
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      coversUsedThisMonth: 0,
      billingCycle: "monthly",
    };
  }

  /**
   * Check and migrate from localStorage if needed
   */
  private async checkAndMigrateFromLocalStorage(userId: string): Promise<void> {
    if (typeof window === "undefined") return;

    const localData = localStorage.getItem(`subscription_${userId}`);
    if (localData) {
      try {
        await firebasePurchaseService.migrateFromLocalStorage(userId);
        trackEvent("subscription_migrated_from_localstorage", { user_id: userId });
      } catch (error) {
        console.error("Migration failed:", error);
      }
    }
  }

  /**
   * Get subscription from localStorage (fallback)
   */
  private getSubscriptionFromLocalStorage(userId: string): UserSubscription | null {
    if (typeof window === "undefined") return null;

    const savedSub = localStorage.getItem(`subscription_${userId}`);
    if (savedSub) {
      try {
        const parsed = JSON.parse(savedSub);
        return {
          ...parsed,
          currentPeriodStart: new Date(parsed.currentPeriodStart),
          currentPeriodEnd: new Date(parsed.currentPeriodEnd),
        };
      } catch (error) {
        console.error("Failed to parse localStorage subscription:", error);
      }
    }
    return null;
  }

  /**
   * Check if user can generate covers based on their subscription
   */
  async canGenerateCovers(userId: string): Promise<{
    canGenerate: boolean;
    reason?: string;
    coversRemaining?: number;
  }> {
    const subscription = await this.getCurrentSubscription(userId);

    if (subscription.status !== "active" && subscription.status !== "grace_period") {
      return {
        canGenerate: false,
        reason: "Subscription is not active",
      };
    }

    // Premium users have unlimited covers
    if (subscription.plan.tier === "premium") {
      return { canGenerate: true };
    }

    // Check freemium limits
    const coversLimit = subscription.plan.features.coversPerMonth;
    const coversUsed = subscription.coversUsedThisMonth;

    if (coversUsed >= coversLimit) {
      return {
        canGenerate: false,
        reason: `You've reached your limit of ${coversLimit} covers this month`,
        coversRemaining: 0,
      };
    }

    return {
      canGenerate: true,
      coversRemaining: coversLimit - coversUsed,
    };
  }

  /**
   * Record cover generation usage
   */
  async recordCoverGeneration(userId: string, coverCount: number = 1, metadata?: { playlistId?: string; trackId?: string; generationTime?: number }): Promise<void> {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      
      if (subscription.id) {
        // Update Firebase subscription usage
        await firebasePurchaseService.updateSubscriptionUsage(subscription.id, "cover_generated", coverCount);
        
        // Record detailed usage
        await firebasePurchaseService.recordUsage({
          userId,
          subscriptionId: subscription.id,
          action: "cover_generated",
          timestamp: new Date(),
          metadata,
        });
      }

      // Update local cache
      subscription.coversUsedThisMonth += coverCount;
      this.subscriptionCache.set(userId, {
        subscription,
        timestamp: Date.now(),
      });

      // Fallback to localStorage for backwards compatibility
      if (typeof window !== "undefined") {
        localStorage.setItem(`subscription_${userId}`, JSON.stringify(subscription));
      }

      trackEvent("cover_generation_recorded", {
        user_id: userId,
        cover_count: coverCount,
        total_used: subscription.coversUsedThisMonth,
        subscription_tier: subscription.plan.tier,
        has_firebase_id: !!subscription.id,
      });

    } catch (error) {
      console.error("Failed to record cover generation:", error);
      
      // Fallback to localStorage
      if (typeof window !== "undefined") {
        const subscription = await this.getCurrentSubscription(userId);
        subscription.coversUsedThisMonth += coverCount;
        localStorage.setItem(`subscription_${userId}`, JSON.stringify(subscription));
      }
    }
  }

  /**
   * Reset monthly usage (called at the start of each billing period)
   */
  async resetMonthlyUsage(userId: string): Promise<void> {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      
      if (subscription.id) {
        // Reset usage in Firebase
        await firebasePurchaseService.resetMonthlyUsage(subscription.id);
      }

      // Update local data
      subscription.coversUsedThisMonth = 0;
      
      // Update period dates
      const now = new Date();
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      // Update cache
      this.subscriptionCache.set(userId, {
        subscription,
        timestamp: Date.now(),
      });

      // Fallback to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(`subscription_${userId}`, JSON.stringify(subscription));
      }

      trackEvent("monthly_usage_reset", {
        user_id: userId,
        subscription_tier: subscription.plan.tier,
      });

    } catch (error) {
      console.error("Failed to reset monthly usage:", error);
    }
  }

  /**
   * Upgrade to premium subscription
   */
  async upgradeToPremium(
    userId: string,
    billingCycle: "monthly" | "yearly",
    purchaseData?: { transactionId: string; purchaseToken: string; amount: number; currency: string }
  ): Promise<{
    success: boolean;
    error?: string;
    subscription?: UserSubscription;
  }> {
    try {
      // In production, this would:
      // 1. Create payment intent with Stripe/PayPal
      // 2. Process payment
      // 3. Update subscription in database
      // 4. Send confirmation email

      // For demo, simulate successful upgrade
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate payment processing

      const premiumPlan = SUBSCRIPTION_PLANS.find((p) => p.tier === "premium")!;
      const now = new Date();
      const endDate =
        billingCycle === "yearly"
          ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
          : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      // Create purchase record if purchase data provided
      let purchaseRecordId = "demo-purchase";
      if (purchaseData) {
        purchaseRecordId = await firebasePurchaseService.savePurchaseRecord({
          userId,
          productId: `premium_${billingCycle}`,
          transactionId: purchaseData.transactionId,
          purchaseToken: purchaseData.purchaseToken,
          purchaseTime: now,
          isValid: true,
          isSubscription: true,
          expiryTime: endDate,
          amount: purchaseData.amount,
          currency: purchaseData.currency,
          platform: "web",
          status: "completed",
        });
      }

      // Create subscription record
      const subscriptionId = await firebasePurchaseService.saveSubscriptionRecord({
        userId,
        purchaseRecordId,
        planId: premiumPlan.id,
        tier: premiumPlan.tier,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        coversUsedThisMonth: 0,
        cancelAtPeriodEnd: false,
        billingCycle,
      });

      const newSubscription: UserSubscription = {
        id: subscriptionId,
        userId,
        plan: premiumPlan,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        coversUsedThisMonth: 0,
        billingCycle,
        purchaseRecordId,
      };

      // Update cache
      this.subscriptionCache.set(userId, {
        subscription: newSubscription,
        timestamp: Date.now(),
      });

      // Save to localStorage as fallback
      if (typeof window !== "undefined") {
        localStorage.setItem(`subscription_${userId}`, JSON.stringify(newSubscription));
      }

      trackEvent("subscription_upgraded", {
        user_id: userId,
        billing_cycle: billingCycle,
        subscription_id: subscriptionId,
        purchase_record_id: purchaseRecordId,
      });

      return {
        success: true,
        subscription: newSubscription,
      };
    } catch (error) {
      console.error("Upgrade failed:", error);
      
      trackEvent("subscription_upgrade_failed", {
        user_id: userId,
        billing_cycle: billingCycle,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: "Payment processing failed. Please try again.",
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    userId: string,
    immediate: boolean = false,
    reason?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const subscription = await this.getCurrentSubscription(userId);

      if (subscription.id) {
        // Cancel in Firebase
        await firebasePurchaseService.cancelSubscription(subscription.id, immediate, reason);
      }

      if (immediate) {
        // Immediate cancellation - downgrade to freemium
        const freemiumPlan = SUBSCRIPTION_PLANS.find((p) => p.tier === "freemium")!;
        subscription.plan = freemiumPlan;
        subscription.status = "active";
        subscription.coversUsedThisMonth = Math.min(subscription.coversUsedThisMonth, 3);
      } else {
        // Cancel at period end
        subscription.cancelAtPeriodEnd = true;
      }

      // Update cache
      this.subscriptionCache.set(userId, {
        subscription,
        timestamp: Date.now(),
      });

      // Fallback to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(`subscription_${userId}`, JSON.stringify(subscription));
      }

      trackEvent("subscription_cancelled", {
        user_id: userId,
        immediate,
        reason,
        subscription_id: subscription.id,
      });

      return { success: true };
    } catch (error) {
      console.error("Cancellation failed:", error);
      
      trackEvent("subscription_cancellation_failed", {
        user_id: userId,
        immediate,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        error: "Failed to cancel subscription. Please contact support.",
      };
    }
  }

  /**
   * Apply watermark to generated cover based on subscription
   */
  async shouldApplyWatermark(userId: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(userId);
    return subscription.plan.features.watermark;
  }

  /**
   * Get available export formats based on subscription
   */
  async getAvailableExportFormats(userId: string): Promise<{
    formats: Array<{
      name: string;
      quality: string;
      size: string;
      available: boolean;
    }>;
  }> {
    const subscription = await this.getCurrentSubscription(userId);
    
    const baseFormats = [
      {
        name: "Standard",
        quality: "Standard (1080x1080)",
        size: "~500KB",
        available: true,
      },
    ];

    if (subscription.plan.features.hdExport) {
      baseFormats.push({
        name: "HD",
        quality: "High Definition (2048x2048)",
        size: "~2MB",
        available: true,
      });

      baseFormats.push({
        name: "4K",
        quality: "Ultra HD (4096x4096)",
        size: "~8MB",
        available: true,
      });
    } else {
      baseFormats.push({
        name: "HD",
        quality: "High Definition (2048x2048)",
        size: "~2MB",
        available: false,
      });
    }

    return { formats: baseFormats };
  }

  /**
   * Subscribe to real-time subscription updates
   */
  subscribeToUserSubscription(userId: string, callback: (subscription: UserSubscription | null) => void): () => void {
    return firebasePurchaseService.subscribeToUserSubscription(userId, (firebaseSubscription) => {
      if (firebaseSubscription) {
        const plan = SUBSCRIPTION_PLANS.find(p => p.id === firebaseSubscription.planId) || SUBSCRIPTION_PLANS[0];
        
        const subscription: UserSubscription = {
          id: firebaseSubscription.id,
          userId: firebaseSubscription.userId,
          plan,
          status: firebaseSubscription.status as UserSubscription["status"],
          currentPeriodStart: firebaseSubscription.currentPeriodStart,
          currentPeriodEnd: firebaseSubscription.currentPeriodEnd,
          coversUsedThisMonth: firebaseSubscription.coversUsedThisMonth,
          cancelAtPeriodEnd: firebaseSubscription.cancelAtPeriodEnd,
          billingCycle: firebaseSubscription.billingCycle,
          purchaseRecordId: firebaseSubscription.purchaseRecordId,
        };

        // Update cache
        this.subscriptionCache.set(userId, {
          subscription,
          timestamp: Date.now(),
        });

        callback(subscription);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Clear subscription cache (useful for testing or manual refresh)
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.subscriptionCache.delete(userId);
    } else {
      this.subscriptionCache.clear();
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();

// Utility functions
export const formatPrice = (price: number): string => {
  if (price === 0) return "Free";
  return `$${price.toFixed(2)}`;
};

export const getSubscriptionBenefits = (tier: SubscriptionTier): string[] => {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === tier);
  if (!plan) return [];

  const benefits = [];

  if (plan.features.coversPerMonth === -1) {
    benefits.push("Unlimited cover generation");
  } else {
    benefits.push(`${plan.features.coversPerMonth} covers per month`);
  }

  if (!plan.features.watermark) {
    benefits.push("No watermarks");
  }

  if (plan.features.hdExport) {
    benefits.push("HD & 4K export quality");
  }

  if (plan.features.exclusiveStyles) {
    benefits.push("Exclusive premium styles");
  }

  if (plan.features.prioritySupport) {
    benefits.push("Priority customer support");
  }

  if (plan.features.unlimitedStorage) {
    benefits.push("Unlimited cloud storage");
  }

  return benefits;
};
