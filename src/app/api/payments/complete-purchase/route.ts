import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { firebasePurchaseService } from "@/lib/firebase-purchase-service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-08-27.basil",
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Create purchase record in Firebase
    const purchaseRecord = {
      userId,
      productId: session.metadata?.productId || "unknown",
      transactionId: session.payment_intent as string,
      purchaseToken: sessionId,
      purchaseTime: new Date(),
      isValid: true,
      isSubscription: session.mode === "subscription",
      expiryTime:
        session.mode === "subscription"
          ? calculateExpiryTime(session.metadata?.productId)
          : undefined,
      customerId: session.customer as string,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      platform: "web" as const,
      status: "completed" as const,
      metadata: {
        stripeSessionId: sessionId,
        paymentIntent: session.payment_intent,
      },
    };

    // Save purchase to Firebase
    const purchaseId = await firebasePurchaseService.savePurchaseRecord(purchaseRecord);

    // If it's a subscription, create subscription record
    if (session.mode === "subscription" && session.metadata?.productId) {
      const billingCycle = session.metadata.productId.includes("yearly") ? "yearly" : "monthly";
      const tier = session.metadata.productId.includes("premium") ? "premium" : "freemium";
      
      const now = new Date();
      const endDate = billingCycle === "yearly" 
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      await firebasePurchaseService.saveSubscriptionRecord({
        userId,
        purchaseRecordId: purchaseId,
        planId: session.metadata.productId,
        tier: tier as "premium" | "freemium",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        coversUsedThisMonth: 0,
        cancelAtPeriodEnd: false,
        billingCycle,
      });
    }

    return NextResponse.json({
      success: true,
      purchaseId,
      purchase: purchaseRecord,
    });
  } catch (error) {
    console.error("Purchase completion failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function calculateExpiryTime(productId?: string | null): Date | undefined {
  if (!productId) return undefined;

  const now = new Date();

  if (productId.includes("yearly")) {
    // Add 1 year
    now.setFullYear(now.getFullYear() + 1);
  } else if (productId.includes("monthly")) {
    // Add 1 month
    now.setMonth(now.getMonth() + 1);
  }

  return now;
}
