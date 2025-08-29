import { initializeApp } from "firebase/app";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Purchase record interface
export interface PurchaseRecord {
  id?: string;
  userId: string;
  productId: string;
  transactionId: string;
  purchaseToken: string;
  purchaseTime: Date;
  isValid: boolean;
  isSubscription: boolean;
  expiryTime?: Date;
  customerId?: string;
  amount: number;
  currency: string;
  platform: "ios" | "android" | "web";
  status: "pending" | "completed" | "failed" | "refunded" | "cancelled";
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription record interface
export interface SubscriptionRecord {
  id?: string;
  userId: string;
  purchaseRecordId: string;
  planId: string;
  tier: "freemium" | "premium";
  status: "active" | "cancelled" | "expired" | "grace_period" | "on_hold";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  coversUsedThisMonth: number;
  cancelAtPeriodEnd: boolean;
  cancellationReason?: string;
  trialEnd?: Date;
  billingCycle: "monthly" | "yearly";
  createdAt: Date;
  updatedAt: Date;
}

// Usage record interface
export interface UsageRecord {
  id?: string;
  userId: string;
  subscriptionId: string;
  action: "cover_generated" | "cover_downloaded" | "cover_shared" | "hd_export";
  timestamp: Date;
  metadata?: {
    playlistId?: string;
    trackId?: string;
    generationTime?: number;
    imageSize?: number;
    format?: string;
  };
}

class FirebasePurchaseService {
  private static instance: FirebasePurchaseService;

  static getInstance(): FirebasePurchaseService {
    if (!FirebasePurchaseService.instance) {
      FirebasePurchaseService.instance = new FirebasePurchaseService();
    }
    return FirebasePurchaseService.instance;
  }

  // Purchase Records
  async savePurchaseRecord(purchase: Omit<PurchaseRecord, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const purchaseData = {
        ...purchase,
        purchaseTime: Timestamp.fromDate(purchase.purchaseTime),
        expiryTime: purchase.expiryTime ? Timestamp.fromDate(purchase.expiryTime) : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "purchase_records"), purchaseData);

      trackEvent("purchase_record_saved", {
        purchase_id: docRef.id,
        user_id: purchase.userId,
        product_id: purchase.productId,
        platform: purchase.platform,
        amount: purchase.amount,
        currency: purchase.currency,
        is_subscription: purchase.isSubscription,
      });

      return docRef.id;
    } catch (error) {
      console.error("Failed to save purchase record:", error);
      
      trackEvent("purchase_record_save_failed", {
        user_id: purchase.userId,
        product_id: purchase.productId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error("Failed to save purchase record");
    }
  }

  async getPurchaseRecord(purchaseId: string): Promise<PurchaseRecord | null> {
    try {
      const docRef = doc(db, "purchase_records", purchaseId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          purchaseTime: data.purchaseTime.toDate(),
          expiryTime: data.expiryTime ? data.expiryTime.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as PurchaseRecord;
      }

      return null;
    } catch (error) {
      console.error("Failed to get purchase record:", error);
      throw new Error("Failed to retrieve purchase record");
    }
  }

  async getUserPurchases(userId: string): Promise<PurchaseRecord[]> {
    try {
      const q = query(
        collection(db, "purchase_records"),
        where("userId", "==", userId),
        orderBy("purchaseTime", "desc")
      );

      const querySnapshot = await getDocs(q);
      const purchases: PurchaseRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        purchases.push({
          id: doc.id,
          ...data,
          purchaseTime: data.purchaseTime.toDate(),
          expiryTime: data.expiryTime ? data.expiryTime.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as PurchaseRecord);
      });

      return purchases;
    } catch (error) {
      console.error("Failed to get user purchases:", error);
      throw new Error("Failed to retrieve user purchases");
    }
  }

  async updatePurchaseStatus(purchaseId: string, status: PurchaseRecord["status"], metadata?: Record<string, any>): Promise<void> {
    try {
      const docRef = doc(db, "purchase_records", purchaseId);
      
      const updateData: any = {
        status,
        updatedAt: Timestamp.now(),
      };

      if (metadata) {
        updateData.metadata = metadata;
      }

      await updateDoc(docRef, updateData);

      trackEvent("purchase_status_updated", {
        purchase_id: purchaseId,
        new_status: status,
      });
    } catch (error) {
      console.error("Failed to update purchase status:", error);
      throw new Error("Failed to update purchase status");
    }
  }

