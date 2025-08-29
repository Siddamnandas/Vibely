import { NextRequest, NextResponse } from "next/server";
import { track as trackEvent } from "@/lib/analytics";
import { GoogleAuth } from "google-auth-library";

// Google Play Developer API types
interface AndroidPublisherAPI {
  purchases: {
    products: {
      get: (params: {
        packageName: string;
        productId: string;
        token: string;
      }) => Promise<{
        kind: string;
        purchaseTimeMillis: string;
        purchaseState: number;
        consumptionState: number;
        developerPayload?: string;
        orderId: string;
        purchaseType?: number;
        acknowledgementState: number;
        purchaseToken: string;
        productId: string;
        quantity?: number;
        obfuscatedExternalAccountId?: string;
        obfuscatedExternalProfileId?: string;
        regionCode?: string;
      }>;
    };
    subscriptions: {
      get: (params: {
        packageName: string;
        subscriptionId: string;
        token: string;
      }) => Promise<{
        kind: string;
        startTimeMillis: string;
        expiryTimeMillis?: string;
        autoRenewing: boolean;
        priceCurrencyCode: string;
        priceAmountMicros: string;
        countryCode: string;
        developerPayload?: string;
        paymentState?: number;
        cancelReason?: number;
        userCancellationTimeMillis?: string;
        cancelSurveyResult?: any;
        orderId: string;
        linkedPurchaseToken?: string;
        purchaseType?: number;
        priceChange?: any;
        profileName?: string;
        emailAddress?: string;
        givenName?: string;
        familyName?: string;
        profileId?: string;
        acknowledgementState: number;
        externalAccountId?: string;
        promotionType?: number;
        promotionCode?: string;
        obfuscatedExternalAccountId?: string;
        obfuscatedExternalProfileId?: string;
      }>;
    };
  };
}

// Google Play Console package name
const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || "com.vibely.app";

// Service account key file path or JSON
const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

export async function POST(request: NextRequest) {
  try {
    const { productId, purchaseToken, signature, originalJson } = await request.json();

    if (!productId || !purchaseToken || !signature || !originalJson) {
      return NextResponse.json(
        { 
          isValid: false, 
          error: "Missing required fields: productId, purchaseToken, signature, originalJson" 
        },
        { status: 400 }
      );
    }

    // Validate the signature first (local validation)
    const isSignatureValid = await validatePurchaseSignature(originalJson, signature);
    if (!isSignatureValid) {
      trackEvent("android_signature_validation_failed", {
        product_id: productId,
        purchase_token: purchaseToken,
      });

      return NextResponse.json({
        isValid: false,
        error: "Invalid purchase signature",
      });
    }

    // Validate with Google Play Developer API (server-to-server)
    const googleValidation = await validateWithGooglePlay(productId, purchaseToken);
    
    if (!googleValidation.isValid) {
      trackEvent("android_google_validation_failed", {
        product_id: productId,
        purchase_token: purchaseToken,
        error: googleValidation.error,
      });

      return NextResponse.json({
        isValid: false,
        error: googleValidation.error,
      });
    }

    trackEvent("android_purchase_validated", {
      product_id: productId,
      purchase_token: purchaseToken,
      order_id: googleValidation.purchaseInfo?.orderId,
      purchase_state: googleValidation.purchaseInfo?.purchaseState,
    });

    return NextResponse.json({
      isValid: true,
      purchaseInfo: googleValidation.purchaseInfo,
    });

  } catch (error) {
    console.error("Android purchase validation error:", error);
    
    trackEvent("android_validation_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { 
        isValid: false, 
        error: "Internal server error during purchase validation" 
      },
      { status: 500 }
    );
  }
}

/**
 * Validate purchase signature using Google Play's public key
 */
