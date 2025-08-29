import { NextRequest, NextResponse } from "next/server";
import { track as trackEvent } from "@/lib/analytics";
import { subscriptionManager } from "@/lib/subscription-manager";
import type { UserSubscription, UserPurchase } from "@/lib/subscription-manager";

interface ProcessAndroidPurchaseRequest {
  orderId: string;
  productId: string;
  purchaseToken: string;
  purchaseTime: Date;
  signature: string;
  originalJson: string;
  userId?: string;
}

interface AndroidPurchaseData {
  id?: string;
  userId: string;
  platform: "android";
  productId: string;
  orderId: string;
  purchaseToken: string;
  status: "active" | "expired" | "cancelled" | "pending";
  purchaseDate: Date;
  expirationDate?: Date;
  isAutoRenewing?: boolean;
  consumptionState?: number;
  acknowledgementState?: number;
  signature: string;
  originalJson: string;
  createdAt: Date;
  updatedAt: Date;
}

// Product configuration mapping
const ANDROID_PRODUCT_CONFIG = {
  "com.vibely.premium.monthly": {
    vibelyId: "premium_monthly",
    type: "subscription",
    features: ["unlimited_covers", "premium_quality", "priority_support"],
    coverLimit: null,
  },
  "com.vibely.premium.yearly": {
    vibelyId: "premium_yearly",
    type: "subscription",
    features: ["unlimited_covers", "premium_quality", "priority_support"],
    coverLimit: null,
  },
  "com.vibely.covers.pack10": {
    vibelyId: "extra_covers_pack",
    type: "consumable",
    features: ["extra_covers"],
    coverLimit: 10,
  },
};