  // Subscription Records
  async saveSubscriptionRecord(subscription: Omit<SubscriptionRecord, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const subscriptionData = {
        ...subscription,
        currentPeriodStart: Timestamp.fromDate(subscription.currentPeriodStart),
        currentPeriodEnd: Timestamp.fromDate(subscription.currentPeriodEnd),
        trialEnd: subscription.trialEnd ? Timestamp.fromDate(subscription.trialEnd) : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "subscription_records"), subscriptionData);

      trackEvent("subscription_record_saved", {
        subscription_id: docRef.id,
        user_id: subscription.userId,
        plan_id: subscription.planId,
        tier: subscription.tier,
        billing_cycle: subscription.billingCycle,
      });

      return docRef.id;
    } catch (error) {
      console.error("Failed to save subscription record:", error);
      
      trackEvent("subscription_record_save_failed", {
        user_id: subscription.userId,
        plan_id: subscription.planId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error("Failed to save subscription record");
    }
  }

  async getUserActiveSubscription(userId: string): Promise<SubscriptionRecord | null> {
    try {
      const q = query(
        collection(db, "subscription_records"),
        where("userId", "==", userId),
        where("status", "in", ["active", "grace_period"]),
        orderBy("currentPeriodEnd", "desc")
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        return {
          id: doc.id,
          ...data,
          currentPeriodStart: data.currentPeriodStart.toDate(),
          currentPeriodEnd: data.currentPeriodEnd.toDate(),
          trialEnd: data.trialEnd ? data.trialEnd.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as SubscriptionRecord;
      }

      return null;
    } catch (error) {
      console.error("Failed to get active subscription:", error);
      throw new Error("Failed to retrieve active subscription");
    }
  }

  async updateSubscriptionUsage(subscriptionId: string, usageType: "cover_generated" | "hd_export", increment: number = 1): Promise<void> {
    try {
      const docRef = doc(db, "subscription_records", subscriptionId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Subscription not found");
      }

      const currentData = docSnap.data();
      const newUsage = (currentData.coversUsedThisMonth || 0) + increment;

      await updateDoc(docRef, {
        coversUsedThisMonth: newUsage,
        updatedAt: Timestamp.now(),
      });

      trackEvent("subscription_usage_updated", {
        subscription_id: subscriptionId,
        usage_type: usageType,
        new_usage: newUsage,
        increment,
      });
    } catch (error) {
      console.error("Failed to update subscription usage:", error);
      throw new Error("Failed to update subscription usage");
    }
  }

  async resetMonthlyUsage(subscriptionId: string): Promise<void> {
    try {
      const docRef = doc(db, "subscription_records", subscriptionId);
      
      await updateDoc(docRef, {
        coversUsedThisMonth: 0,
        updatedAt: Timestamp.now(),
      });

      trackEvent("monthly_usage_reset", {
        subscription_id: subscriptionId,
      });
    } catch (error) {
      console.error("Failed to reset monthly usage:", error);
      throw new Error("Failed to reset monthly usage");
    }
  }

  async cancelSubscription(subscriptionId: string, immediate: boolean = false, reason?: string): Promise<void> {
    try {
      const docRef = doc(db, "subscription_records", subscriptionId);
      
      const updateData: any = {
        cancelAtPeriodEnd: !immediate,
        status: immediate ? "cancelled" : "active",
        updatedAt: Timestamp.now(),
      };

      if (reason) {
        updateData.cancellationReason = reason;
      }

      await updateDoc(docRef, updateData);

      trackEvent("subscription_cancelled", {
        subscription_id: subscriptionId,
        immediate,
        reason,
      });
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      throw new Error("Failed to cancel subscription");
    }
  }

  // Usage Records
  async recordUsage(usage: Omit<UsageRecord, "id">): Promise<string> {
    try {
      const usageData = {
        ...usage,
        timestamp: Timestamp.fromDate(usage.timestamp),
      };

      const docRef = await addDoc(collection(db, "usage_records"), usageData);

      trackEvent("usage_recorded", {
        usage_id: docRef.id,
        user_id: usage.userId,
        action: usage.action,
        subscription_id: usage.subscriptionId,
      });

      return docRef.id;
    } catch (error) {
      console.error("Failed to record usage:", error);
      throw new Error("Failed to record usage");
    }
  }

  async getUserUsage(userId: string, startDate: Date, endDate: Date): Promise<UsageRecord[]> {
    try {
      const q = query(
        collection(db, "usage_records"),
        where("userId", "==", userId),
        where("timestamp", ">=", Timestamp.fromDate(startDate)),
        where("timestamp", "<=", Timestamp.fromDate(endDate)),
        orderBy("timestamp", "desc")
      );

      const querySnapshot = await getDocs(q);
      const usageRecords: UsageRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usageRecords.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate(),
        } as UsageRecord);
      });

      return usageRecords;
    } catch (error) {
      console.error("Failed to get user usage:", error);
      throw new Error("Failed to retrieve user usage");
    }
  }

  // Real-time subscriptions
  subscribeToUserPurchases(userId: string, callback: (purchases: PurchaseRecord[]) => void): () => void {
    const q = query(
      collection(db, "purchase_records"),
      where("userId", "==", userId),
      orderBy("purchaseTime", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      const purchases: PurchaseRecord[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        purchases.push({
          id: doc.id,
          ...data,
          purchaseTime: data.purchaseTime.toDate(),
          expiryTime: data.expiryTime ? data.expiryTime.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as PurchaseRecord);
      });

      callback(purchases);
    });
  }

  subscribeToUserSubscription(userId: string, callback: (subscription: SubscriptionRecord | null) => void): () => void {
    const q = query(
      collection(db, "subscription_records"),
      where("userId", "==", userId),
      where("status", "in", ["active", "grace_period"]),
      orderBy("currentPeriodEnd", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        const subscription: SubscriptionRecord = {
          id: doc.id,
          ...data,
          currentPeriodStart: data.currentPeriodStart.toDate(),
          currentPeriodEnd: data.currentPeriodEnd.toDate(),
          trialEnd: data.trialEnd ? data.trialEnd.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as SubscriptionRecord;

        callback(subscription);
      } else {
        callback(null);
      }
    });
  }

  // Migration helpers
  async migrateFromLocalStorage(userId: string): Promise<void> {
    try {
      // Get data from localStorage
      const localSubscription = localStorage.getItem(`subscription_${userId}`);
      const localPurchases = localStorage.getItem(`purchases_${userId}`);

      if (localSubscription) {
        const subscriptionData = JSON.parse(localSubscription);
        
        // Convert to Firebase format and save
        const subscriptionRecord: Omit<SubscriptionRecord, "id" | "createdAt" | "updatedAt"> = {
          userId,
          purchaseRecordId: "migrated", // Will be updated when real purchase is found
          planId: subscriptionData.plan?.id || "premium",
          tier: subscriptionData.plan?.tier || "premium",
          status: subscriptionData.status || "active",
          currentPeriodStart: new Date(subscriptionData.currentPeriodStart),
          currentPeriodEnd: new Date(subscriptionData.currentPeriodEnd),
          coversUsedThisMonth: subscriptionData.coversUsedThisMonth || 0,
          cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
          billingCycle: "monthly", // Default, will be updated based on actual purchase
        };

        await this.saveSubscriptionRecord(subscriptionRecord);
      }

      if (localPurchases) {
        const purchasesData = JSON.parse(localPurchases);
        
        for (const purchase of purchasesData) {
          const purchaseRecord: Omit<PurchaseRecord, "id" | "createdAt" | "updatedAt"> = {
            userId,
            productId: purchase.productId,
            transactionId: purchase.transactionId,
            purchaseToken: purchase.purchaseToken,
            purchaseTime: new Date(purchase.purchaseTime),
            isValid: purchase.isValid,
            isSubscription: purchase.isSubscription,
            expiryTime: purchase.expiryTime ? new Date(purchase.expiryTime) : undefined,
            customerId: purchase.customerId,
            amount: purchase.amount || 0,
            currency: purchase.currency || "usd",
            platform: "web", // Assume web for migrated data
            status: "completed",
            metadata: { migrated: true },
          };

          await this.savePurchaseRecord(purchaseRecord);
        }
      }

      // Clear localStorage after successful migration
      localStorage.removeItem(`subscription_${userId}`);
      localStorage.removeItem(`purchases_${userId}`);

      trackEvent("local_storage_migrated", {
        user_id: userId,
        had_subscription: !!localSubscription,
        purchase_count: localPurchases ? JSON.parse(localPurchases).length : 0,
      });

    } catch (error) {
      console.error("Failed to migrate from localStorage:", error);
      
      trackEvent("local_storage_migration_failed", {
        user_id: userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error("Failed to migrate data from localStorage");
    }
  }
}

// Export singleton instance
export const firebasePurchaseService = FirebasePurchaseService.getInstance();