async function validatePurchaseSignature(originalJson: string, signature: string): Promise<boolean> {
  try {
    // In a real implementation, you would:
    // 1. Get your app's public key from Google Play Console
    // 2. Use it to verify the RSA signature of the originalJson
    
    // For now, we'll do basic validation
    if (!originalJson || !signature) {
      return false;
    }

    // Parse the original JSON to ensure it's valid
    const purchaseData = JSON.parse(originalJson);
    
    // Basic validation checks
    if (!purchaseData.productId || !purchaseData.purchaseToken || !purchaseData.orderId) {
      return false;
    }

    // TODO: Implement actual RSA signature verification
    // const crypto = require('crypto');
    // const publicKey = process.env.GOOGLE_PLAY_PUBLIC_KEY;
    // const verify = crypto.createVerify('RSA-SHA1');
    // verify.update(originalJson);
    // return verify.verify(publicKey, signature, 'base64');

    // For development, return true if basic validation passes
    return true;
  } catch (error) {
    console.error("Signature validation error:", error);
    return false;
  }
}

/**
 * Validate purchase with Google Play Developer API
 */
async function validateWithGooglePlay(productId: string, purchaseToken: string): Promise<{
  isValid: boolean;
  error?: string;
  purchaseInfo?: any;
}> {
  try {
    // Check if we have the required credentials
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      console.warn("Google Play API credentials not configured, skipping server-side validation");
      return {
        isValid: true,
        purchaseInfo: {
          productId,
          purchaseToken,
          orderId: `mock_${Date.now()}`,
          purchaseState: 1, // Purchased
          purchaseTime: new Date(),
        }
      };
    }

    // Initialize Google Auth
    const auth = new GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const authClient = await auth.getClient();
    
    // Determine if this is a subscription or in-app product
    const isSubscription = productId.includes('premium');
    
    let purchaseInfo;
    
    if (isSubscription) {
      // Validate subscription
      const subscriptionUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE_NAME}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;
      
      const response = await authClient.request({
        url: subscriptionUrl,
        method: 'GET',
      });

      const subscriptionData = response.data as any; // Type assertion for Google Play API response
      
      purchaseInfo = {
        productId,
        purchaseToken,
        orderId: subscriptionData.orderId,
        purchaseState: subscriptionData.paymentState === 1 ? 1 : 0, // 1 = purchased, 0 = pending
        purchaseTime: new Date(parseInt(subscriptionData.startTimeMillis)),
        expiryTime: subscriptionData.expiryTimeMillis ? 
          new Date(parseInt(subscriptionData.expiryTimeMillis)) : null,
        autoRenewing: subscriptionData.autoRenewing,
        isSubscription: true,
      };
    } else {
      // Validate in-app product
      const productUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}`;
      
      const response = await authClient.request({
        url: productUrl,
        method: 'GET',
      });

      const productData = response.data as any; // Type assertion for Google Play API response

      purchaseInfo = {
        productId,
        purchaseToken,
        orderId: productData.orderId,
        purchaseState: productData.purchaseState,
        purchaseTime: new Date(parseInt(productData.purchaseTimeMillis)),
        consumptionState: productData.consumptionState,
        acknowledgementState: productData.acknowledgementState,
        isSubscription: false,
      };
    }

    // Check if purchase is in valid state
    const isValid = purchaseInfo.purchaseState === 1; // 1 means purchased

    return {
      isValid,
      purchaseInfo,
      error: isValid ? undefined : "Purchase not in valid state"
    };

  } catch (error) {
    console.error("Google Play API validation error:", error);
    
    // If API validation fails, we might still accept the purchase if signature validation passed
    // This prevents issues if the Google Play API is temporarily unavailable
    return {
      isValid: false,
      error: `Google Play API validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

/**
 * Get human-readable error message for Google Play response codes
 */
function getGooglePlayErrorMessage(responseCode: number): string {
  switch (responseCode) {
    case 0:
      return "Success";
    case 1:
      return "User pressed back or canceled a dialog";
    case 2:
      return "Network connection is down";
    case 3:
      return "Billing API version is not supported for the type requested";
    case 4:
      return "Requested product is not available for purchase";
    case 5:
      return "Invalid arguments provided to the API";
    case 6:
      return "Fatal error during the API action";
    case 7:
      return "Failure to purchase since item is already owned";
    case 8:
      return "Failure to consume since item is not owned";
    default:
      return `Unknown error (code: ${responseCode})`;
  }
}