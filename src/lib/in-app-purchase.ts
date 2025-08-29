"use client";

import { iosStoreKitService } from "@/lib/ios-storekit";
import { androidPlayBillingService } from "@/lib/android-play-billing";
import { track as trackEvent } from "@/lib/analytics";

export interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  priceAmount: number;
  type: "subscription" | "consumable" | "non-consumable";
  subscriptionPeriod?: "monthly" | "yearly";
}

export interface Purchase {
  productId: string;
  transactionId: string;
  purchaseToken: string;
  purchaseTime: Date;
  isValid: boolean;
  isSubscription: boolean;
  expiryTime?: Date;
}

export interface InAppPurchaseConfig {
  products: Record<string, Omit<Product, "price" | "priceAmount">>;
  enableTestMode: boolean;
  apiEndpoint: string;
}

type PlatformType = "ios" | "android" | "web";

class InAppPurchaseService {
  private config: InAppPurchaseConfig;
  private platform: PlatformType = "web";
  private products: Map<string, Product> = new Map();
  private purchases: Map<string, Purchase> = new Map();
  private isInitialized = false;

  constructor(config: InAppPurchaseConfig) {
    this.config = config;
    this.detectPlatform();
  }

  /**
   * Detect the current platform
   */
  private detectPlatform(): void {
    if (typeof window === "undefined") return;

    const userAgent = navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(userAgent)) {
      this.platform = "ios";
    } else if (/android/.test(userAgent)) {
      this.platform = "android";
    } else {
      this.platform = "web";
    }
  }

  /**
   * Initialize the in-app purchase system
   */
  async initialize(): Promise<boolean> {
    try {
      if (this.platform === "web") {
        // For web, we'll use Stripe or similar service
        await this.initializeWebPayments();
      } else if (this.platform === "ios") {
        // For iOS, this would integrate with StoreKit
        await this.initializeIOSPayments();
      } else if (this.platform === "android") {
        // For Android, this would integrate with Google Play Billing
        await this.initializeAndroidPayments();
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize in-app purchases:", error);
      return false;
    }
  }

  /**
   * Initialize web payments (Stripe integration)
   */
  private async initializeWebPayments(): Promise<void> {
    // Load Stripe or other payment processor
    // This would typically load the Stripe SDK

    // For now, we'll simulate with mock products
    const mockProducts: Product[] = [
      {
        id: "premium_monthly",
        title: "Vibely Premium Monthly",
        description: "Unlimited covers, no watermarks, HD export",
        price: "$4.99",
        currency: "USD",
        priceAmount: 4.99,
        type: "subscription",
        subscriptionPeriod: "monthly",
      },
      {
        id: "premium_yearly",
        title: "Vibely Premium Yearly",
        description: "Unlimited covers, no watermarks, HD export - Save 40%",
        price: "$29.99",
        currency: "USD",
        priceAmount: 29.99,
        type: "subscription",
        subscriptionPeriod: "yearly",
      },
      {
        id: "extra_covers_pack",
        title: "10 Extra Covers",
        description: "Add 10 more covers to your monthly quota",
        price: "$1.99",
        currency: "USD",
        priceAmount: 1.99,
        type: "consumable",
      },
    ];

    mockProducts.forEach((product) => {
      this.products.set(product.id, product);
    });
  }

  /**
   * Initialize iOS payments (StoreKit integration)
   */
  private async initializeIOSPayments(): Promise<void> {
    try {
      // Try to initialize iOS StoreKit
      const isStoreKitReady = await iosStoreKitService.initialize();
      
      if (isStoreKitReady) {
        // Load products from StoreKit
        const storeKitProducts = iosStoreKitService.getAvailableProducts();
        
        // Map StoreKit products to our format
        storeKitProducts.forEach((skProduct) => {
          const vibelyProductId = this.mapAppStoreToVibelyProductId(skProduct.productIdentifier);
          if (vibelyProductId) {
            const product: Product = {
              id: vibelyProductId,
              title: skProduct.localizedTitle,
              description: skProduct.localizedDescription,
              price: `$${skProduct.price.toFixed(2)}`,
              currency: "USD", // Extract from priceLocale if needed
              priceAmount: skProduct.price,
              type: skProduct.subscriptionPeriod ? "subscription" : "consumable",
              subscriptionPeriod: skProduct.subscriptionPeriod ? 
                (skProduct.subscriptionPeriod.unit === "month" ? "monthly" : "yearly") : undefined,
            };
            this.products.set(product.id, product);
          }
        });
        
        console.log("iOS StoreKit initialized successfully");
        return;
      }
    } catch (error) {
      console.warn("Failed to initialize StoreKit, falling back to web payments:", error);
    }

    // Fallback to web payments if StoreKit fails
    await this.initializeWebPayments();
  }

  /**
   * Initialize Android payments (Google Play Billing)
   */
  private async initializeAndroidPayments(): Promise<void> {
    try {
      // Try to initialize Android Google Play Billing
      const isBillingReady = await androidPlayBillingService.initialize();
      
      if (isBillingReady) {
        // Load products from Play Billing
        const playBillingProducts = androidPlayBillingService.getAvailableProducts();
        
        // Map Play Billing products to our format
        playBillingProducts.forEach((pbProduct) => {
          const vibelyProductId = this.mapPlayBillingToVibelyProductId(pbProduct.productId);
          if (vibelyProductId) {
            const product: Product = {
              id: vibelyProductId,
              title: pbProduct.title,
              description: pbProduct.description,
              price: pbProduct.price,
              currency: pbProduct.priceCurrencyCode,
              priceAmount: pbProduct.priceAmountMicros / 1000000, // Convert micros to standard units
              type: pbProduct.productType === "subs" ? "subscription" : "consumable",
              subscriptionPeriod: pbProduct.subscriptionOfferDetails?.[0]?.pricingPhases?.[0]?.billingPeriod?.includes("P1M") ? "monthly" :
                                 pbProduct.subscriptionOfferDetails?.[0]?.pricingPhases?.[0]?.billingPeriod?.includes("P1Y") ? "yearly" : undefined,
            };
            this.products.set(product.id, product);
          }
        });
        
        console.log("Android Google Play Billing initialized successfully");
        return;
      }
    } catch (error) {
      console.warn("Failed to initialize Google Play Billing, falling back to web payments:", error);
    }

    // Fallback to web payments if Google Play Billing fails
    await this.initializeWebPayments();
  }

  /**
   * Get available products
   */
  async getProducts(): Promise<Product[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return Array.from(this.products.values());
  }

  /**
   * Purchase a product
   */
  async purchaseProduct(productId: string): Promise<Purchase | null> {
    if (!this.isInitialized) {
      throw new Error("In-app purchases not initialized");
    }

    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    try {
      if (this.platform === "web") {
        return await this.purchaseWebProduct(product);
      } else if (this.platform === "ios") {
        return await this.purchaseIOSProduct(product);
      } else if (this.platform === "android") {
        return await this.purchaseAndroidProduct(product);
      }

      return null;
    } catch (error) {
      console.error("Purchase failed:", error);
      throw error;
    }
  }

  /**
   * Purchase product on web (Stripe)
   */
  private async purchaseWebProduct(product: Product): Promise<Purchase | null> {
    try {
      // This would integrate with Stripe Checkout or Payment Intents
      const response = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          priceAmount: product.priceAmount,
          currency: product.currency,
          type: product.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url, sessionId } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;

      // This would be handled by the success callback
      return null;
    } catch (error) {
      console.error("Web purchase failed:", error);
      throw error;
    }
  }

  /**
   * Purchase product on iOS (StoreKit)
   */
  private async purchaseIOSProduct(product: Product): Promise<Purchase | null> {
    try {
      trackEvent("ios_purchase_initiated", {
        product_id: product.id,
        platform: "ios"
      });

      // Use iOS StoreKit service
      const transaction = await iosStoreKitService.purchaseProduct(product.id);
      
      if (transaction && transaction.transactionState === "purchased") {
        const purchase: Purchase = {
          productId: product.id,
          transactionId: transaction.transactionIdentifier,
          purchaseToken: transaction.transactionReceipt,
          purchaseTime: new Date(transaction.transactionDate),
          isValid: true,
          isSubscription: product.type === "subscription",
          // expiryTime would be set based on subscription info if applicable
        };
        
        // Store the purchase locally
        this.purchases.set(transaction.transactionIdentifier, purchase);
        
        trackEvent("ios_purchase_success", {
          product_id: product.id,
          transaction_id: transaction.transactionIdentifier,
          platform: "ios"
        });
        
        return purchase;
      } else {
        throw new Error("Purchase transaction failed or was cancelled");
      }
    } catch (error) {
      console.error("iOS purchase failed:", error);
      trackEvent("ios_purchase_failed", {
        product_id: product.id,
        error: error instanceof Error ? error.message : "Unknown error",
        platform: "ios"
      });
      
      // Fallback to web purchase if StoreKit fails
      console.log("iOS purchase failed, falling back to web");
      return await this.purchaseWebProduct(product);
    }
  }

  /**
   * Purchase product on Android (Google Play Billing)
   */
  private async purchaseAndroidProduct(product: Product): Promise<Purchase | null> {
    try {
      trackEvent("android_purchase_initiated", {
        product_id: product.id,
        platform: "android"
      });

      // Use Android Google Play Billing service
      const purchase = await androidPlayBillingService.purchaseProduct(product.id);
      
      if (purchase && purchase.purchaseState === "purchased") {
        const processedPurchase: Purchase = {
          productId: product.id,
          transactionId: purchase.orderId,
          purchaseToken: purchase.purchaseToken,
          purchaseTime: new Date(purchase.purchaseTime),
          isValid: true,
          isSubscription: product.type === "subscription",
          // expiryTime would be set based on subscription info if applicable
        };
        
        // Store the purchase locally
        this.purchases.set(purchase.orderId, processedPurchase);
        
        trackEvent("android_purchase_success", {
          product_id: product.id,
          order_id: purchase.orderId,
          platform: "android"
        });
        
        return processedPurchase;
      } else if (purchase && purchase.purchaseState === "pending") {
        trackEvent("android_purchase_pending", {
          product_id: product.id,
          order_id: purchase.orderId,
          platform: "android"
        });
        
        // Return null for pending purchases, they'll be processed when approved
        return null;
      } else {
        throw new Error("Purchase failed or was cancelled");
      }
    } catch (error) {
      console.error("Android purchase failed:", error);
      trackEvent("android_purchase_failed", {
        product_id: product.id,
        error: error instanceof Error ? error.message : "Unknown error",
        platform: "android"
      });
      
      // Fallback to web purchase if Google Play Billing fails
      console.log("Android purchase failed, falling back to web");
      return await this.purchaseWebProduct(product);
    }
  }

  /**
   * Restore purchases (mainly for iOS)
   */
  async restorePurchases(): Promise<Purchase[]> {
    try {
      if (this.platform === "ios") {
        // Restore iOS purchases through StoreKit
        return await this.restoreIOSPurchases();
      } else if (this.platform === "android") {
        // Query purchase history through Google Play Billing
        return await this.restoreAndroidPurchases();
      } else {
        // For web, check with backend
        return await this.restoreWebPurchases();
      }
    } catch (error) {
      console.error("Failed to restore purchases:", error);
      return [];
    }
  }

  /**
   * Restore iOS purchases
   */
  private async restoreIOSPurchases(): Promise<Purchase[]> {
    try {
      trackEvent("ios_restore_initiated", {
        platform: "ios"
      });

      const transactions = await iosStoreKitService.restorePurchases();
      const restoredPurchases: Purchase[] = [];
      
      transactions.forEach((transaction) => {
        if (transaction.transactionState === "purchased" || transaction.transactionState === "restored") {
          const vibelyProductId = this.mapAppStoreToVibelyProductId(transaction.productIdentifier);
          if (vibelyProductId) {
            const purchase: Purchase = {
              productId: vibelyProductId,
              transactionId: transaction.transactionIdentifier,
              purchaseToken: transaction.transactionReceipt,
              purchaseTime: new Date(transaction.transactionDate),
              isValid: true,
              isSubscription: this.products.get(vibelyProductId)?.type === "subscription",
            };
            
            // Store the restored purchase
            this.purchases.set(transaction.transactionIdentifier, purchase);
            restoredPurchases.push(purchase);
          }
        }
      });
      
      trackEvent("ios_restore_success", {
        platform: "ios",
        restored_count: restoredPurchases.length
      });
      
      return restoredPurchases;
    } catch (error) {
      console.error("iOS restore failed:", error);
      trackEvent("ios_restore_failed", {
        platform: "ios",
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return [];
    }
  }

  /**
   * Restore Android purchases
   */
  private async restoreAndroidPurchases(): Promise<Purchase[]> {
    try {
      trackEvent("android_query_purchases", {
        platform: "android"
      });

      const playBillingPurchases = await androidPlayBillingService.queryPurchases();
      const restoredPurchases: Purchase[] = [];
      
      playBillingPurchases.forEach((purchase) => {
        if (purchase.purchaseState === "purchased") {
          const vibelyProductId = this.mapPlayBillingToVibelyProductId(purchase.productId);
          if (vibelyProductId) {
            const processedPurchase: Purchase = {
              productId: vibelyProductId,
              transactionId: purchase.orderId,
              purchaseToken: purchase.purchaseToken,
              purchaseTime: new Date(purchase.purchaseTime),
              isValid: true,
              isSubscription: this.products.get(vibelyProductId)?.type === "subscription",
            };
            
            // Store the restored purchase
            this.purchases.set(purchase.orderId, processedPurchase);
            restoredPurchases.push(processedPurchase);
          }
        }
      });
      
      trackEvent("android_query_purchases_success", {
        platform: "android",
        purchases_found: restoredPurchases.length
      });
      
      return restoredPurchases;
    } catch (error) {
      console.error("Android purchases query failed:", error);
      trackEvent("android_query_purchases_failed", {
        platform: "android",
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return [];
    }
  }

  /**
   * Restore web purchases
   */
  private async restoreWebPurchases(): Promise<Purchase[]> {
    try {
      const response = await fetch("/api/payments/user-purchases");
      if (!response.ok) {
        throw new Error("Failed to fetch user purchases");
      }

      const purchases = await response.json();
      return purchases.map((p: any) => ({
        ...p,
        purchaseTime: new Date(p.purchaseTime),
        expiryTime: p.expiryTime ? new Date(p.expiryTime) : undefined,
      }));
    } catch (error) {
      console.error("Failed to restore web purchases:", error);
      return [];
    }
  }

  /**
   * Validate a purchase receipt
   */
  async validatePurchase(purchaseData: any): Promise<boolean> {
    try {
      const response = await fetch("/api/payments/validate-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: this.platform,
          purchaseData,
        }),
      });

      if (!response.ok) {
        throw new Error("Purchase validation failed");
      }

      const { isValid } = await response.json();
      return isValid;
    } catch (error) {
      console.error("Purchase validation error:", error);
      return false;
    }
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(): Promise<boolean> {
    try {
      const purchases = await this.restorePurchases();
      const now = new Date();

      return purchases.some(
        (purchase) =>
          purchase.isSubscription &&
          purchase.isValid &&
          (!purchase.expiryTime || purchase.expiryTime > now),
      );
    } catch (error) {
      console.error("Failed to check subscription status:", error);
      return false;
    }
  }

  /**
   * Map Google Play product ID to Vibely product ID
   */
  private mapPlayBillingToVibelyProductId(playProductId: string): string | null {
    const mapping: Record<string, string> = {
      "com.vibely.premium.monthly": "premium_monthly",
      "com.vibely.premium.yearly": "premium_yearly",
      "com.vibely.covers.pack10": "extra_covers_pack",
    };
    return mapping[playProductId] || null;
  }

  /**
   * Map App Store product ID to Vibely product ID
   */
  private mapAppStoreToVibelyProductId(appStoreProductId: string): string | null {
    const mapping: Record<string, string> = {
      "com.vibely.premium.monthly": "premium_monthly",
      "com.vibely.premium.yearly": "premium_yearly",
      "com.vibely.covers.pack10": "extra_covers_pack",
    };
    return mapping[appStoreProductId] || null;
  }

  /**
   * Get current platform
   */
  getPlatform(): PlatformType {
    return this.platform;
  }

  /**
   * Check if in-app purchases are supported
   */
  isSupported(): boolean {
    if (this.platform === "web") {
      // Check if we have payment APIs available
      return true;
    } else if (this.platform === "ios") {
      // Check if StoreKit is available, fallback to web
      return "StoreKit" in window || true; // Always fallback to web
    } else if (this.platform === "android") {
      // Check if Google Play Billing is available, fallback to web
      return "GooglePlayBilling" in window || true; // Always fallback to web
    }

    return false;
  }

  /**
   * Handle purchase completion (called by payment success page)
   */
  async handlePurchaseCompletion(sessionId: string): Promise<Purchase | null> {
    try {
      const response = await fetch("/api/payments/complete-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete purchase");
      }

      const purchase = await response.json();
      return {
        ...purchase,
        purchaseTime: new Date(purchase.purchaseTime),
        expiryTime: purchase.expiryTime ? new Date(purchase.expiryTime) : undefined,
      };
    } catch (error) {
      console.error("Purchase completion failed:", error);
      return null;
    }
  }
}

// Create singleton instance
const inAppPurchaseConfig: InAppPurchaseConfig = {
  products: {
    premium_monthly: {
      id: "premium_monthly",
      title: "Vibely Premium Monthly",
      description: "Unlimited covers, no watermarks, HD export",
      currency: "USD",
      type: "subscription",
      subscriptionPeriod: "monthly",
    },
    premium_yearly: {
      id: "premium_yearly",
      title: "Vibely Premium Yearly",
      description: "Unlimited covers, no watermarks, HD export - Save 40%",
      currency: "USD",
      type: "subscription",
      subscriptionPeriod: "yearly",
    },
  },
  enableTestMode: process.env.NODE_ENV !== "production",
  apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || "",
};

export const inAppPurchase = new InAppPurchaseService(inAppPurchaseConfig);

export type { PlatformType };
