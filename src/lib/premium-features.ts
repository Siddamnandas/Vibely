/**
 * Premium Features Manager for Vibely
 * Handles HD exports, watermark-free functionality, and premium user features
 */

interface PremiumUser {
  userId: string;
  plan: "free" | "premium" | "pro";
  features: {
    hdExportsEnabled: boolean;
    watermarkDisabled: boolean;
    unlimitedCovers: boolean;
    priorityProcessing: boolean;
    advancedAnalytics: boolean;
    customTemplates: boolean;
  };
  limits: {
    monthlyCovers: number;
    exportResolution: number;
    storageDays: number;
  };
  subscription: {
    startDate: Date;
    endDate: Date;
    autoRenew: boolean;
    billingCycle: "monthly" | "annual";
  };
}

interface ExportOptions {
  resolution: "standard" | "hd" | "4k";
  format: "png" | "jpg" | "webp";
  quality: number; // 0-100
  watermark: boolean;
  streamingOptimization: boolean;
}

interface PremiumExportResult {
  url: string;
  fileSize: number;
  resolution: string;
  processingTime: number;
  isWatermarkFree: boolean;
  expiresAt: Date;
}

interface FeatureAccessCheck {
  userId: string;
  feature: string;
  allowed: boolean;
  remainingUses?: number;
  upgradeRequired: boolean;
  upgradeUrl?: string;
}

/**
 * Premium features management class
 */
export class PremiumFeaturesManager {
  private static instance: PremiumFeaturesManager;

  static getInstance(): PremiumFeaturesManager {
    if (!PremiumFeaturesManager.instance) {
      PremiumFeaturesManager.instance = new PremiumFeaturesManager();
    }
    return PremiumFeaturesManager.instance;
  }

  /**
   * Check if user has access to a specific premium feature
   */
  async checkFeatureAccess(userId: string, feature: string): Promise<FeatureAccessCheck> {
    const user = await this.getPremiumUser(userId);

    if (!user) {
      return {
        userId,
        feature,
        allowed: false,
        upgradeRequired: true,
        upgradeUrl: "/premium",
      };
    }

    // Check feature-specific access
    switch (feature) {
      case "hd_exports":
        return {
          userId,
          feature,
          allowed: user.features.hdExportsEnabled,
          upgradeRequired: !user.features.hdExportsEnabled,
          upgradeUrl: "/premium",
        };

      case "watermark_free":
        return {
          userId,
          feature,
          allowed: user.features.watermarkDisabled,
          upgradeRequired: !user.features.watermarkDisabled,
          upgradeUrl: "/premium",
        };

      case "unlimited_covers":
        return {
          userId,
          feature,
          allowed: user.features.unlimitedCovers,
          upgradeRequired: !user.features.unlimitedCovers,
          remainingUses: user.features.unlimitedCovers ? undefined : user.limits.monthlyCovers,
        };

      case "priority_processing":
        return {
          userId,
          feature,
          allowed: user.features.priorityProcessing,
          upgradeRequired: !user.features.priorityProcessing,
        };

      case "advanced_analytics":
        return {
          userId,
          feature,
          allowed: user.features.advancedAnalytics,
          upgradeRequired: !user.features.advancedAnalytics,
        };

      case "custom_templates":
        return {
          userId,
          feature,
          allowed: user.features.customTemplates,
          upgradeRequired: !user.features.customTemplates,
        };

      default:
        return {
          userId,
          feature,
          allowed: user.plan !== "free",
          upgradeRequired: user.plan === "free",
        };
    }
  }

