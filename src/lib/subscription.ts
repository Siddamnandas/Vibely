export type SubscriptionTier = 'freemium' | 'premium';

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
  userId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  coversUsedThisMonth: number;
  cancelAtPeriodEnd?: boolean;
}

// Subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'freemium',
    name: 'Freemium',
    tier: 'freemium',
    price: {
      monthly: 0,
      yearly: 0
    },
    features: {
      coversPerMonth: 3,
      watermark: true,
      hdExport: false,
      exclusiveStyles: false,
      prioritySupport: false,
      unlimitedStorage: false
    },
    description: 'Perfect for trying out Vibely with basic cover generation'
  },
  {
    id: 'premium',
    name: 'Vibely Pro',
    tier: 'premium',
    price: {
      monthly: 9.99,
      yearly: 99.99
    },
    features: {
      coversPerMonth: -1, // Unlimited
      watermark: false,
      hdExport: true,
      exclusiveStyles: true,
      prioritySupport: true,
      unlimitedStorage: true
    },
    description: 'Unlimited creativity with premium features and exclusive styles',
    popular: true
  }
];

class SubscriptionService {
  
  /**
   * Get current user subscription
   */
  getCurrentSubscription(userId: string): UserSubscription {
    // In production, this would fetch from database
    // For now, return mock data based on localStorage or default
    const savedSub = typeof window !== 'undefined' 
      ? localStorage.getItem(`subscription_${userId}`) 
      : null;
    
    if (savedSub) {
      const parsed = JSON.parse(savedSub);
      return {
        ...parsed,
        currentPeriodStart: new Date(parsed.currentPeriodStart),
        currentPeriodEnd: new Date(parsed.currentPeriodEnd)
      };
    }

    // Default freemium subscription
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    return {
      userId,
      plan: SUBSCRIPTION_PLANS[0], // Freemium
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      coversUsedThisMonth: 0
    };
  }

  /**
   * Check if user can generate covers based on their subscription
   */
  canGenerateCovers(subscription: UserSubscription): {
    canGenerate: boolean;
    reason?: string;
    coversRemaining?: number;
  } {
    if (subscription.status !== 'active') {
      return {
        canGenerate: false,
        reason: 'Subscription is not active'
      };
    }

    // Premium users have unlimited covers
    if (subscription.plan.tier === 'premium') {
      return { canGenerate: true };
    }

    // Check freemium limits
    const coversLimit = subscription.plan.features.coversPerMonth;
    const coversUsed = subscription.coversUsedThisMonth;
    
    if (coversUsed >= coversLimit) {
      return {
        canGenerate: false,
        reason: `You've reached your limit of ${coversLimit} covers this month`,
        coversRemaining: 0
      };
    }

    return {
      canGenerate: true,
      coversRemaining: coversLimit - coversUsed
    };
  }

  /**
   * Record cover generation usage
   */
  recordCoverGeneration(userId: string, coverCount: number = 1): void {
    const subscription = this.getCurrentSubscription(userId);
    subscription.coversUsedThisMonth += coverCount;
    
    // Save updated subscription
    if (typeof window !== 'undefined') {
      localStorage.setItem(`subscription_${userId}`, JSON.stringify(subscription));
    }
  }

  /**
   * Reset monthly usage (called at the start of each billing period)
   */
  resetMonthlyUsage(userId: string): void {
    const subscription = this.getCurrentSubscription(userId);
    subscription.coversUsedThisMonth = 0;
    
    // Update period dates
    const now = new Date();
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(`subscription_${userId}`, JSON.stringify(subscription));
    }
  }

  /**
   * Upgrade to premium subscription
   */
  async upgradeToPremium(userId: string, billingCycle: 'monthly' | 'yearly'): Promise<{
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
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate payment processing
      
      const premiumPlan = SUBSCRIPTION_PLANS.find(p => p.tier === 'premium')!;
      const now = new Date();
      const endDate = billingCycle === 'yearly' 
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      const newSubscription: UserSubscription = {
        userId,
        plan: premiumPlan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        coversUsedThisMonth: 0
      };
      
      // Save new subscription
      if (typeof window !== 'undefined') {
        localStorage.setItem(`subscription_${userId}`, JSON.stringify(newSubscription));
      }
      
      return {
        success: true,
        subscription: newSubscription
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'Payment processing failed. Please try again.'
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, immediate: boolean = false): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const subscription = this.getCurrentSubscription(userId);
      
      if (immediate) {
        // Immediate cancellation - downgrade to freemium
        const freemiumPlan = SUBSCRIPTION_PLANS.find(p => p.tier === 'freemium')!;
        subscription.plan = freemiumPlan;
        subscription.status = 'active';
        subscription.coversUsedThisMonth = Math.min(subscription.coversUsedThisMonth, 3);
      } else {
        // Cancel at period end
        subscription.cancelAtPeriodEnd = true;
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(`subscription_${userId}`, JSON.stringify(subscription));
      }
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to cancel subscription. Please contact support.'
      };
    }
  }

  /**
   * Apply watermark to generated cover based on subscription
   */
  shouldApplyWatermark(subscription: UserSubscription): boolean {
    return subscription.plan.features.watermark;
  }

  /**
   * Get available export formats based on subscription
   */
  getAvailableExportFormats(subscription: UserSubscription): {
    formats: Array<{
      name: string;
      quality: string;
      size: string;
      available: boolean;
    }>;
  } {
    const baseFormats = [
      {
        name: 'Standard',
        quality: 'Standard (1080x1080)',
        size: '~500KB',
        available: true
      }
    ];
    
    if (subscription.plan.features.hdExport) {
      baseFormats.push({
        name: 'HD',
        quality: 'High Definition (2048x2048)',
        size: '~2MB',
        available: true
      });
      
      baseFormats.push({
        name: '4K',
        quality: 'Ultra HD (4096x4096)', 
        size: '~8MB',
        available: true
      });
    } else {
      baseFormats.push({
        name: 'HD',
        quality: 'High Definition (2048x2048)',
        size: '~2MB',
        available: false
      });
    }
    
    return { formats: baseFormats };
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();

// Utility functions
export const formatPrice = (price: number): string => {
  if (price === 0) return 'Free';
  return `$${price.toFixed(2)}`;
};

export const getSubscriptionBenefits = (tier: SubscriptionTier): string[] => {
  const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
  if (!plan) return [];
  
  const benefits = [];
  
  if (plan.features.coversPerMonth === -1) {
    benefits.push('Unlimited cover generation');
  } else {
    benefits.push(`${plan.features.coversPerMonth} covers per month`);
  }
  
  if (!plan.features.watermark) {
    benefits.push('No watermarks');
  }
  
  if (plan.features.hdExport) {
    benefits.push('HD & 4K export quality');
  }
  
  if (plan.features.exclusiveStyles) {
    benefits.push('Exclusive premium styles');
  }
  
  if (plan.features.prioritySupport) {
    benefits.push('Priority customer support');
  }
  
  if (plan.features.unlimitedStorage) {
    benefits.push('Unlimited cloud storage');
  }
  
  return benefits;
};