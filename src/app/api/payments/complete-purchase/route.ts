import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Create purchase record
    const purchase = {
      productId: session.metadata?.productId,
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
      currency: session.currency,
    };

    // TODO: Save purchase to database
    // await savePurchaseToDatabase(purchase);

    // TODO: Update user subscription status
    // await updateUserSubscription(userId, purchase);

    return NextResponse.json(purchase);
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
