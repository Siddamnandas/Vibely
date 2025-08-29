"use client";

import { track as trackEvent } from "@/lib/analytics";

// Android Google Play Billing Types and Interfaces
export interface PlayBillingProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  productType: "inapp" | "subs";
  subscriptionOfferDetails?: Array<{
    offerToken: string;
    basePlanId: string;
    pricingPhases: Array<{
      priceAmountMicros: number;
      priceCurrencyCode: string;
      formattedPrice: string;
      billingPeriod: string;
      billingCycleCount: number;
      recurrenceMode: "INFINITE_RECURRING" | "FINITE_RECURRING";
    }>;
  }>;
}

export interface PlayBillingPurchase {
  orderId: string;
  packageName: string;
  productId: string;
  purchaseTime: number;
  purchaseState: "purchased" | "pending";
  purchaseToken: string;
  quantity: number;
  acknowledged: boolean;
  autoRenewing?: boolean;
  obfuscatedAccountId?: string;
  obfuscatedProfileId?: string;
  developerPayload?: string;
  signature: string;
  originalJson: string;
}

export interface PlayBillingError {
  responseCode: number;
  debugMessage?: string;
}

// Google Play Billing Bridge Interface - This would be implemented by native Android code
declare global {
  interface Window {
    GooglePlayBilling?: {
      // Connection management
      startConnection: () => Promise<{ billingResult: { responseCode: number } }>;
      endConnection: () => void;
      isReady: () => Promise<boolean>;

      // Product management
      queryProductDetails: (
        productIds: string[],
        productType: "inapp" | "subs",
      ) => Promise<{
        billingResult: { responseCode: number };
        productDetailsList: PlayBillingProduct[];
      }>;

      // Purchase management
      launchBillingFlow: (
        productDetails: PlayBillingProduct,
        offerToken?: string,
      ) => Promise<{
        billingResult: { responseCode: number };
        purchases?: PlayBillingPurchase[];
      }>;

      queryPurchases: (productType: "inapp" | "subs") => Promise<{
        billingResult: { responseCode: number };
        purchasesList: PlayBillingPurchase[];
      }>;

      acknowledgePurchase: (
        purchaseToken: string,
      ) => Promise<{ billingResult: { responseCode: number } }>;
      consumePurchase: (
        purchaseToken: string,
      ) => Promise<{ billingResult: { responseCode: number } }>;

      // Events
      onPurchasesUpdated: (callback: (purchases: PlayBillingPurchase[]) => void) => void;
      onBillingSetupFinished: (callback: (billingResult: { responseCode: number }) => void) => void;
      onBillingServiceDisconnected: (callback: () => void) => void;
    };
  }
}

/**
 * Android Google Play Billing Service
 * Handles native Android in-app purchases through Google Play Billing
 */
export class AndroidPlayBillingService {
  private isInitialized = false;
  private isConnected = false;
  private products = new Map<string, PlayBillingProduct>();
  private pendingPurchases = new Map<string, Promise<PlayBillingPurchase>>();

  // Map Vibely product IDs to Google Play product IDs
  private readonly productIdMapping = {
    premium_monthly: "com.vibely.premium.monthly",
    premium_yearly: "com.vibely.premium.yearly",
    extra_covers_pack: "com.vibely.covers.pack10",
  };

  constructor() {
    this.setupPurchaseObserver();
  }