  /**
   * Process premium export with enhanced quality and no watermark
   */
  async processPremiumExport(
    userId: string,
    coverId: string,
    options: ExportOptions,
  ): Promise<PremiumExportResult> {
    const startTime = Date.now();
    const featureCheck = await this.checkFeatureAccess(userId, "hd_exports");

    if (!featureCheck.allowed) {
      throw new Error("Premium subscription required for HD exports");
    }

    // Validate export parameters based on plan
    const user = await this.getPremiumUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Apply plan-based limitations
    options = this.applyPlanLimits(options, user);

    // Generate the export
    const exportResult = await this.generatePremiumExport(coverId, options, user);

    const processingTime = Date.now() - startTime;

    return {
      ...exportResult,
      processingTime,
      isWatermarkFree: !options.watermark,
      expiresAt: new Date(Date.now() + user.limits.storageDays * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Generate enhanced export with premium quality
   */
  private async generatePremiumExport(
    coverId: string,
    options: ExportOptions,
    user: PremiumUser,
  ): Promise<Omit<PremiumExportResult, "processingTime" | "isWatermarkFree" | "expiresAt">> {
    // Determine final export parameters
    const finalOptions = this.optimizeForQuality(options, user);

    // Generate the premium export URL
    const exportUrl = await this.createPremiumExportUrl(coverId, finalOptions);

    return {
      url: exportUrl,
      fileSize: this.estimateFileSize(finalOptions),
      resolution: `${finalOptions.resolution.toUpperCase()}`,
    };
  }

  /**
   * Get premium user data
   */
  private async getPremiumUser(userId: string): Promise<PremiumUser | null> {
    // In production, this would fetch from database
    // For now, return mock user data based on userId

    if (userId.includes("premium")) {
      return {
        userId,
        plan: "premium",
        features: {
          hdExportsEnabled: true,
          watermarkDisabled: true,
          unlimitedCovers: true,
          priorityProcessing: true,
          advancedAnalytics: true,
          customTemplates: false,
        },
        limits: {
          monthlyCovers: -1, // unlimited
          exportResolution: 4096, // 4K
          storageDays: 30,
        },
        subscription: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: true,
          billingCycle: "monthly",
        },
      };
    }

    if (userId.includes("pro")) {
      return {
        userId,
        plan: "pro",
        features: {
          hdExportsEnabled: true,
          watermarkDisabled: true,
          unlimitedCovers: true,
          priorityProcessing: true,
          advancedAnalytics: true,
          customTemplates: true,
        },
        limits: {
          monthlyCovers: -1, // unlimited
          exportResolution: 4096, // 4K
          storageDays: 90,
        },
        subscription: {
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          autoRenew: true,
          billingCycle: "annual",
        },
      };
    }

    // Free user
    return {
      userId,
      plan: "free",
      features: {
        hdExportsEnabled: false,
        watermarkDisabled: false,
        unlimitedCovers: false,
        priorityProcessing: false,
        advancedAnalytics: false,
        customTemplates: false,
      },
      limits: {
        monthlyCovers: 3,
        exportResolution: 1920, // HD
        storageDays: 7,
      },
      subscription: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days trial
        autoRenew: false,
        billingCycle: "monthly",
      },
    };
  }

  /**
   * Apply plan-based limitations to export options
   */
  private applyPlanLimits(options: ExportOptions, user: PremiumUser): ExportOptions {
    const limitedOptions = { ...options };

    // Apply resolution limits
    if (options.resolution === "4k" && user.limits.exportResolution < 4096) {
      limitedOptions.resolution = "hd";
    }

    // Apply watermark based on plan
    if (!user.features.watermarkDisabled) {
      limitedOptions.watermark = true;
    }

    // Apply quality limits for free users
    if (user.plan === "free") {
      limitedOptions.quality = Math.min(options.quality, 85);
      limitedOptions.streamingOptimization = true; // Reduce file size
    }

    return limitedOptions;
  }

  /**
   * Optimize export options for premium quality
   */
  private optimizeForQuality(options: ExportOptions, user: PremiumUser): ExportOptions {
    if (user.plan === "free") {
      // Free users get reduced quality to manage server load
      return {
        ...options,
        format: options.format === "webp" ? "webp" : "jpg", // Prefer efficient format
        quality: 80, // Reduced quality
        watermark: true,
      };
    }

    // Premium users get optimized high quality
    return {
      ...options,
      quality: Math.min(options.quality, 95), // Cap at 95 for efficiency
      format: options.format || "png", // Prefer lossless for premium
    };
  }

  /**
   * Create the premium export URL
   */
  private async createPremiumExportUrl(coverId: string, options: ExportOptions): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_AMPLIFY_API || "https://api.vibely.app";

    // Create a secure, time-limited export link
    const params = new URLSearchParams({
      coverId,
      resolution: options.resolution,
      format: options.format,
      quality: options.quality.toString(),
      watermark: options.watermark.toString(),
      stream: options.streamingOptimization.toString(),
    });

    const token = await this.generateSecureToken(params.toString());

    return `${baseUrl}/premium/export/${token}`;
  }

