"use client";

import { 
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  Timestamp,
  onSnapshot,
  DocumentData,
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { track as trackEvent } from "@/lib/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase app if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Subscription types
export interface UserSubscription {
  id?: string;
  userId: string;
  platform: "ios" | "android" | "web";
  productId: string;
  subscriptionType: "premium_monthly" | "premium_yearly";
  status: "active" | "expired" | "cancelled" | "pending" | "grace_period";
  
  // Purchase details
  transactionId: string;
  originalTransactionId?: string; // iOS only
  purchaseToken: string;
  orderId?: string; // Android only
  
  // Timing
  purchaseDate: Date;
  startDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  expirationDate?: Date;
  
  // Billing
  isAutoRenewing: boolean;
  cancelAtPeriodEnd?: boolean;
  
  // Usage
  coversUsedThisMonth: number;
  
  // Features
  features: string[];
  
  // Metadata
  environment: "sandbox" | "production";
  receiptData?: string; // iOS only
  signature?: string; // Android only
  originalJson?: string; // Android only
  
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPurchase {
  id?: string;
  userId: string;
  platform: "ios" | "android" | "web";
  productId: string;
  productType: "consumable" | "non_consumable";
  
  // Purchase details
  transactionId: string;
  purchaseToken: string;
  orderId?: string; // Android only
  
  // Status
  status: "completed" | "pending" | "failed" | "refunded" | "consumed";
  isValid: boolean;
  
  // Timing
  purchaseDate: Date;
  
  // Benefits
  coverCredits?: number;
  features: string[];
  
  // Metadata
  environment: "sandbox" | "production";
  signature?: string; // Android only
  originalJson?: string; // Android only
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription Management Service
 * Replaces localStorage with Firebase server-side storage
 */
export class SubscriptionManagementService {
  private static instance: SubscriptionManagementService;
  
  static getInstance(): SubscriptionManagementService {
    if (!SubscriptionManagementService.instance) {
      SubscriptionManagementService.instance = new SubscriptionManagementService();
    }
    return SubscriptionManagementService.instance;
  }

  /**
   * Create or update user subscription
   */
  async saveSubscription(subscription: Omit<UserSubscription, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      // Check if subscription already exists for this transaction
      const existingSubscription = await this.findSubscriptionByTransaction(
        subscription.transactionId, 
        subscription.platform
      );

      if (existingSubscription) {
        // Update existing subscription
        const updatedData = {
          ...subscription,
          id: existingSubscription.id,
          purchaseDate: Timestamp.fromDate(subscription.purchaseDate),
          startDate: Timestamp.fromDate(subscription.startDate),
          currentPeriodStart: Timestamp.fromDate(subscription.currentPeriodStart),
          currentPeriodEnd: Timestamp.fromDate(subscription.currentPeriodEnd),
          expirationDate: subscription.expirationDate ? Timestamp.fromDate(subscription.expirationDate) : null,
          updatedAt: Timestamp.now(),
          createdAt: existingSubscription.createdAt, // Keep original creation date
        };

        await updateDoc(doc(db, "user_subscriptions", existingSubscription.id), updatedData);

        trackEvent("subscription_updated", {
          subscription_id: existingSubscription.id,
          user_id: subscription.userId,
          platform: subscription.platform,
          product_id: subscription.productId,
        });

        return existingSubscription.id;
      } else {
        // Create new subscription
        const subscriptionData = {
          ...subscription,
          purchaseDate: Timestamp.fromDate(subscription.purchaseDate),
          startDate: Timestamp.fromDate(subscription.startDate),
          currentPeriodStart: Timestamp.fromDate(subscription.currentPeriodStart),
          currentPeriodEnd: Timestamp.fromDate(subscription.currentPeriodEnd),
          expirationDate: subscription.expirationDate ? Timestamp.fromDate(subscription.expirationDate) : null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, "user_subscriptions"), subscriptionData);

        trackEvent("subscription_created", {
          subscription_id: docRef.id,
          user_id: subscription.userId,
          platform: subscription.platform,
          product_id: subscription.productId,
        });

        return docRef.id;
      }
    } catch (error) {
      console.error("Failed to save subscription:", error);
      trackEvent("subscription_save_failed", {
        user_id: subscription.userId,
        platform: subscription.platform,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("Failed to save subscription");
    }
  }

  /**
   * Get user's active subscription
   */
  async getUserActiveSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const subscriptionsRef = collection(db, "user_subscriptions");
      const q = query(
        subscriptionsRef,
        where("userId", "==", userId),
        where("status", "==", "active"),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        purchaseDate: data.purchaseDate.toDate(),
        startDate: data.startDate.toDate(),
        currentPeriodStart: data.currentPeriodStart.toDate(),
        currentPeriodEnd: data.currentPeriodEnd.toDate(),
        expirationDate: data.expirationDate?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as UserSubscription;
    } catch (error) {
      console.error("Failed to get user subscription:", error);
      return null;
    }
  }

  /**
   * Update subscription usage
   */
  async updateSubscriptionUsage(subscriptionId: string, usageIncrement: number): Promise<void> {
    try {
      const docRef = doc(db, "user_subscriptions", subscriptionId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Subscription not found");
      }

      const currentData = docSnap.data();
      const newUsage = (currentData.coversUsedThisMonth || 0) + usageIncrement;

      await updateDoc(docRef, {
        coversUsedThisMonth: newUsage,
        updatedAt: Timestamp.now(),
      });

      trackEvent("subscription_usage_updated", {
        subscription_id: subscriptionId,
        new_usage: newUsage,
        increment: usageIncrement,
      });
    } catch (error) {
      console.error("Failed to update subscription usage:", error);
      throw new Error("Failed to update subscription usage");
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, cancelImmediately: boolean = false): Promise<void> {
    try {
      const updateData: any = {
        cancelAtPeriodEnd: !cancelImmediately,
        status: cancelImmediately ? "cancelled" : "active", // Keep active if cancelling at period end
        updatedAt: Timestamp.now(),
      };

      if (cancelImmediately) {
        updateData.expirationDate = Timestamp.now();
      }

      await updateDoc(doc(db, "user_subscriptions", subscriptionId), updateData);

      trackEvent("subscription_cancelled", {
        subscription_id: subscriptionId,
        immediate: cancelImmediately,
      });
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      throw new Error("Failed to cancel subscription");
    }
  }

  /**
   * Save user purchase (consumable/non-consumable)
   */
  async savePurchase(purchase: Omit<UserPurchase, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const purchaseData = {
        ...purchase,
        purchaseDate: Timestamp.fromDate(purchase.purchaseDate),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "user_purchases"), purchaseData);

      trackEvent("purchase_saved", {
        purchase_id: docRef.id,
        user_id: purchase.userId,
        platform: purchase.platform,
        product_id: purchase.productId,
      });

      return docRef.id;
    } catch (error) {
      console.error("Failed to save purchase:", error);
      trackEvent("purchase_save_failed", {
        user_id: purchase.userId,
        platform: purchase.platform,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("Failed to save purchase");
    }
  }

  /**
   * Get user's purchase history
   */
  async getUserPurchases(userId: string): Promise<UserPurchase[]> {
    try {
      const purchasesRef = collection(db, "user_purchases");
      const q = query(
        purchasesRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          purchaseDate: data.purchaseDate.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as UserPurchase;
      });
    } catch (error) {
      console.error("Failed to get user purchases:", error);
      return [];
    }
  }

  /**
   * Find subscription by transaction ID
   */
  private async findSubscriptionByTransaction(transactionId: string, platform: string): Promise<{ id: string; createdAt: any } | null> {
    try {
      const subscriptionsRef = collection(db, "user_subscriptions");
      const q = query(
        subscriptionsRef,
        where("transactionId", "==", transactionId),
        where("platform", "==", platform)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return { 
        id: doc.id, 
        createdAt: doc.data().createdAt 
      };
    } catch (error) {
      console.error("Error finding subscription by transaction:", error);
      return null;
    }
  }

  /**
   * Update user cover credits (from consumable purchases)
   */
  async updateUserCredits(userId: string, creditsToAdd: number): Promise<void> {
    try {
      // This could be stored in a separate user_profiles collection
      // or integrated with your existing user management system
      
      const userRef = doc(db, "user_profiles", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const currentCredits = userDoc.data().coverCredits || 0;
        await updateDoc(userRef, {
          coverCredits: currentCredits + creditsToAdd,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Create user profile if it doesn't exist
        await setDoc(userRef, {
          userId,
          coverCredits: creditsToAdd,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      trackEvent("user_credits_updated", {
        user_id: userId,
        credits_added: creditsToAdd,
      });
    } catch (error) {
      console.error("Failed to update user credits:", error);
      throw new Error("Failed to update user credits");
    }
  }

  /**
   * Get user profile with credits and subscription info
   */
  async getUserProfile(userId: string): Promise<{
    coverCredits: number;
    activeSubscription: UserSubscription | null;
    recentPurchases: UserPurchase[];
  }> {
    try {
      // Get user profile
      const userRef = doc(db, "user_profiles", userId);
      const userDoc = await getDoc(userRef);
      const coverCredits = userDoc.exists() ? (userDoc.data().coverCredits || 0) : 0;

      // Get active subscription
      const activeSubscription = await this.getUserActiveSubscription(userId);

      // Get recent purchases
      const recentPurchases = await this.getUserPurchases(userId);

      return {
        coverCredits,
        activeSubscription,
        recentPurchases: recentPurchases.slice(0, 10), // Last 10 purchases
      };
    } catch (error) {
      console.error("Failed to get user profile:", error);
      return {
        coverCredits: 0,
        activeSubscription: null,
        recentPurchases: [],
      };
    }
  }

  /**
   * Migrate data from localStorage (for existing users)
   */
  async migrateFromLocalStorage(userId: string): Promise<void> {
    try {
      if (typeof window === "undefined") return;

      // Migrate iOS subscriptions
      const iosSubscriptions = localStorage.getItem("vibely.subscriptions");
      if (iosSubscriptions) {
        const subscriptions = JSON.parse(iosSubscriptions);
        for (const sub of subscriptions) {
          if (sub.userId === userId) {
            await this.saveSubscription({
              ...sub,
              purchaseDate: new Date(sub.purchaseDate),
              startDate: new Date(sub.startDate || sub.purchaseDate),
              currentPeriodStart: new Date(sub.currentPeriodStart || sub.purchaseDate),
              currentPeriodEnd: new Date(sub.currentPeriodEnd || Date.now() + 30 * 24 * 60 * 60 * 1000),
              expirationDate: sub.expirationDate ? new Date(sub.expirationDate) : undefined,
            });
          }
        }
        localStorage.removeItem("vibely.subscriptions");
      }

      // Migrate Android subscriptions
      const androidSubscriptions = localStorage.getItem("vibely.android.subscriptions");
      if (androidSubscriptions) {
        const subscriptions = JSON.parse(androidSubscriptions);
        for (const sub of subscriptions) {
          if (sub.userId === userId) {
            await this.saveSubscription({
              ...sub,
              purchaseDate: new Date(sub.purchaseDate),
              startDate: new Date(sub.startDate || sub.purchaseDate),
              currentPeriodStart: new Date(sub.currentPeriodStart || sub.purchaseDate),
              currentPeriodEnd: new Date(sub.currentPeriodEnd || Date.now() + 30 * 24 * 60 * 60 * 1000),
              expirationDate: sub.expirationDate ? new Date(sub.expirationDate) : undefined,
            });
          }
        }
        localStorage.removeItem("vibely.android.subscriptions");
      }

      // Migrate purchases
      const purchases = localStorage.getItem("vibely.purchases");
      if (purchases) {
        const purchaseList = JSON.parse(purchases);
        for (const purchase of purchaseList) {
          if (purchase.userId === userId) {
            await this.savePurchase({
              ...purchase,
              purchaseDate: new Date(purchase.purchaseDate),
            });
          }
        }
        localStorage.removeItem("vibely.purchases");
      }

      // Migrate user profile
      const userProfile = localStorage.getItem("vibely.userProfile");
      if (userProfile) {
        const profile = JSON.parse(userProfile);
        if (profile.coverCredits > 0) {
          await this.updateUserCredits(userId, profile.coverCredits);
        }
        localStorage.removeItem("vibely.userProfile");
      }

      trackEvent("local_storage_migrated", {
        user_id: userId,
      });
    } catch (error) {
      console.error("Failed to migrate localStorage data:", error);
      trackEvent("local_storage_migration_failed", {
        user_id: userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

// Export singleton instance
export const subscriptionManager = SubscriptionManagementService.getInstance();