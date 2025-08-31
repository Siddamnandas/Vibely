export const dynamic = "force-dynamic";

import PaymentSuccessClient from "./payment-success-client";

export default function PaymentSuccessPage({ searchParams }: any) {
  const sessionId = searchParams?.session_id as string | undefined;
  const productId = searchParams?.product_id as string | undefined;
  return <PaymentSuccessClient sessionId={sessionId || null} productId={productId || null} />;
}
