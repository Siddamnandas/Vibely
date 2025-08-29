import { NextRequest, NextResponse } from "next/server";
import { track as trackEvent } from "@/lib/analytics";
import { subscriptionManager } from "@/lib/subscription-manager";
import type { UserSubscription, UserPurchase } from "@/lib/subscription-manager";

interface ProcessPurchaseRequest {
  transactionId: string;
  productId: string;
  transactionDate: string;
  receiptData: string;
  userId?: string; // Optional if you have user authentication
}

interface SubscriptionData {
  id?: string;
  userId: string;
  platform: "ios";
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  status: "active" | "expired" | "cancelled" | "pending";
  purchaseDate: Date;
  expirationDate?: Date;
  isAutoRenewing: boolean;
  environment: "sandbox" | "production";
  receiptData: string;
  createdAt: Date;
  updatedAt: Date;
}

// Product configuration mapping
const PRODUCT_CONFIG = {
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
      transactionId,
      productId,
      transactionDate,
      receiptData,
      userId,
    }: ProcessPurchaseRequest = await request.json();

    if (!transactionId || !productId || !transactionDate || !receiptData) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: transactionId, productId, transactionDate, receiptData",
        },
        { status: 400 },
      );
    }

    // Get product configuration
    const productConfig = PRODUCT_CONFIG[productId as keyof typeof PRODUCT_CONFIG];
    if (!productConfig) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown product ID: ${productId}`,
        },
        { status: 400 },
      );
    }

    // Re-validate the receipt to ensure it's still valid
    const validationResponse = await fetch(
      `${request.nextUrl.origin}/api/payments/validate-ios-receipt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiptData,
          transactionId,
          productId,
        }),
      },
    );

    const validation = await validationResponse.json();
    if (!validation.isValid) {
      trackEvent("ios_purchase_processing_failed", {
        transaction_id: transactionId,
        product_id: productId,
        error: "Receipt validation failed during processing",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Receipt validation failed",
        },
        { status: 400 },
      );
    }

    // Check if this transaction has already been processed
    const existingPurchase = await findExistingPurchase(transactionId);
    if (existingPurchase) {
      trackEvent("ios_purchase_already_processed", {
        transaction_id: transactionId,
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
      purchaseResult = await processSubscriptionPurchase(
        validation.purchaseInfo,
        productConfig,
        userId,
      );
    } else if (productConfig.type === "consumable") {
      purchaseResult = await processConsumablePurchase(
        validation.purchaseInfo,
        productConfig,
        userId,
      );
    } else {
      throw new Error(`Unsupported product type: ${productConfig.type}`);
    }

    // Track successful purchase processing
    trackEvent("ios_purchase_processed", {
      transaction_id: transactionId,
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
    console.error("iOS purchase processing error:", error);

    trackEvent("ios_purchase_processing_error", {
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
 * Process subscription purchase
 */
async function processSubscriptionPurchase(
  purchaseInfo: any,
  productConfig: any,
  userId?: string,
): Promise<{ purchaseId: string; userBenefits: any }> {
  const subscriptionData: SubscriptionData = {
    userId: userId || "anonymous",
    platform: "ios",
    productId: purchaseInfo.productId,
    transactionId: purchaseInfo.transactionId,
    originalTransactionId: purchaseInfo.originalTransactionId,
    status: purchaseInfo.isActive ? "active" : "expired",
    purchaseDate: purchaseInfo.purchaseDate,
    expirationDate: purchaseInfo.expiresDate,
    isAutoRenewing: true, // Assume auto-renewing unless specified otherwise
    environment: purchaseInfo.environment === "Sandbox" ? "sandbox" : "production",
    receiptData: "", // Store if needed for future validation
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store in database (implement based on your database choice)
  const purchaseId = await storeSubscription(subscriptionData, productConfig);

  // Update user subscription status
  const userBenefits = await updateUserSubscriptionStatus(userId, {
    isSubscribed: purchaseInfo.isActive,
    subscriptionType: productConfig.vibelyId,
    features: productConfig.features,
    expirationDate: purchaseInfo.expiresDate,
  });

  return { purchaseId, userBenefits };
}

/**
 * Process consumable purchase (like extra cover packs)
 */
async function processConsumablePurchase(
  purchaseInfo: any,
  productConfig: any,
  userId?: string,
): Promise<{ purchaseId: string; userBenefits: any }> {
  // Store the purchase record
  const purchaseRecord = {
    userId: userId || "anonymous",
    platform: "ios" as const,
    productId: purchaseInfo.productId,
    transactionId: purchaseInfo.transactionId,
    originalTransactionId: purchaseInfo.originalTransactionId,
    type: "consumable" as const,
    status: "completed" as const,
    purchaseDate: purchaseInfo.purchaseDate,
    environment:
      purchaseInfo.environment === "Sandbox" ? ("sandbox" as const) : ("production" as const),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const purchaseId = await storePurchase(purchaseRecord, productConfig);

  // Add the consumable benefits to user account
  const userBenefits = await addConsumableBenefits(userId, {
    productType: productConfig.vibelyId,
    coverCredits: productConfig.coverLimit,
    features: productConfig.features,
  });

  return { purchaseId, userBenefits };
}

/**
 * Find existing purchase by transaction ID
 */
async function findExistingPurchase(transactionId: string): Promise<{ id: string } | null> {
  try {
    // Implement database query to find existing purchase
    // Example with Firebase:
    /*
    const purchasesRef = collection(db, "purchases");
    const q = query(purchasesRef, where("transactionId", "==", transactionId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { id: querySnapshot.docs[0].id };
    }
    */

    // For now, return null (no duplicate checking)
    // TODO: Implement actual database lookup
    return null;
  } catch (error) {
    console.error("Error finding existing purchase:", error);
    return null;
  }
}

/**
 * Store subscription in database
 */
async function storeSubscription(
  subscriptionData: SubscriptionData,
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
      transactionId: subscriptionData.transactionId,
      originalTransactionId: subscriptionData.originalTransactionId,
      purchaseToken: subscriptionData.receiptData || "", // iOS uses receipt data as purchase token
      purchaseDate: subscriptionData.purchaseDate,
      startDate: subscriptionData.purchaseDate,
      currentPeriodStart: subscriptionData.purchaseDate,
      currentPeriodEnd:
        subscriptionData.expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      expirationDate: subscriptionData.expirationDate,
      isAutoRenewing: subscriptionData.isAutoRenewing,
      coversUsedThisMonth: 0,
      features: productConfig.features,
      environment: subscriptionData.environment as "sandbox" | "production",
      receiptData: subscriptionData.receiptData,
    });

    return subscriptionId;
  } catch (error) {
    console.error("Error storing subscription:", error);
    throw new Error("Failed to store subscription");
  }
}

/**
 * Store purchase record in database
 */
async function storePurchase(purchaseRecord: any, productConfig: any): Promise<string> {
  try {
    // Use the subscription manager for purchase records too
    const purchaseId = await subscriptionManager.savePurchase({
      userId: purchaseRecord.userId,
      platform: purchaseRecord.platform,
      productId: purchaseRecord.productId,
      productType: purchaseRecord.type,
      transactionId: purchaseRecord.transactionId,
      purchaseToken: purchaseRecord.originalTransactionId || purchaseRecord.transactionId,
      status: purchaseRecord.status,
      isValid: true,
      purchaseDate: purchaseRecord.purchaseDate,
      coverCredits: productConfig.coverLimit,
      features: productConfig.features,
      environment: purchaseRecord.environment as "sandbox" | "production",
    });

    return purchaseId;
  } catch (error) {
    console.error("Error storing purchase:", error);
    throw new Error("Failed to store purchase");
  }
}

/**
 * Update user subscription status
 */
async function updateUserSubscriptionStatus(
  userId: string | undefined,
  benefits: any,
): Promise<any> {
  try {
    // The subscription is already stored via storeSubscription
    // We can optionally update user credits here if needed
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
 * Add consumable benefits to user account
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
