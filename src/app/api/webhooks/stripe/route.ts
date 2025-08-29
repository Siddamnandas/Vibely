import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { firebasePurchaseService } from "@/lib/firebase-purchase-service";
import { track as trackEvent } from "@/lib/analytics";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-08-27.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    trackEvent("stripe_webhook_verification_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`Received Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.dispute.created":
        await handleChargeDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
        trackEvent("stripe_webhook_unhandled_event", {
          event_type: event.type,
        });
    }

    trackEvent("stripe_webhook_processed", {
      event_type: event.type,
      event_id: event.id,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);

    trackEvent("stripe_webhook_processing_failed", {
      event_type: event.type,
      event_id: event.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    if (!session.metadata?.userId) {
      console.warn("No userId in session metadata");
      return;
    }

    const userId = session.metadata.userId;
    const productId = session.metadata.productId || "unknown";

    // Create purchase record
    const purchaseRecordId = await firebasePurchaseService.savePurchaseRecord({
      userId,
      productId,
      transactionId: session.payment_intent as string,
      purchaseToken: session.id,
      purchaseTime: new Date(session.created * 1000),
      isValid: true,
      isSubscription: session.mode === "subscription",
      expiryTime: session.mode === "subscription" ? calculateExpiryTime(productId) : undefined,
      customerId: session.customer as string,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      platform: "web",
      status: "completed",
      metadata: {
        stripeSessionId: session.id,
        paymentIntent: session.payment_intent,
        subscriptionId: session.subscription,
      },
    });

    // If it's a subscription, create subscription record
    if (session.mode === "subscription" && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      await createSubscriptionRecord(userId, purchaseRecordId, productId, subscription);
    }

    trackEvent("checkout_session_completed", {
      user_id: userId,
      product_id: productId,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency,
      is_subscription: session.mode === "subscription",
    });
  } catch (error) {
    console.error("Error handling checkout session completed:", error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    if (!(invoice as any).subscription) return;

    const subscription = await stripe.subscriptions.retrieve(
      (invoice as any).subscription as string,
    );
    const userId = subscription.metadata?.userId;

    if (!userId) {
      console.warn("No userId in subscription metadata");
      return;
    }

    // Find existing subscription record
    const activeSubscription = await firebasePurchaseService.getUserActiveSubscription(userId);

    if (activeSubscription) {
      // Update subscription period for renewal
      const currentPeriodStart = new Date((subscription as any).current_period_start * 1000);
      const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);

      // Reset monthly usage for new billing period
      await firebasePurchaseService.resetMonthlyUsage(activeSubscription.id!);

      // Update subscription dates
      await firebasePurchaseService.saveSubscriptionRecord({
        ...activeSubscription,
        currentPeriodStart,
        currentPeriodEnd,
        status: subscription.status === "active" ? "active" : "on_hold",
        coversUsedThisMonth: 0,
      });
    }

    trackEvent("invoice_payment_succeeded", {
      user_id: userId,
      subscription_id: subscription.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      billing_reason: invoice.billing_reason,
    });
  } catch (error) {
    console.error("Error handling invoice payment succeeded:", error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    if (!(invoice as any).subscription) return;

    const subscription = await stripe.subscriptions.retrieve(
      (invoice as any).subscription as string,
    );
    const userId = subscription.metadata?.userId;

    if (!userId) return;

    const activeSubscription = await firebasePurchaseService.getUserActiveSubscription(userId);

    if (activeSubscription) {
      // Update subscription status to grace period or on hold
      const newStatus = subscription.status === "past_due" ? "grace_period" : "on_hold";

      await firebasePurchaseService.saveSubscriptionRecord({
        ...activeSubscription,
        status: newStatus,
      });
    }

    trackEvent("invoice_payment_failed", {
      user_id: userId,
      subscription_id: subscription.id,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      attempt_count: invoice.attempt_count,
    });
  } catch (error) {
    console.error("Error handling invoice payment failed:", error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    // The subscription record should already be created during checkout
    // This is just for logging and analytics
    trackEvent("subscription_created", {
      user_id: userId,
      subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: (subscription as any).current_period_start,
      current_period_end: (subscription as any).current_period_end,
    });
  } catch (error) {
    console.error("Error handling subscription created:", error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const activeSubscription = await firebasePurchaseService.getUserActiveSubscription(userId);

    if (activeSubscription) {
      let newStatus: "active" | "cancelled" | "expired" | "grace_period" | "on_hold";

      switch (subscription.status) {
        case "active":
          newStatus = "active";
          break;
        case "canceled":
          newStatus = "cancelled";
          break;
        case "past_due":
          newStatus = "grace_period";
          break;
        case "unpaid":
          newStatus = "on_hold";
          break;
        default:
          newStatus = "expired";
      }

      await firebasePurchaseService.saveSubscriptionRecord({
        ...activeSubscription,
        status: newStatus,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      });
    }

    trackEvent("subscription_updated", {
      user_id: userId,
      subscription_id: subscription.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error("Error handling subscription updated:", error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const activeSubscription = await firebasePurchaseService.getUserActiveSubscription(userId);

    if (activeSubscription) {
      await firebasePurchaseService.saveSubscriptionRecord({
        ...activeSubscription,
        status: "cancelled",
      });
    }

    trackEvent("subscription_deleted", {
      user_id: userId,
      subscription_id: subscription.id,
      ended_at: subscription.ended_at,
    });
  } catch (error) {
    console.error("Error handling subscription deleted:", error);
    throw error;
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    // Send notification about trial ending
    // This could integrate with the push notification system
    trackEvent("trial_will_end", {
      user_id: userId,
      subscription_id: subscription.id,
      trial_end: subscription.trial_end,
      days_until_end: subscription.trial_end
        ? Math.ceil((subscription.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
        : 0,
    });
  } catch (error) {
    console.error("Error handling trial will end:", error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Update purchase record status if it exists
    const purchaseRecords = await firebasePurchaseService.getUserPurchases(
      paymentIntent.metadata?.userId || "",
    );

    const matchingPurchase = purchaseRecords.find((p) => p.transactionId === paymentIntent.id);

    if (matchingPurchase) {
      await firebasePurchaseService.updatePurchaseStatus(matchingPurchase.id!, "completed", {
        paymentIntentSucceeded: true,
      });
    }

    trackEvent("payment_intent_succeeded", {
      user_id: paymentIntent.metadata?.userId,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error("Error handling payment intent succeeded:", error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Update purchase record status if it exists
    const purchaseRecords = await firebasePurchaseService.getUserPurchases(
      paymentIntent.metadata?.userId || "",
    );

    const matchingPurchase = purchaseRecords.find((p) => p.transactionId === paymentIntent.id);

    if (matchingPurchase) {
      await firebasePurchaseService.updatePurchaseStatus(matchingPurchase.id!, "failed", {
        paymentIntentFailed: true,
        lastPaymentError: paymentIntent.last_payment_error?.message,
      });
    }

    trackEvent("payment_intent_failed", {
      user_id: paymentIntent.metadata?.userId,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      error_code: paymentIntent.last_payment_error?.code,
      error_message: paymentIntent.last_payment_error?.message,
    });
  } catch (error) {
    console.error("Error handling payment intent failed:", error);
    throw error;
  }
}

async function handleChargeDisputeCreated(dispute: Stripe.Dispute) {
  try {
    const charge = await stripe.charges.retrieve(dispute.charge as string);
    const paymentIntent = charge.payment_intent as string;

    // Find and update the purchase record
    const purchaseRecords = await firebasePurchaseService.getUserPurchases(
      charge.metadata?.userId || "",
    );

    const matchingPurchase = purchaseRecords.find((p) => p.transactionId === paymentIntent);

    if (matchingPurchase) {
      await firebasePurchaseService.updatePurchaseStatus(
        matchingPurchase.id!,
        "refunded", // Treat dispute as refunded for now
        {
          disputeCreated: true,
          disputeId: dispute.id,
          disputeReason: dispute.reason,
          disputeAmount: dispute.amount / 100,
        },
      );
    }

    trackEvent("charge_dispute_created", {
      user_id: charge.metadata?.userId,
      dispute_id: dispute.id,
      charge_id: dispute.charge,
      amount: dispute.amount / 100,
      currency: dispute.currency,
      reason: dispute.reason,
    });
  } catch (error) {
    console.error("Error handling charge dispute created:", error);
    throw error;
  }
}

async function createSubscriptionRecord(
  userId: string,
  purchaseRecordId: string,
  productId: string,
  subscription: Stripe.Subscription,
) {
  const billingCycle = productId.includes("yearly") ? "yearly" : "monthly";
  const tier = productId.includes("premium") ? "premium" : "freemium";

  await firebasePurchaseService.saveSubscriptionRecord({
    userId,
    purchaseRecordId,
    planId: productId,
    tier: tier as "premium" | "freemium",
    status: subscription.status === "active" ? "active" : "grace_period",
    currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    coversUsedThisMonth: 0,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    billingCycle,
  });
}

function calculateExpiryTime(productId: string): Date {
  const now = new Date();

  if (productId.includes("yearly")) {
    return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  } else {
    return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
}
