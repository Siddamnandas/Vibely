"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Check,
  Zap,
  Download,
  Palette,
  Shield,
  Infinity,
  Loader2,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useInAppPurchase } from "@/hooks/use-in-app-purchase";
import {
  subscriptionService,
  SUBSCRIPTION_PLANS,
  formatPrice,
  getSubscriptionBenefits,
  UserSubscription,
} from "@/lib/subscription";

export default function SubscriptionPage() {
  const { toast } = useToast();
  const {
    products,
    hasActiveSubscription,
    isLoading: iapLoading,
    purchaseProduct,
    restorePurchases,
    getPlatformInfo,
  } = useInAppPurchase();

  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    // Load current subscription
    let cancelled = false;
    (async () => {
      try {
        const subscription = await subscriptionService.getCurrentSubscription("user1");
        if (!cancelled) setCurrentSubscription(subscription);
      } catch (e) {
        // Keep null on failure; UI will handle gracefully
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpgrade = async () => {
    if (!currentSubscription) return;

    setIsUpgrading(true);

    try {
      // Use in-app purchase for actual payment
      const productId = selectedPlan === "monthly" ? "premium_monthly" : "premium_yearly";

      const purchase = await purchaseProduct(productId);

      if (purchase) {
        // Update local subscription state
        const result = await subscriptionService.upgradeToPremium("user1", selectedPlan);

        if (result.success && result.subscription) {
          setCurrentSubscription(result.subscription);
          toast({
            title: "Welcome to Vibely Pro! 🎉",
            description: "You now have unlimited access to all premium features.",
          });
        }
      } else {
        // Purchase was initiated (e.g., redirected to Stripe) or cancelled
        toast({
          title: "Payment Processing",
          description: "Please complete your payment to activate Vibely Pro.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upgrade Failed",
        description:
          error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentSubscription) return;

    setIsCanceling(true);

    try {
      const result = await subscriptionService.cancelSubscription("user1", false);

      if (result.success) {
        const updatedSub = await subscriptionService.getCurrentSubscription("user1");
        setCurrentSubscription(updatedSub);

        toast({
          title: "Subscription Canceled",
          description:
            "Your premium features will remain active until the end of your billing period.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Cancellation Failed",
          description: result.error || "Please contact support for assistance.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process cancellation. Please try again.",
      });
    } finally {
      setIsCanceling(false);
    }
  };

  const handleRestore = async () => {
    try {
      const purchases = await restorePurchases();

      if (purchases.length > 0) {
        // Update subscription status
        const result = await subscriptionService.upgradeToPremium("user1", "monthly");

        if (result.success && result.subscription) {
          setCurrentSubscription(result.subscription);
          toast({
            title: "Purchases Restored!",
            description: `Found ${purchases.length} purchase${purchases.length > 1 ? "s" : ""}. Your premium access has been restored.`,
          });
        }
      } else {
        toast({
          title: "No Purchases Found",
          description: "We couldn't find any previous purchases to restore.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: "Failed to restore purchases. Please try again.",
      });
    }
  };

  const { platform } = getPlatformInfo();
  const isPremium = currentSubscription?.plan?.tier === "premium" || hasActiveSubscription;
  const premiumPlan = SUBSCRIPTION_PLANS.find((p) => p.tier === "premium")!;
  const freemiumPlan = SUBSCRIPTION_PLANS.find((p) => p.tier === "freemium")!;

  return (
    <div className="min-h-screen bg-[#0E0F12] text-white">
      <div className="container mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Crown className="w-8 h-8 text-[#FFD36E]" />
              <h1 className="text-4xl font-black">Vibely Pro</h1>
            </div>
            <p className="text-xl text-white/70 mb-6">
              Unlock unlimited creativity with premium features
            </p>

            {/* Current Plan Status */}
            {currentSubscription && (
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-white/10 to-white/5 rounded-full border border-white/20 backdrop-blur-sm">
                <div
                  className={`w-3 h-3 rounded-full ${isPremium ? "bg-[#9FFFA2]" : "bg-[#8FD3FF]"}`}
                ></div>
                <span className="font-semibold">Current Plan: {currentSubscription.plan.name}</span>
                {isPremium && currentSubscription.cancelAtPeriodEnd && (
                  <Badge variant="outline" className="border-[#FF6F91]/30 text-[#FF6F91]">
                    Canceling
                  </Badge>
                )}
              </div>
            )}
          </motion.div>
        </header>

        {/* Usage Stats for Freemium Users */}
        {!isPremium && currentSubscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-12"
          >
            <Card className="bg-gradient-to-br from-[#FF6F91]/10 to-[#FFD36E]/10 border border-[#FF6F91]/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Monthly Usage</h3>
                    <p className="text-white/70">
                      {currentSubscription.coversUsedThisMonth} of{" "}
                      {currentSubscription.plan.features.coversPerMonth} covers used
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-[#FF6F91] mb-1">
                      {currentSubscription.plan.features.coversPerMonth -
                        currentSubscription.coversUsedThisMonth}
                    </div>
                    <div className="text-sm text-white/60">Remaining</div>
                  </div>
                </div>

                {/* Usage Bar */}
                <div className="mt-4">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] transition-all duration-300"
                      style={{
                        width: `${(currentSubscription.coversUsedThisMonth / currentSubscription.plan.features.coversPerMonth) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Freemium Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card
              className={`bg-gradient-to-br from-white/5 to-white/10 border border-white/20 h-full ${!isPremium ? "ring-2 ring-[#8FD3FF]/50" : ""}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-black">Freemium</CardTitle>
                  {!isPremium && (
                    <Badge className="bg-[#8FD3FF]/20 text-[#8FD3FF] border-[#8FD3FF]/30">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="text-4xl font-black text-white">Free</div>
                <p className="text-white/60">Perfect for getting started</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {getSubscriptionBenefits("freemium").map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-[#8FD3FF] flex-shrink-0" />
                      <span className="text-white/80">{benefit}</span>
                    </li>
                  ))}
                </ul>

                {isPremium && (
                  <Button
                    onClick={handleCancel}
                    disabled={isCanceling}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    {isCanceling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Canceling...
                      </>
                    ) : (
                      "Downgrade to Free"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card
              className={`bg-gradient-to-br from-[#9FFFA2]/10 to-[#FF6F91]/10 border-2 border-[#9FFFA2]/30 h-full relative overflow-hidden ${isPremium ? "ring-2 ring-[#9FFFA2]/50" : ""}`}
            >
              {/* Popular Badge */}
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-bold">
                  <Sparkles className="w-3 h-3 mr-1" />
                  POPULAR
                </Badge>
              </div>

              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-black flex items-center gap-2">
                    <Crown className="w-6 h-6 text-[#FFD36E]" />
                    Vibely Pro
                  </CardTitle>
                  {isPremium && (
                    <Badge className="bg-[#9FFFA2]/20 text-[#9FFFA2] border-[#9FFFA2]/30">
                      Active
                    </Badge>
                  )}
                </div>

                {!isPremium && (
                  <div className="space-y-2">
                    {/* Billing Toggle */}
                    <div className="flex items-center gap-4 mb-4">
                      <button
                        onClick={() => setSelectedPlan("monthly")}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                          selectedPlan === "monthly"
                            ? "bg-[#9FFFA2] text-black"
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setSelectedPlan("yearly")}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                          selectedPlan === "yearly"
                            ? "bg-[#9FFFA2] text-black"
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        Yearly
                      </button>
                      {selectedPlan === "yearly" && (
                        <Badge className="bg-[#FFD36E]/20 text-[#FFD36E] border-[#FFD36E]/30">
                          17% OFF
                        </Badge>
                      )}
                    </div>

                    <div className="text-4xl font-black text-white">
                      {formatPrice(
                        selectedPlan === "monthly"
                          ? premiumPlan.price.monthly
                          : premiumPlan.price.yearly,
                      )}
                      <span className="text-lg font-normal text-white/60">
                        /{selectedPlan === "monthly" ? "month" : "year"}
                      </span>
                    </div>

                    {selectedPlan === "yearly" && (
                      <p className="text-sm text-[#9FFFA2]">
                        Save $
                        {(premiumPlan.price.monthly * 12 - premiumPlan.price.yearly).toFixed(2)} per
                        year
                      </p>
                    )}
                  </div>
                )}

                <p className="text-white/60">Unlimited creativity unleashed</p>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {getSubscriptionBenefits("premium").map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#9FFFA2] flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                      <span className="text-white/90">{benefit}</span>
                    </li>
                  ))}
                </ul>

                {!isPremium ? (
                  <div className="space-y-3">
                    <Button
                      onClick={handleUpgrade}
                      disabled={isUpgrading}
                      className="w-full bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] text-black font-bold text-lg py-6 rounded-full hover:opacity-90 transition-opacity"
                    >
                      {isUpgrading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Crown className="w-5 h-5 mr-2" />
                          Upgrade to Pro
                        </>
                      )}
                    </Button>

                    {/* Restore Purchases for iOS */}
                    {platform === "ios" && (
                      <Button
                        onClick={handleRestore}
                        variant="outline"
                        className="w-full border-white/20 text-white hover:bg-white/10 text-sm"
                      >
                        Restore Purchases
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4 bg-[#9FFFA2]/10 rounded-2xl">
                    <Crown className="w-8 h-8 mx-auto mb-2 text-[#FFD36E]" />
                    <p className="text-[#9FFFA2] font-semibold">You're a Pro member!</p>
                    <p className="text-white/60 text-sm mt-1">
                      Enjoying unlimited covers and premium features
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-2xl font-black text-center mb-8">
            Why Choose{" "}
            <span className="bg-gradient-to-r from-[#9FFFA2] to-[#FF6F91] bg-clip-text text-transparent">
              Vibely Pro?
            </span>
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Infinity,
                title: "Unlimited Covers",
                description: "Generate as many covers as you want",
                color: "#9FFFA2",
              },
              {
                icon: Download,
                title: "HD & 4K Export",
                description: "Professional quality downloads",
                color: "#8FD3FF",
              },
              {
                icon: Palette,
                title: "Exclusive Styles",
                description: "Premium templates and effects",
                color: "#FF6F91",
              },
              {
                icon: Shield,
                title: "No Watermarks",
                description: "Clean, professional results",
                color: "#FFD36E",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20 text-center"
              >
                <CardContent className="p-6">
                  <feature.icon
                    className="w-12 h-12 mx-auto mb-4"
                    style={{ color: feature.color }}
                  />
                  <h3 className="font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/60 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-white/50 text-sm">
            🔒 Secure payment processing • Cancel anytime • 30-day money-back guarantee
          </p>
        </motion.div>
      </div>
    </div>
  );
}
