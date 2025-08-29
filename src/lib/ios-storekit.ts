"use client";

import { track as trackEvent } from "@/lib/analytics";

// iOS StoreKit Types and Interfaces
export interface StoreKitProduct {
  productIdentifier: string;
  localizedTitle: string;
  localizedDescription: string;
  price: number;
  priceLocale: string;
  subscriptionPeriod?: {
    unit: "day" | "week" | "month" | "year";
    numberOfUnits: number;
  };
}

export interface StoreKitTransaction {
  transactionIdentifier: string;
  productIdentifier: string;
  transactionDate: string;
  transactionReceipt: string;
  transactionState: "purchased" | "failed" | "restored" | "deferred" | "purchasing";
  originalTransaction?: StoreKitTransaction;
}

export interface StoreKitError {
  code: number;
  localizedDescription: string;
  domain: string;
}

// StoreKit Bridge Interface - This would be implemented by native iOS code
declare global {
  interface Window {
    StoreKit?: {
      // Product management
      requestProducts: (productIds: string[]) => Promise<StoreKitProduct[]>;

      // Purchase management
      purchaseProduct: (productId: string) => Promise<StoreKitTransaction>;
      restorePurchases: () => Promise<StoreKitTransaction[]>;
      finishTransaction: (transactionId: string) => Promise<void>;

      // Receipt validation
      getAppStoreReceiptData: () => Promise<string>;

      // Subscription management
      getSubscriptionStatus: (productId: string) => Promise<{
        isActive: boolean;
        expirationDate?: string;
        autoRenewStatus: boolean;
      }>;

      // Events
      onTransactionUpdate: (callback: (transaction: StoreKitTransaction) => void) => void;
      onProductsRequest: (
        callback: (products: StoreKitProduct[], invalidIds: string[]) => void,
      ) => void;
    };
  }
}

/**
 * iOS StoreKit Service
 * Handles native iOS in-app purchases through StoreKit
 */
export class IOSStoreKitService {
  private isInitialized = false;
  private products = new Map<string, StoreKitProduct>();
  private pendingTransactions = new Map<string, Promise<StoreKitTransaction>>();

  // Map Vibely product IDs to iOS App Store product IDs
  private readonly productIdMapping = {
    premium_monthly: "com.vibely.premium.monthly",
    premium_yearly: "com.vibely.premium.yearly",
    extra_covers_pack: "com.vibely.covers.pack10",
  };

  constructor() {
    this.setupTransactionObserver();
  }

  /**
   * Initialize StoreKit and load products
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.isStoreKitAvailable()) {
        throw new Error("StoreKit not available on this platform");
      }

      // Request products from App Store
      const appStoreProductIds = Object.values(this.productIdMapping);
      const products = await window.StoreKit!.requestProducts(appStoreProductIds);

      // Cache products
      products.forEach((product) => {
        this.products.set(product.productIdentifier, product);
      });

      this.isInitialized = true;

      trackEvent("ios_storekit_initialized", {
        products_loaded: products.length,
        platform: "ios",
      });

      return true;
    } catch (error) {
      console.error("Failed to initialize StoreKit:", error);
      trackEvent("ios_storekit_init_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        platform: "ios",
      });
      return false;
    }
  }

  /**
   * Check if StoreKit is available
   */
  private isStoreKitAvailable(): boolean {
    return typeof window !== "undefined" && "StoreKit" in window && window.StoreKit !== undefined;
  }

  /**
   * Set up transaction observer to handle transaction updates
   */
  private setupTransactionObserver(): void {
    if (!this.isStoreKitAvailable()) return;

    window.StoreKit!.onTransactionUpdate((transaction) => {
      this.handleTransactionUpdate(transaction);
    });
  }

  /**
   * Handle transaction state updates from StoreKit
   */
  private async handleTransactionUpdate(transaction: StoreKitTransaction): Promise<void> {
    try {
      switch (transaction.transactionState) {
        case "purchased":
          await this.handlePurchaseSuccess(transaction);
          break;
        case "restored":
          await this.handlePurchaseRestore(transaction);
          break;
        case "failed":
          await this.handlePurchaseFailure(transaction);
          break;
        case "deferred":
          await this.handlePurchaseDeferred(transaction);
          break;
      }
    } catch (error) {
      console.error("Error handling transaction update:", error);
    }
  }

  /**
   * Handle successful purchase
   */
  private async handlePurchaseSuccess(transaction: StoreKitTransaction): Promise<void> {
    try {
      // Validate receipt with our server
      const receiptData = await window.StoreKit!.getAppStoreReceiptData();
      const isValid = await this.validateReceipt(receiptData, transaction);

      if (isValid) {
        // Update local subscription state
        await this.processValidatedPurchase(transaction);

        trackEvent("ios_purchase_success", {
          product_id: transaction.productIdentifier,
          transaction_id: transaction.transactionIdentifier,
          platform: "ios",
        });
      } else {
        console.error(
          "Receipt validation failed for transaction:",
          transaction.transactionIdentifier,
        );
        trackEvent("ios_receipt_validation_failed", {
          product_id: transaction.productIdentifier,
          transaction_id: transaction.transactionIdentifier,
          platform: "ios",
        });
      }

      // Always finish the transaction
      await window.StoreKit!.finishTransaction(transaction.transactionIdentifier);
    } catch (error) {
      console.error("Error processing purchase success:", error);
      trackEvent("ios_purchase_processing_error", {
        product_id: transaction.productIdentifier,
        transaction_id: transaction.transactionIdentifier,
        error: error instanceof Error ? error.message : "Unknown error",
        platform: "ios",
      });
    }
  }

