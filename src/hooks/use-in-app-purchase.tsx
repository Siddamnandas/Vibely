'use client';

import { useState, useEffect, useCallback } from 'react';
import { inAppPurchase, Product, Purchase } from '@/lib/in-app-purchase';

interface InAppPurchaseState {
  products: Product[];
  purchases: Purchase[];
  isLoading: boolean;
  error: string | null;
  hasActiveSubscription: boolean;
  isInitialized: boolean;
}

export function useInAppPurchase() {
  const [state, setState] = useState<InAppPurchaseState>({
    products: [],
    purchases: [],
    isLoading: true,
    error: null,
    hasActiveSubscription: false,
    isInitialized: false,
  });

  // Initialize in-app purchases on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const success = await inAppPurchase.initialize();
        
        if (success) {
          const [products, hasSubscription] = await Promise.all([
            inAppPurchase.getProducts(),
            inAppPurchase.hasActiveSubscription(),
          ]);
          
          setState(prev => ({
            ...prev,
            products,
            hasActiveSubscription: hasSubscription,
            isInitialized: true,
            isLoading: false,
          }));
        } else {
          throw new Error('Failed to initialize in-app purchases');
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Initialization failed',
          isLoading: false,
        }));
      }
    };

    initialize();
  }, []);

  // Purchase a product
  const purchaseProduct = useCallback(async (productId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const purchase = await inAppPurchase.purchaseProduct(productId);
      
      if (purchase) {
        setState(prev => ({
          ...prev,
          purchases: [...prev.purchases, purchase],
          hasActiveSubscription: purchase.isSubscription ? true : prev.hasActiveSubscription,
          isLoading: false,
        }));
        return purchase;
      } else {
        // Purchase was initiated but not completed (e.g., redirected to Stripe)
        setState(prev => ({ ...prev, isLoading: false }));
        return null;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Purchase failed',
        isLoading: false,
      }));
      throw error;
    }
  }, []);

  // Restore purchases
  const restorePurchases = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const purchases = await inAppPurchase.restorePurchases();
      
      const hasSubscription = purchases.some(purchase => 
        purchase.isSubscription && 
        purchase.isValid && 
        (!purchase.expiryTime || purchase.expiryTime > new Date())
      );

      setState(prev => ({
        ...prev,
        purchases,
        hasActiveSubscription: hasSubscription,
        isLoading: false,
      }));

      return purchases;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Restore failed',
        isLoading: false,
      }));
      return [];
    }
  }, []);

  // Check subscription status
  const refreshSubscriptionStatus = useCallback(async () => {
    try {
      const hasSubscription = await inAppPurchase.hasActiveSubscription();
      setState(prev => ({
        ...prev,
        hasActiveSubscription: hasSubscription,
      }));
      return hasSubscription;
    } catch (error) {
      console.error('Failed to refresh subscription status:', error);
      return false;
    }
  }, []);

  // Get product by ID
  const getProduct = useCallback((productId: string): Product | null => {
    return state.products.find(product => product.id === productId) || null;
  }, [state.products]);

  // Check if product is purchased
  const isProductPurchased = useCallback((productId: string): boolean => {
    return state.purchases.some(purchase => 
      purchase.productId === productId && 
      purchase.isValid &&
      (!purchase.expiryTime || purchase.expiryTime > new Date())
    );
  }, [state.purchases]);

  // Get active subscription
  const getActiveSubscription = useCallback((): Purchase | null => {
    const now = new Date();
    return state.purchases.find(purchase =>
      purchase.isSubscription &&
      purchase.isValid &&
      (!purchase.expiryTime || purchase.expiryTime > now)
    ) || null;
  }, [state.purchases]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get platform info
  const getPlatformInfo = useCallback(() => {
    return {
      platform: inAppPurchase.getPlatform(),
      isSupported: inAppPurchase.isSupported(),
    };
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    purchaseProduct,
    restorePurchases,
    refreshSubscriptionStatus,
    clearError,
    
    // Utils
    getProduct,
    isProductPurchased,
    getActiveSubscription,
    getPlatformInfo,
  };
}