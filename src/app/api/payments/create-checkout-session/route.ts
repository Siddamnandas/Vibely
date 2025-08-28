import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { productId, priceAmount, currency, type } = await request.json();

    if (!productId || !priceAmount || !currency) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const isSubscription = type === 'subscription';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: getProductName(productId),
              description: getProductDescription(productId),
            },
            ...(isSubscription ? {
              recurring: {
                interval: productId.includes('yearly') ? 'year' : 'month',
              },
            } : {}),
            unit_amount: Math.round(priceAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&product_id=${productId}`,
      cancel_url: `${baseUrl}/subscription?cancelled=true`,
      metadata: {
        productId,
        type,
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Stripe session creation failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getProductName(productId: string): string {
  const productNames: Record<string, string> = {
    'premium_monthly': 'Vibely Premium Monthly',
    'premium_yearly': 'Vibely Premium Yearly',
    'extra_covers_pack': '10 Extra Covers Pack',
  };
  
  return productNames[productId] || 'Vibely Product';
}

function getProductDescription(productId: string): string {
  const productDescriptions: Record<string, string> = {
    'premium_monthly': 'Unlimited album covers, no watermarks, HD export quality',
    'premium_yearly': 'Unlimited album covers, no watermarks, HD export quality - Annual plan with 40% savings',
    'extra_covers_pack': 'Add 10 additional covers to your monthly quota',
  };
  
  return productDescriptions[productId] || 'Vibely Premium Features';
}