  /**
   * Handle purchase restoration
   */
  private async handlePurchaseRestore(transaction: StoreKitTransaction): Promise<void> {
    try {
      // Process restored purchase similar to new purchase
      await this.handlePurchaseSuccess(transaction);

      trackEvent("ios_purchase_restored", {
        product_id: transaction.productIdentifier,
        transaction_id: transaction.transactionIdentifier,
        original_transaction_id: transaction.originalTransaction?.transactionIdentifier,
        platform: "ios",
      });
    } catch (error) {
      console.error("Error processing restored purchase:", error);
    }
  }

  /**
   * Handle purchase failure
   */
  private async handlePurchaseFailure(transaction: StoreKitTransaction): Promise<void> {
    trackEvent("ios_purchase_failed", {
      product_id: transaction.productIdentifier,
      transaction_id: transaction.transactionIdentifier,
      platform: "ios",
    });

    // Finish failed transaction
    await window.StoreKit!.finishTransaction(transaction.transactionIdentifier);
  }

  /**
   * Handle deferred purchase (requires parental approval)
   */
  private async handlePurchaseDeferred(transaction: StoreKitTransaction): Promise<void> {
    trackEvent("ios_purchase_deferred", {
      product_id: transaction.productIdentifier,
      transaction_id: transaction.transactionIdentifier,
      platform: "ios",
    });

    // Don't finish deferred transactions - they will complete later
  }

  /**
   * Purchase a product
   */
  async purchaseProduct(vibelyProductId: string): Promise<StoreKitTransaction | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const appStoreProductId =
      this.productIdMapping[vibelyProductId as keyof typeof this.productIdMapping];
    if (!appStoreProductId) {
      throw new Error(`Unknown product ID: ${vibelyProductId}`);
    }

    const product = this.products.get(appStoreProductId);
    if (!product) {
      throw new Error(`Product not available: ${appStoreProductId}`);
    }

    try {
      trackEvent("ios_purchase_initiated", {
        product_id: appStoreProductId,
        vibely_product_id: vibelyProductId,
        platform: "ios",
      });

      // Initiate purchase through StoreKit
      const transaction = await window.StoreKit!.purchaseProduct(appStoreProductId);
      return transaction;
    } catch (error) {
      console.error("Purchase failed:", error);
      trackEvent("ios_purchase_failed", {
        product_id: appStoreProductId,
        vibely_product_id: vibelyProductId,
        error: error instanceof Error ? error.message : "Unknown error",
        platform: "ios",
      });
      throw error;
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<StoreKitTransaction[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      trackEvent("ios_restore_initiated", {
        platform: "ios",
      });

      const transactions = await window.StoreKit!.restorePurchases();

      trackEvent("ios_restore_completed", {
        transactions_found: transactions.length,
        platform: "ios",
      });

      return transactions;
    } catch (error) {
      console.error("Failed to restore purchases:", error);
      trackEvent("ios_restore_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        platform: "ios",
      });
      throw error;
    }
  }

  /**
   * Validate receipt with server
   */
  private async validateReceipt(
    receiptData: string,
    transaction: StoreKitTransaction,
  ): Promise<boolean> {
    try {
      const response = await fetch("/api/payments/validate-ios-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiptData,
          transactionId: transaction.transactionIdentifier,
          productId: transaction.productIdentifier,
        }),
      });

      if (!response.ok) {
        throw new Error(`Receipt validation failed: ${response.status}`);
      }

      const { isValid, purchaseInfo } = await response.json();
      return isValid;
    } catch (error) {
      console.error("Receipt validation error:", error);
      return false;
    }
  }

  /**
   * Process validated purchase with backend
   */
  private async processValidatedPurchase(transaction: StoreKitTransaction): Promise<void> {
    try {
      const response = await fetch("/api/payments/process-ios-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: transaction.transactionIdentifier,
          productId: transaction.productIdentifier,
          transactionDate: transaction.transactionDate,
          receiptData: await window.StoreKit!.getAppStoreReceiptData(),
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
   * Get available products
   */
  getAvailableProducts(): StoreKitProduct[] {
    return Array.from(this.products.values());
  }

  /**
   * Get product by Vibely product ID
   */
  getProduct(vibelyProductId: string): StoreKitProduct | null {
    const appStoreProductId =
      this.productIdMapping[vibelyProductId as keyof typeof this.productIdMapping];
    if (!appStoreProductId) return null;

    return this.products.get(appStoreProductId) || null;
  }

  /**
   * Check subscription status
   */
  async checkSubscriptionStatus(vibelyProductId: string): Promise<{
    isActive: boolean;
    expirationDate?: Date;
    autoRenewStatus: boolean;
  } | null> {
    if (!this.isInitialized) return null;

    const appStoreProductId =
      this.productIdMapping[vibelyProductId as keyof typeof this.productIdMapping];
    if (!appStoreProductId) return null;

    try {
      const status = await window.StoreKit!.getSubscriptionStatus(appStoreProductId);
      return {
        isActive: status.isActive,
        expirationDate: status.expirationDate ? new Date(status.expirationDate) : undefined,
        autoRenewStatus: status.autoRenewStatus,
      };
    } catch (error) {
      console.error("Failed to check subscription status:", error);
      return null;
    }
  }
}

// Export singleton instance
export const iosStoreKitService = new IOSStoreKitService();
