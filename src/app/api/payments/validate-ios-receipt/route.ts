import { NextRequest, NextResponse } from "next/server";
import { track as trackEvent } from "@/lib/analytics";

// iOS App Store Connect API types
interface AppStoreReceiptValidationRequest {
  "receipt-data": string;
  password?: string; // Your app's shared secret from App Store Connect
  "exclude-old-transactions"?: boolean;
}

interface AppStoreReceiptValidationResponse {
  status: number;
  environment: "Sandbox" | "Production";
  receipt: {
    receipt_type: string;
    adam_id: number;
    app_item_id: number;
    bundle_id: string;
    application_version: string;
    download_id: number;
    version_external_identifier: number;
    receipt_creation_date: string;
    receipt_creation_date_ms: string;
    receipt_creation_date_pst: string;
    request_date: string;
    request_date_ms: string;
    request_date_pst: string;
    original_purchase_date: string;
    original_purchase_date_ms: string;
    original_purchase_date_pst: string;
    original_application_version: string;
    in_app: Array<{
      quantity: string;
      product_id: string;
      transaction_id: string;
      original_transaction_id: string;
      purchase_date: string;
      purchase_date_ms: string;
      purchase_date_pst: string;
      original_purchase_date: string;
      original_purchase_date_ms: string;
      original_purchase_date_pst: string;
      expires_date?: string;
      expires_date_ms?: string;
      expires_date_pst?: string;
      web_order_line_item_id?: string;
      is_trial_period?: string;
      is_in_intro_offer_period?: string;
      cancellation_date?: string;
      cancellation_reason?: string;
    }>;
  };
  latest_receipt_info?: Array<any>;
  pending_renewal_info?: Array<any>;
}

const APP_STORE_RECEIPT_VALIDATION_URL_PRODUCTION = "https://buy.itunes.apple.com/verifyReceipt";
const APP_STORE_RECEIPT_VALIDATION_URL_SANDBOX = "https://sandbox.itunes.apple.com/verifyReceipt";

// Your app's shared secret from App Store Connect (should be in environment variables)
const APP_STORE_SHARED_SECRET = process.env.IOS_APP_STORE_SHARED_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { receiptData, transactionId, productId } = await request.json();

    if (!receiptData || !transactionId || !productId) {
      return NextResponse.json(
        {
          isValid: false,
          error: "Missing required fields: receiptData, transactionId, productId",
        },
        { status: 400 },
      );
    }

    // Validate receipt with Apple's servers
    const validationResult = await validateReceiptWithApple(receiptData);

    if (!validationResult.isValid) {
      trackEvent("ios_receipt_validation_failed", {
        transaction_id: transactionId,
        product_id: productId,
        status: validationResult.status,
        error: validationResult.error,
      });

      return NextResponse.json({
        isValid: false,
        error: validationResult.error,
        status: validationResult.status,
      });
    }

    // Find the specific transaction in the receipt
    const purchaseInfo = findTransactionInReceipt(
      validationResult.receiptData!,
      transactionId,
      productId,
    );

    if (!purchaseInfo) {
      trackEvent("ios_transaction_not_found", {
        transaction_id: transactionId,
        product_id: productId,
      });

      return NextResponse.json({
        isValid: false,
        error: "Transaction not found in receipt",
      });
    }

    // Verify the transaction is valid and not expired (for subscriptions)
    const isActive = checkTransactionValidity(purchaseInfo);

    trackEvent("ios_receipt_validated", {
      transaction_id: transactionId,
      product_id: productId,
      is_active: isActive,
      environment: validationResult.environment,
    });

    return NextResponse.json({
      isValid: true,
      purchaseInfo: {
        transactionId: purchaseInfo.transaction_id,
        originalTransactionId: purchaseInfo.original_transaction_id,
        productId: purchaseInfo.product_id,
        purchaseDate: new Date(parseInt(purchaseInfo.purchase_date_ms)),
        expiresDate: purchaseInfo.expires_date_ms
          ? new Date(parseInt(purchaseInfo.expires_date_ms))
          : null,
        isActive,
        isTrialPeriod: purchaseInfo.is_trial_period === "true",
        isIntroOfferPeriod: purchaseInfo.is_in_intro_offer_period === "true",
        environment: validationResult.environment,
      },
    });
  } catch (error) {
    console.error("iOS receipt validation error:", error);

    trackEvent("ios_receipt_validation_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        isValid: false,
        error: "Internal server error during receipt validation",
      },
      { status: 500 },
    );
  }
}