export async function POST(request: NextRequest) {
  try {
    const {
      orderId,
      productId,
      purchaseToken,
      purchaseTime,
      signature,
      originalJson,
      userId,
    }: ProcessAndroidPurchaseRequest = await request.json();

    if (!orderId || !productId || !purchaseToken || !purchaseTime || !signature || !originalJson) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: orderId, productId, purchaseToken, purchaseTime, signature, originalJson",
        },
        { status: 400 },
      );
    }

    // Get product configuration
    const productConfig = ANDROID_PRODUCT_CONFIG[productId as keyof typeof ANDROID_PRODUCT_CONFIG];
    if (!productConfig) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown product ID: ${productId}`,
        },
        { status: 400 },
      );
    }

    // Re-validate the purchase to ensure it's still valid
    const validationResponse = await fetch(
      `${request.nextUrl.origin}/api/payments/validate-android-purchase`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          purchaseToken,
          signature,
          originalJson,
        }),
      },
    );

    const validation = await validationResponse.json();
    if (!validation.isValid) {
      trackEvent("android_purchase_processing_failed", {
        order_id: orderId,
        product_id: productId,
        error: "Purchase validation failed during processing",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Purchase validation failed",
        },
        { status: 400 },
      );
    }

    // Check if this purchase has already been processed
    const existingPurchase = await findExistingAndroidPurchase(orderId);
    if (existingPurchase) {
      trackEvent("android_purchase_already_processed", {
        order_id: orderId,
        product_id: productId,
        existing_purchase_id: existingPurchase.id,
      });

      return NextResponse.json({
        success: true,
        message: "Purchase already processed",
        purchaseId: existingPurchase.id,
        alreadyProcessed: true,
      });
    }

    // Process the purchase based on product type
    let purchaseResult;
    if (productConfig.type === "subscription") {
      purchaseResult = await processAndroidSubscription(
        validation.purchaseInfo,
        productConfig,
        signature,
        originalJson,
        userId,
      );
    } else if (productConfig.type === "consumable") {
      purchaseResult = await processAndroidConsumable(
        validation.purchaseInfo,
        productConfig,
        signature,
        originalJson,
        userId,
      );
    } else {
      throw new Error(`Unsupported product type: ${productConfig.type}`);
    }

    // Track successful purchase processing
    trackEvent("android_purchase_processed", {
      order_id: orderId,
      product_id: productId,
      vibely_product_id: productConfig.vibelyId,
      product_type: productConfig.type,
      user_id: userId,
      purchase_id: purchaseResult.purchaseId,
    });

    return NextResponse.json({
      success: true,
      message: "Purchase processed successfully",
      purchaseId: purchaseResult.purchaseId,
      productConfig: {
        vibelyId: productConfig.vibelyId,
        type: productConfig.type,
        features: productConfig.features,
      },
      userBenefits: purchaseResult.userBenefits,
    });
  } catch (error) {
    console.error("Android purchase processing error:", error);

    trackEvent("android_purchase_processing_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during purchase processing",
      },
      { status: 500 },
    );
  }
}

/**
 * Process Android subscription purchase
 */
async function processAndroidSubscription(
  purchaseInfo: any,
  productConfig: any,
  signature: string,
  originalJson: string,
  userId?: string,
): Promise<{ purchaseId: string; userBenefits: any }> {
  const subscriptionData: AndroidPurchaseData = {
    userId: userId || "anonymous",
    platform: "android",
    productId: purchaseInfo.productId,
    orderId: purchaseInfo.orderId,
    purchaseToken: purchaseInfo.purchaseToken,
    status: purchaseInfo.purchaseState === 1 ? "active" : "pending",
    purchaseDate: purchaseInfo.purchaseTime,
    expirationDate: purchaseInfo.expiryTime,
    isAutoRenewing: purchaseInfo.autoRenewing || false,
    acknowledgementState: purchaseInfo.acknowledgementState,
    signature,
    originalJson,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store in database
  const purchaseId = await storeAndroidSubscription(subscriptionData, productConfig);

  // Update user subscription status
  const userBenefits = await updateUserSubscriptionStatus(userId, {
    isSubscribed: purchaseInfo.purchaseState === 1,
    subscriptionType: productConfig.vibelyId,
    features: productConfig.features,
    expirationDate: purchaseInfo.expiryTime,
    platform: "android",
  });

  return { purchaseId, userBenefits };
}

/**
 * Process Android consumable purchase
 */
async function processAndroidConsumable(
  purchaseInfo: any,
  productConfig: any,
  signature: string,
  originalJson: string,
  userId?: string,
): Promise<{ purchaseId: string; userBenefits: any }> {
  const purchaseRecord = {
    userId: userId || "anonymous",
    platform: "android" as const,
    productId: purchaseInfo.productId,
    orderId: purchaseInfo.orderId,
    purchaseToken: purchaseInfo.purchaseToken,
    type: "consumable" as const,
    status: purchaseInfo.purchaseState === 1 ? ("completed" as const) : ("pending" as const),
    purchaseDate: purchaseInfo.purchaseTime,
    consumptionState: purchaseInfo.consumptionState,
    acknowledgementState: purchaseInfo.acknowledgementState,
    signature,
    originalJson,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const purchaseId = await storeAndroidPurchase(purchaseRecord, productConfig);

  // Add consumable benefits to user account
  const userBenefits = await addConsumableBenefits(userId, {
    productType: productConfig.vibelyId,
    coverCredits: productConfig.coverLimit,
    features: productConfig.features,
  });

  return { purchaseId, userBenefits };
}

/**
 * Find existing Android purchase by order ID
 */
async function findExistingAndroidPurchase(orderId: string): Promise<{ id: string } | null> {
  try {
    // Implement database query to find existing purchase
    // Example with Firebase:
    /*
    const purchasesRef = collection(db, "android_purchases");
    const q = query(purchasesRef, where("orderId", "==", orderId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { id: querySnapshot.docs[0].id };
    }
    */

    // For now, return null (no duplicate checking)
    // TODO: Implement actual database lookup
    return null;
  } catch (error) {
    console.error("Error finding existing Android purchase:", error);
    return null;
  }
}

/**
 * Store Android subscription in database
 */
async function storeAndroidSubscription(
  subscriptionData: AndroidPurchaseData,
  productConfig: any,
): Promise<string> {
  try {
    // Use the subscription manager instead of localStorage
    const subscriptionId = await subscriptionManager.saveSubscription({
      userId: subscriptionData.userId,
      platform: subscriptionData.platform,
      productId: subscriptionData.productId,
      subscriptionType: productConfig.vibelyId as "premium_monthly" | "premium_yearly",
      status: subscriptionData.status,
      transactionId: subscriptionData.orderId, // Android uses orderId as transaction ID
      purchaseToken: subscriptionData.purchaseToken,
      orderId: subscriptionData.orderId,
      purchaseDate: subscriptionData.purchaseDate,
      startDate: subscriptionData.purchaseDate,
      currentPeriodStart: subscriptionData.purchaseDate,
      currentPeriodEnd:
        subscriptionData.expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      expirationDate: subscriptionData.expirationDate,
      isAutoRenewing: subscriptionData.isAutoRenewing || false,
      coversUsedThisMonth: 0,
      features: productConfig.features,
      environment: "sandbox", // Will be determined from validation
      signature: subscriptionData.signature,
      originalJson: subscriptionData.originalJson,
    });

    return subscriptionId;
  } catch (error) {
    console.error("Error storing Android subscription:", error);
    throw new Error("Failed to store Android subscription");
  }
}

/**
 * Store Android purchase record in database
 */
async function storeAndroidPurchase(purchaseRecord: any, productConfig: any): Promise<string> {
  try {
    // Use the subscription manager for purchase records
    const purchaseId = await subscriptionManager.savePurchase({
      userId: purchaseRecord.userId,
      platform: purchaseRecord.platform,
      productId: purchaseRecord.productId,
      productType: purchaseRecord.type,
      transactionId: purchaseRecord.orderId,
      purchaseToken: purchaseRecord.purchaseToken,
      orderId: purchaseRecord.orderId,
      status: purchaseRecord.status,
      isValid: true,
      purchaseDate: purchaseRecord.purchaseDate,
      coverCredits: productConfig.coverLimit,
      features: productConfig.features,
      environment: purchaseRecord.environment as "sandbox" | "production",
      signature: purchaseRecord.signature,
      originalJson: purchaseRecord.originalJson,
    });

    return purchaseId;
  } catch (error) {
    console.error("Error storing Android purchase:", error);
    throw new Error("Failed to store Android purchase");
  }
}

/**
 * Update user subscription status (shared with iOS)
 */
async function updateUserSubscriptionStatus(
  userId: string | undefined,
  benefits: any,
): Promise<any> {
  try {
    // The subscription is already stored via storeAndroidSubscription
    // We can optionally migrate old data here
    if (userId) {
      await subscriptionManager.migrateFromLocalStorage(userId);
    }

    return benefits;
  } catch (error) {
    console.error("Error updating user subscription status:", error);
    throw new Error("Failed to update user subscription status");
  }
}

/**
 * Add consumable benefits to user account (shared with iOS)
 */
async function addConsumableBenefits(userId: string | undefined, benefits: any): Promise<any> {
  try {
    // Use subscription manager to update user credits
    if (userId && benefits.coverCredits > 0) {
      await subscriptionManager.updateUserCredits(userId, benefits.coverCredits);
    }

    return benefits;
  } catch (error) {
    console.error("Error adding consumable benefits:", error);
    throw new Error("Failed to add consumable benefits");
  }
}