  /**
   * Generate secure token for premium export
   */
  private async generateSecureToken(parameters: string): Promise<string> {
    // In production, use a proper JWT or HMAC token
    // This is a simplified implementation
    const timestamp = Date.now().toString();
    const payload = btoaJSON({ parameters, timestamp });
    return btoa(payload); // In production: sign with HMAC
  }

  /**
   * Estimate file size based on export parameters
   */
  private estimateFileSize(options: ExportOptions): number {
    const baseSizes = {
      standard: 2048 * 2048, // 2MP
      hd: 1920 * 1080, // ~2MP
      "4k": 3840 * 2160, // ~8MP
    };

    const resolution = baseSizes[options.resolution] || baseSizes.standard;
    const formatMultiplier = {
      png: 4, // RGBA, higher file size
      jpg: 3, // Compressed
      webp: 2, // Most efficient
    };

    const qualityMultiplier = options.quality / 100;
    const formatMulti = formatMultiplier[options.format] || 3;

    return Math.round((resolution * formatMulti * qualityMultiplier) / (1024 * 1024)); // MB
  }

  /**
   * Check and deduct from user's monthly usage
   */
  async consumeUsage(
    userId: string,
    feature: string,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const user = await this.getPremiumUser(userId);

    if (!user || user.features.unlimitedCovers) {
      return { allowed: true, remaining: -1 }; // Unlimited
    }

    // In production, track usage in database
    // For now, simulate usage tracking

    const monthlyUsage = 0; // Would fetch from database
    const remaining = user.limits.monthlyCovers - monthlyUsage;

    if (remaining <= 0) {
      return { allowed: false, remaining: 0 };
    }

    // Would update database: monthlyUsage + 1
    return { allowed: true, remaining: remaining - 1 };
  }

  /**
   * Validate subscription status
   */
  async validateSubscription(userId: string): Promise<{
    isActive: boolean;
    plan: string;
    renewalDate?: Date;
    cancellationDate?: Date;
  }> {
    const user = await this.getPremiumUser(userId);

    if (!user) {
      return { isActive: false, plan: "free" };
    }

    const now = Date.now();
    const isActive =
      now >= user.subscription.startDate.getTime() && now <= user.subscription.endDate.getTime();

    return {
      isActive,
      plan: user.plan,
      renewalDate: user.subscription.endDate,
    };
  }
}

// Utility function for base64 encoding JSON
function btoaJSON(obj: any): string {
  return btoa(JSON.stringify(obj));
}

// Singleton instance
export const premiumFeatures = PremiumFeaturesManager.getInstance();

// Export type definitions for external use
export type { PremiumUser, ExportOptions, PremiumExportResult, FeatureAccessCheck };

/**
 * Convenience functions for common premium operations
 */
export async function canExportHD(userId: string): Promise<boolean> {
  const check = await premiumFeatures.checkFeatureAccess(userId, "hd_exports");
  return check.allowed;
}

export async function isWatermarkFree(userId: string): Promise<boolean> {
  const check = await premiumFeatures.checkFeatureAccess(userId, "watermark_free");
  return check.allowed;
}

export async function getRemainingCovers(userId: string): Promise<number> {
  const check = await premiumFeatures.checkFeatureAccess(userId, "unlimited_covers");
  return check.remainingUses || -1; // -1 indicates unlimited
}

export async function processHDPremiumExport(
  userId: string,
  coverId: string,
  format: "png" | "jpg" = "png",
  quality: number = 95,
): Promise<PremiumExportResult> {
  return premiumFeatures.processPremiumExport(userId, coverId, {
    resolution: "hd",
    format,
    quality,
    watermark: false,
    streamingOptimization: false,
  });
}
