'use client';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  priceAmount: number;
  type: 'subscription' | 'consumable' | 'non-consumable';
  subscriptionPeriod?: 'monthly' | 'yearly';
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
  products: Record<string, Omit<Product, 'price' | 'priceAmount'>>;
  enableTestMode: boolean;
  apiEndpoint: string;
}

type PlatformType = 'ios' | 'android' | 'web';

class InAppPurchaseService {
  private config: InAppPurchaseConfig;
  private platform: PlatformType = 'web';
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
    if (typeof window === 'undefined') return;
    
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      this.platform = 'ios';
    } else if (/android/.test(userAgent)) {
      this.platform = 'android';
    } else {
      this.platform = 'web';
    }
  }

  /**
   * Initialize the in-app purchase system
   */
  async initialize(): Promise<boolean> {
    try {
      if (this.platform === 'web') {
        // For web, we'll use Stripe or similar service
        await this.initializeWebPayments();
      } else if (this.platform === 'ios') {
        // For iOS, this would integrate with StoreKit
        await this.initializeIOSPayments();
      } else if (this.platform === 'android') {
        // For Android, this would integrate with Google Play Billing
        await this.initializeAndroidPayments();
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize in-app purchases:', error);
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
        id: 'premium_monthly',
        title: 'Vibely Premium Monthly',
        description: 'Unlimited covers, no watermarks, HD export',
        price: '$4.99',
        currency: 'USD',
        priceAmount: 4.99,
        type: 'subscription',
        subscriptionPeriod: 'monthly',
      },
      {
        id: 'premium_yearly',
        title: 'Vibely Premium Yearly',
        description: 'Unlimited covers, no watermarks, HD export - Save 40%',
        price: '$29.99',
        currency: 'USD',
        priceAmount: 29.99,
        type: 'subscription',
        subscriptionPeriod: 'yearly',
      },
      {
        id: 'extra_covers_pack',
        title: '10 Extra Covers',
        description: 'Add 10 more covers to your monthly quota',
        price: '$1.99',
        currency: 'USD',
        priceAmount: 1.99,
        type: 'consumable',
      },
    ];

    mockProducts.forEach(product => {
      this.products.set(product.id, product);
    });
  }

  /**
   * Initialize iOS payments (StoreKit integration)
   */
  private async initializeIOSPayments(): Promise<void> {
    // This would integrate with StoreKit through a Capacitor/Cordova plugin
    // For now, we'll use web fallback
    
    if ('StoreKit' in window) {
      // Native iOS integration would go here
      console.log('StoreKit integration not implemented yet');
    }
    
    // Fallback to web payments
    await this.initializeWebPayments();
  }

  /**
   * Initialize Android payments (Google Play Billing)
   */
  private async initializeAndroidPayments(): Promise<void> {
    // This would integrate with Google Play Billing through a Capacitor/Cordova plugin
    // For now, we'll use web fallback
    
    if ('GooglePlayBilling' in window) {
      // Native Android integration would go here
      console.log('Google Play Billing integration not implemented yet');
    }
    
    // Fallback to web payments
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
      throw new Error('In-app purchases not initialized');
    }

    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    try {
      if (this.platform === 'web') {
        return await this.purchaseWebProduct(product);
      } else if (this.platform === 'ios') {
        return await this.purchaseIOSProduct(product);
      } else if (this.platform === 'android') {
        return await this.purchaseAndroidProduct(product);
      }
      
      return null;
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  /**
   * Purchase product on web (Stripe)
   */
  private async purchaseWebProduct(product: Product): Promise<Purchase | null> {
    try {
      // This would integrate with Stripe Checkout or Payment Intents
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          priceAmount: product.priceAmount,
          currency: product.currency,
          type: product.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url, sessionId } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
      
      // This would be handled by the success callback
      return null;
    } catch (error) {
      console.error('Web purchase failed:', error);
      throw error;
    }
  }

  /**
   * Purchase product on iOS (StoreKit)
   */
  private async purchaseIOSProduct(product: Product): Promise<Purchase | null> {
    // This would use StoreKit through a native bridge
    console.log('iOS purchase not implemented yet, falling back to web');
    return await this.purchaseWebProduct(product);
  }

  /**
   * Purchase product on Android (Google Play Billing)
   */
  private async purchaseAndroidProduct(product: Product): Promise<Purchase | null> {
    // This would use Google Play Billing through a native bridge
    console.log('Android purchase not implemented yet, falling back to web');
    return await this.purchaseWebProduct(product);
  }

  /**
   * Restore purchases (mainly for iOS)
   */
  async restorePurchases(): Promise<Purchase[]> {
    try {
      if (this.platform === 'ios') {
        // Restore iOS purchases through StoreKit
        return await this.restoreIOSPurchases();
      } else if (this.platform === 'android') {
        // Query purchase history through Google Play Billing
        return await this.restoreAndroidPurchases();
      } else {
        // For web, check with backend
        return await this.restoreWebPurchases();
      }
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return [];
    }
  }

  /**
   * Restore iOS purchases
   */
  private async restoreIOSPurchases(): Promise<Purchase[]> {
    // Implementation would go here
    return [];
  }

  /**
   * Restore Android purchases
   */
  private async restoreAndroidPurchases(): Promise<Purchase[]> {
    // Implementation would go here
    return [];
  }

  /**
   * Restore web purchases
   */
  private async restoreWebPurchases(): Promise<Purchase[]> {
    try {
      const response = await fetch('/api/payments/user-purchases');
      if (!response.ok) {
        throw new Error('Failed to fetch user purchases');
      }
      
      const purchases = await response.json();
      return purchases.map((p: any) => ({
        ...p,
        purchaseTime: new Date(p.purchaseTime),
        expiryTime: p.expiryTime ? new Date(p.expiryTime) : undefined,
      }));
    } catch (error) {
      console.error('Failed to restore web purchases:', error);
      return [];
    }
  }

  /**
   * Validate a purchase receipt
   */
  async validatePurchase(purchaseData: any): Promise<boolean> {
    try {
      const response = await fetch('/api/payments/validate-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: this.platform,
          purchaseData,
        }),
      });

      if (!response.ok) {
        throw new Error('Purchase validation failed');
      }

      const { isValid } = await response.json();
      return isValid;
    } catch (error) {
      console.error('Purchase validation error:', error);
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
      
      return purchases.some(purchase => 
        purchase.isSubscription && 
        purchase.isValid && 
        (!purchase.expiryTime || purchase.expiryTime > now)
      );
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
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
    if (this.platform === 'web') {
      // Check if we have payment APIs available
      return true;
    } else if (this.platform === 'ios') {
      // Check if StoreKit is available, fallback to web
      return 'StoreKit' in window || true; // Always fallback to web
    } else if (this.platform === 'android') {
      // Check if Google Play Billing is available, fallback to web
      return 'GooglePlayBilling' in window || true; // Always fallback to web
    }
    
    return false;
  }

  /**
   * Handle purchase completion (called by payment success page)
   */
  async handlePurchaseCompletion(sessionId: string): Promise<Purchase | null> {
    try {
      const response = await fetch('/api/payments/complete-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete purchase');
      }

      const purchase = await response.json();
      return {
        ...purchase,
        purchaseTime: new Date(purchase.purchaseTime),
        expiryTime: purchase.expiryTime ? new Date(purchase.expiryTime) : undefined,
      };
    } catch (error) {
      console.error('Purchase completion failed:', error);
      return null;
    }
  }
}

// Create singleton instance
const inAppPurchaseConfig: InAppPurchaseConfig = {
  products: {
    premium_monthly: {
      id: 'premium_monthly',
      title: 'Vibely Premium Monthly',
      description: 'Unlimited covers, no watermarks, HD export',
      currency: 'USD',
      type: 'subscription',
      subscriptionPeriod: 'monthly',
    },
    premium_yearly: {
      id: 'premium_yearly',
      title: 'Vibely Premium Yearly', 
      description: 'Unlimited covers, no watermarks, HD export - Save 40%',
      currency: 'USD',
      type: 'subscription',
      subscriptionPeriod: 'yearly',
    },
  },
  enableTestMode: process.env.NODE_ENV !== 'production',
  apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || '',
};

export const inAppPurchase = new InAppPurchaseService(inAppPurchaseConfig);

export type { PlatformType };