  /**
   * Initialize Google Play Billing and load products
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.isPlayBillingAvailable()) {
        throw new Error("Google Play Billing not available on this platform");
      }

      // Start connection to Google Play Billing
      const connectionResult = await window.GooglePlayBilling!.startConnection();

      if (connectionResult.billingResult.responseCode !== 0) {
        throw new Error(
          `Billing connection failed: ${connectionResult.billingResult.responseCode}`,
        );
      }

      this.isConnected = true;

      // Query both subscription and in-app products
      await Promise.all([this.queryProducts("subs"), this.queryProducts("inapp")]);

      this.isInitialized = true;

      trackEvent("android_billing_initialized", {
        products_loaded: this.products.size,
        platform: "android",
      });

      return true;
    } catch (error) {
      console.error("Failed to initialize Google Play Billing:", error);
      trackEvent("android_billing_init_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        platform: "android",
      });
      return false;
    }
  }

  /**
   * Check if Google Play Billing is available
   */
  private isPlayBillingAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      "GooglePlayBilling" in window &&
      window.GooglePlayBilling !== undefined
    );
  }

  /**
   * Query products from Google Play
   */
  private async queryProducts(productType: "inapp" | "subs"): Promise<void> {
    const productIds = Object.values(this.productIdMapping);

    const result = await window.GooglePlayBilling!.queryProductDetails(productIds, productType);

    if (result.billingResult.responseCode === 0) {
      result.productDetailsList.forEach((product) => {
        this.products.set(product.productId, product);
      });
    }
  }

  /**
   * Set up purchase observer to handle purchase updates
   */
  private setupPurchaseObserver(): void {
    if (!this.isPlayBillingAvailable()) return;

    window.GooglePlayBilling!.onPurchasesUpdated((purchases) => {
      this.handlePurchasesUpdate(purchases);
    });

    window.GooglePlayBilling!.onBillingServiceDisconnected(() => {
      this.isConnected = false;
      console.warn("Google Play Billing service disconnected");

      // Attempt to reconnect
      setTimeout(() => {
        this.initialize();
      }, 3000);
    });
  }

  /**
   * Handle purchase updates from Google Play Billing
   */
  private async handlePurchasesUpdate(purchases: PlayBillingPurchase[]): Promise<void> {
    for (const purchase of purchases) {
      try {
        switch (purchase.purchaseState) {
          case "purchased":
            await this.handlePurchaseSuccess(purchase);
            break;
          case "pending":
            await this.handlePurchasePending(purchase);
            break;
        }
      } catch (error) {
        console.error("Error handling purchase update:", error);
      }
    }
  }

  /**
   * Handle successful purchase
   */
  private async handlePurchaseSuccess(purchase: PlayBillingPurchase): Promise<void> {
    try {
      // Validate purchase with our server
      const isValid = await this.validatePurchase(purchase);

      if (isValid) {
        // Process the purchase
        await this.processValidatedPurchase(purchase);

        // Acknowledge or consume the purchase
        if (this.isConsumable(purchase.productId)) {
          await window.GooglePlayBilling!.consumePurchase(purchase.purchaseToken);
        } else {
          if (!purchase.acknowledged) {
            await window.GooglePlayBilling!.acknowledgePurchase(purchase.purchaseToken);
          }
        }

        trackEvent("android_purchase_success", {
          product_id: purchase.productId,
          order_id: purchase.orderId,
          platform: "android",
        });
      } else {
        console.error("Purchase validation failed for:", purchase.orderId);
        trackEvent("android_purchase_validation_failed", {
          product_id: purchase.productId,
          order_id: purchase.orderId,
          platform: "android",
        });
      }
    } catch (error) {
      console.error("Error processing purchase success:", error);
      trackEvent("android_purchase_processing_error", {
        product_id: purchase.productId,
        order_id: purchase.orderId,
        error: error instanceof Error ? error.message : "Unknown error",
        platform: "android",
      });
    }
  }

  /**
   * Handle pending purchase (requires additional action)
   */
  private async handlePurchasePending(purchase: PlayBillingPurchase): Promise<void> {
    trackEvent("android_purchase_pending", {
      product_id: purchase.productId,
      order_id: purchase.orderId,
      platform: "android",
    });

    // Store pending purchase for later processing
    console.log("Purchase is pending approval:", purchase.orderId);
  }

  /**
   * Purchase a product
   */
  async purchaseProduct(vibelyProductId: string): Promise<PlayBillingPurchase | null> {
    if (!this.isInitialized || !this.isConnected) {
      await this.initialize();
    }

    const playProductId =
      this.productIdMapping[vibelyProductId as keyof typeof this.productIdMapping];
    if (!playProductId) {
      throw new Error(`Unknown product ID: ${vibelyProductId}`);
    }

    const product = this.products.get(playProductId);
    if (!product) {
      throw new Error(`Product not available: ${playProductId}`);
    }

    try {
      trackEvent("android_purchase_initiated", {
        product_id: playProductId,
        vibely_product_id: vibelyProductId,
        platform: "android",
      });

      // For subscriptions, use the first offer token if available
      const offerToken = product.subscriptionOfferDetails?.[0]?.offerToken;

      const result = await window.GooglePlayBilling!.launchBillingFlow(product, offerToken);

      if (result.billingResult.responseCode === 0 && result.purchases) {
        return result.purchases[0] || null;
      } else {
        throw new Error(`Purchase flow failed: ${result.billingResult.responseCode}`);
      }
    } catch (error) {
      console.error("Purchase failed:", error);
      trackEvent("android_purchase_failed", {
        product_id: playProductId,
        vibely_product_id: vibelyProductId,
        error: error instanceof Error ? error.message : "Unknown error",
        platform: "android",
      });
      throw error;
    }
  }

  /**
   * Query existing purchases
   */
  async queryPurchases(): Promise<PlayBillingPurchase[]> {
    if (!this.isInitialized || !this.isConnected) {
      await this.initialize();
    }

    try {
      trackEvent("android_query_purchases", {
        platform: "android",
      });

      const [subsResult, inappResult] = await Promise.all([
        window.GooglePlayBilling!.queryPurchases("subs"),
        window.GooglePlayBilling!.queryPurchases("inapp"),
      ]);

      const allPurchases = [
        ...(subsResult.billingResult.responseCode === 0 ? subsResult.purchasesList : []),
        ...(inappResult.billingResult.responseCode === 0 ? inappResult.purchasesList : []),
      ];

      trackEvent("android_query_purchases_success", {
        purchases_found: allPurchases.length,
        platform: "android",
      });

      return allPurchases;
    } catch (error) {
      console.error("Failed to query purchases:", error);
      trackEvent("android_query_purchases_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        platform: "android",
      });
      return [];
    }
  }

  /**
   * Validate purchase with server
   */
  private async validatePurchase(purchase: PlayBillingPurchase): Promise<boolean> {
    try {
      const response = await fetch("/api/payments/validate-android-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          signature: purchase.signature,
          originalJson: purchase.originalJson,
        }),
      });

      if (!response.ok) {
        throw new Error(`Purchase validation failed: ${response.status}`);
      }

      const { isValid } = await response.json();
      return isValid;
    } catch (error) {
      console.error("Purchase validation error:", error);
      return false;
    }
  }

  /**
   * Process validated purchase with backend
   */
  private async processValidatedPurchase(purchase: PlayBillingPurchase): Promise<void> {
    try {
      const response = await fetch("/api/payments/process-android-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: purchase.orderId,
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          purchaseTime: new Date(purchase.purchaseTime),
          signature: purchase.signature,
          originalJson: purchase.originalJson,
        }),
      });

      if (!response.ok) {
        throw new Error(`Purchase processing failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Purchase processed successfully:", result);
    } catch (error) {
      console.error("Failed to process validated purchase:", error);
      throw error;
    }
  }

  /**
   * Check if product is consumable
   */
  private isConsumable(productId: string): boolean {
    // Only extra covers pack is consumable
    return productId === "com.vibely.covers.pack10";
  }

  /**
   * Get available products
   */
  getAvailableProducts(): PlayBillingProduct[] {
    return Array.from(this.products.values());
  }

  /**
   * Get product by Vibely product ID
   */
  getProduct(vibelyProductId: string): PlayBillingProduct | null {
    const playProductId =
      this.productIdMapping[vibelyProductId as keyof typeof this.productIdMapping];
    if (!playProductId) return null;

    return this.products.get(playProductId) || null;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.isConnected;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.isPlayBillingAvailable() && this.isConnected) {
      window.GooglePlayBilling!.endConnection();
      this.isConnected = false;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const androidPlayBillingService = new AndroidPlayBillingService();
