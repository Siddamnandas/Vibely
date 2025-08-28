'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Loader2, X, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { inAppPurchase } from '@/lib/in-app-purchase';
import { useToast } from '@/hooks/use-toast';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [purchaseDetails, setPurchaseDetails] = useState<any>(null);

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const sessionId = searchParams.get('session_id');
      const productId = searchParams.get('product_id');

      if (!sessionId) {
        setStatus('error');
        return;
      }

      try {
        const purchase = await inAppPurchase.handlePurchaseCompletion(sessionId);
        
        if (purchase) {
          setPurchaseDetails(purchase);
          setStatus('success');
          
          toast({
            title: "Payment Successful! 🎉",
            description: "Welcome to Vibely Premium! Your subscription is now active.",
          });
          
          // Redirect to app after delay
          setTimeout(() => {
            router.push('/subscription?upgraded=true');
          }, 3000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Payment processing failed:', error);
        setStatus('error');
      }
    };

    handlePaymentSuccess();
  }, [searchParams, router, toast]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center px-6">
        <Card className="max-w-md w-full bg-white/5 border-white/20">
          <CardContent className="text-center p-8">
            <Loader2 className="w-16 h-16 mx-auto mb-6 animate-spin text-[#9FFFA2]" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Processing Payment
            </h1>
            <p className="text-white/70">
              Please wait while we confirm your purchase...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center px-6">
        <Card className="max-w-md w-full bg-white/5 border-white/20">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-[#FF6F91]/20 rounded-full flex items-center justify-center">
              <X className="w-8 h-8 text-[#FF6F91]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Payment Error
            </h1>
            <p className="text-white/70 mb-6">
              There was an issue processing your payment. Please contact support if the problem persists.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/subscription')}
                className="w-full bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-bold hover:opacity-90"
              >
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/support')}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg w-full"
      >
        <Card className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-[#9FFFA2] to-[#8FD3FF] rounded-full flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-black" />
            </motion.div>
            
            <CardTitle className="text-3xl font-black text-white mb-2">
              Welcome to Premium!
            </CardTitle>
            
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-[#FFD36E]" />
              <Badge className="bg-gradient-to-r from-[#9FFFA2] to-[#FFD36E] text-black font-bold">
                PREMIUM ACTIVATED
              </Badge>
              <Crown className="w-5 h-5 text-[#FFD36E]" />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Purchase Details */}
            {purchaseDetails && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 rounded-2xl p-4"
              >
                <h3 className="font-semibold text-white mb-3">Purchase Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Plan:</span>
                    <span className="text-white font-medium">
                      {purchaseDetails.productId?.includes('yearly') ? 'Premium Yearly' : 'Premium Monthly'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Amount:</span>
                    <span className="text-white font-medium">
                      ${purchaseDetails.amount} {purchaseDetails.currency?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Transaction ID:</span>
                    <span className="text-white/50 font-mono text-xs">
                      {purchaseDetails.transactionId?.slice(-8)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Premium Features */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-[#9FFFA2]/10 to-[#8FD3FF]/10 border border-[#9FFFA2]/20 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-[#9FFFA2]" />
                <h3 className="font-semibold text-white">Premium Features Unlocked</h3>
              </div>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#9FFFA2]" />
                  Unlimited album cover generation
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#9FFFA2]" />
                  No watermarks on exports
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#9FFFA2]" />
                  HD export quality (4K resolution)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#9FFFA2]" />
                  Priority customer support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#9FFFA2]" />
                  Early access to new features
                </li>
              </ul>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-3"
            >
              <Button
                onClick={() => router.push('/generator')}
                className="w-full bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-bold hover:opacity-90 py-3"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start Creating Covers
              </Button>
              
              <Button
                variant="outline"
                onClick={() => router.push('/subscription')}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                View Subscription Details
              </Button>
            </motion.div>

            {/* Auto Redirect Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center text-white/50 text-sm"
            >
              Redirecting you to the app in a moment...
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}