/**
 * Validate receipt with Apple's App Store servers
 */
async function validateReceiptWithApple(receiptData: string): Promise<{
  isValid: boolean;
  receiptData?: AppStoreReceiptValidationResponse["receipt"];
  environment?: string;
  status?: number;
  error?: string;
}> {
  const requestBody: AppStoreReceiptValidationRequest = {
    "receipt-data": receiptData,
    "exclude-old-transactions": true,
  };

  // Add shared secret for auto-renewable subscriptions
  if (APP_STORE_SHARED_SECRET) {
    requestBody.password = APP_STORE_SHARED_SECRET;
  }

  try {
    // Try production first
    let response = await fetch(APP_STORE_RECEIPT_VALIDATION_URL_PRODUCTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    let validationResponse: AppStoreReceiptValidationResponse = await response.json();

    // If status is 21007, the receipt is from sandbox, try sandbox URL
    if (validationResponse.status === 21007) {
      response = await fetch(APP_STORE_RECEIPT_VALIDATION_URL_SANDBOX, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      validationResponse = await response.json();
    }

    // Status 0 means the receipt is valid
    if (validationResponse.status === 0) {
      return {
        isValid: true,
        receiptData: validationResponse.receipt,
        environment: validationResponse.environment,
      };
    } else {
      return {
        isValid: false,
        status: validationResponse.status,
        error: getAppleReceiptErrorMessage(validationResponse.status),
      };
    }
  } catch (error) {
    console.error("Apple receipt validation network error:", error);
    return {
      isValid: false,
      error: "Failed to communicate with Apple's servers",
    };
  }
}

/**
 * Find specific transaction in receipt data
 */
function findTransactionInReceipt(
  receipt: AppStoreReceiptValidationResponse["receipt"],
  transactionId: string,
  productId: string,
) {
  return receipt.in_app?.find(
    (transaction) =>
      transaction.transaction_id === transactionId && transaction.product_id === productId,
  );
}

/**
 * Check if transaction is currently valid (not expired for subscriptions)
 */
function checkTransactionValidity(transaction: any): boolean {
  // For consumable products, always valid once purchased
  if (!transaction.expires_date_ms) {
    return true;
  }

  // For subscriptions, check if not expired
  const expirationDate = new Date(parseInt(transaction.expires_date_ms));
  const now = new Date();

  // Also check if not cancelled
  const isCancelled = !!transaction.cancellation_date;

  return expirationDate > now && !isCancelled;
}

/**
 * Get human-readable error message for Apple receipt validation status codes
 */
function getAppleReceiptErrorMessage(status: number): string {
  switch (status) {
    case 21000:
      return "The App Store could not read the JSON object you provided.";
    case 21002:
      return "The data in the receipt-data property was malformed or missing.";
    case 21003:
      return "The receipt could not be authenticated.";
    case 21004:
      return "The shared secret you provided does not match the shared secret on file for your account.";
    case 21005:
      return "The receipt server is not currently available.";
    case 21006:
      return "This receipt is valid but the subscription has expired.";
    case 21007:
      return "This receipt is from the test environment, but it was sent to the production environment for verification.";
    case 21008:
      return "This receipt is from the production environment, but it was sent to the test environment for verification.";
    case 21010:
      return "This receipt could not be authorized. Treat this the same as if a purchase was never made.";
    default:
      return `Unknown receipt validation error (status: ${status})`;
  }
}
