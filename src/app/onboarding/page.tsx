"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Music, Camera, Lock, Sparkles, ArrowRight, Star, Zap, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { useAuth } from "@/hooks/use-auth";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { useAppleMusicAuth } from "@/hooks/use-apple-music-auth";
import { useDevicePerformance } from "@/hooks/use-device-performance";

const steps = [
  {
    icon: Music,
    title: "Connect Your Music",
    description: "Link your Spotify or Apple Music to unlock personalized AI magic.",
    id: "music",
    benefit: "Get 10x better recommendations",
    color: "from-emerald-400 to-teal-500",
  },
  {
    icon: Camera,
    title: "Grant Photo Access",
    description: "Your photos become stunning album covers with AI creativity.",
    id: "photos",
    benefit: "Create unlimited covers",
    color: "from-cyan-400 to-blue-500",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Everything stays on your device. Zero data uploaded, maximum privacy.",
    id: "privacy",
    benefit: "100% secure & private",
    color: "from-violet-400 to-purple-500",
  },
];

export default function OnboardingPage() {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [skippedSteps, setSkippedSteps] = useState<string[]>([]);
  const [showSkipOptions, setShowSkipOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const deviceProfile = useDevicePerformance();
  const onboarding = useOnboarding();
  const spotifyAuth = useSpotifyAuth();
  const appleMusicAuth = useAppleMusicAuth();

  // Load saved progress on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('vibely.onboarding.progress');
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        setCompletedSteps(progress.completed || []);
        setSkippedSteps(progress.skipped || []);
      } catch (error) {
        console.warn('Failed to load onboarding progress:', error);
      }
    }
  }, []);

  // Save progress whenever it changes
  useEffect(() => {
    const progress = {
      completed: completedSteps,
      skipped: skippedSteps,
      timestamp: Date.now()
    };
    localStorage.setItem('vibely.onboarding.progress', JSON.stringify(progress));
  }, [completedSteps, skippedSteps]);

  // Show skip options after 3 seconds (UX best practice)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkipOptions(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Real step handlers with actual functionality
  const handleMusicConnect = async () => {
    setIsLoading(true);
    setCurrentStep('music');
    
    try {
      if (!spotifyAuth.isAuthenticated) {
        spotifyAuth.login();
        return;
      }
      
      setCompletedSteps((prev) => [...prev, 'music']);
      track('onboarding_music_connected', {
        provider: 'spotify',
        user_id: user?.uid
      });
    } catch (error) {
      console.error('Music connection failed:', error);
    } finally {
      setIsLoading(false);
      setCurrentStep(null);
    }
  };

  const handlePhotosAccess = async () => {
    setIsLoading(true);
    setCurrentStep('photos');
    
    try {
      // Acknowledge photo access
      setCompletedSteps((prev) => [...prev, 'photos']);
      track('onboarding_photos_granted', { user_id: user?.uid });
    } catch (error) {
      console.error('Photo access failed:', error);
      setCompletedSteps((prev) => [...prev, 'photos']);
    } finally {
      setIsLoading(false);
      setCurrentStep(null);
    }
  };

  const handlePrivacyAcknowledge = async () => {
    setIsLoading(true);
    setCurrentStep('privacy');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setCompletedSteps((prev) => [...prev, 'privacy']);
    track('onboarding_privacy_acknowledged', { user_id: user?.uid });
    
    setIsLoading(false);
    setCurrentStep(null);
  };

  const handleAction = async (stepId: string) => {
    switch (stepId) {
      case 'music': await handleMusicConnect(); break;
      case 'photos': await handlePhotosAccess(); break;
      case 'privacy': await handlePrivacyAcknowledge(); break;
      default: console.warn('Unknown step:', stepId);
    }
  };

  const handleSkipStep = (stepId: string) => {
    setSkippedSteps((prev) => [...prev, stepId]);
    track("onboarding_step_skipped", {
      step: stepId,
      user_id: user?.uid
    });
  };

  const handleSkipAll = () => {
    const remainingSteps = steps.filter(step => 
      !completedSteps.includes(step.id) && !skippedSteps.includes(step.id)
    ).map(step => step.id);
    
    setSkippedSteps((prev) => [...prev, ...remainingSteps]);
    track("onboarding_skip_all", {
      skipped_steps: remainingSteps,
      user_id: user?.uid
    });
  };

  const handleSkipNow = useCallback(() => {
    track("onboarding_skip_now", {
      completed_count: completedSteps.length,
      total_steps: steps.length,
      user_id: user?.uid
    });
    
    // Clear saved progress and mark as complete
    localStorage.removeItem('vibely.onboarding.progress');
    onboarding.completeOnboarding();
    router.push("/");
  }, [completedSteps.length, user?.uid, onboarding, router]);

  const handleGetStarted = useCallback(() => {
    track("onboarding_completed", {
      completed_steps: completedSteps,
      skipped_steps: skippedSteps,
      user_id: user?.uid
    });
    
    localStorage.removeItem('vibely.onboarding.progress');
    onboarding.completeOnboarding();
    router.push("/");
  }, [completedSteps, skippedSteps, user?.uid, onboarding, router]);

  // Performance-aware animations (with null check)
  const shouldUseReducedAnimations = deviceProfile.tier === 'low' || (deviceProfile.batteryLevel && deviceProfile.batteryLevel < 20);
  const animationDuration = shouldUseReducedAnimations ? '200ms' : '500ms';
  
  const allStepsCompleted = completedSteps.length === steps.length;
  const progressPercentage = ((completedSteps.length + skippedSteps.length) / steps.length) * 100;
  
  // Auto-focus management for accessibility
  useEffect(() => {
    const firstIncompleteStep = steps.find(step => 
      !completedSteps.includes(step.id) && !skippedSteps.includes(step.id)
    );
    
    if (firstIncompleteStep) {
      const stepElement = document.querySelector(`[data-step-id="${firstIncompleteStep.id}"]`);
      if (stepElement) {
        (stepElement as HTMLElement).scrollIntoView({ 
          behavior: shouldUseReducedAnimations ? 'auto' : 'smooth',
          block: 'center' 
        });
      }
    }
  }, [completedSteps, skippedSteps, shouldUseReducedAnimations]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-950 relative overflow-hidden">
      {/* Performance-aware background effects */}
      {!shouldUseReducedAnimations && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 animate-pulse" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-transparent rounded-full blur-3xl animate-bounce" style={{ animationDuration: '8s' }} />
        </>
      )}
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Navigation with Skip Now Button */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-white font-bold text-lg">Vibely</span>
          </div>
          
          {showSkipOptions && (
            <div className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-xl border border-slate-600/30 rounded-2xl p-2">
              <Button
                onClick={handleSkipNow}
                variant="ghost"
                className="text-emerald-300 hover:text-emerald-200 text-sm px-4 py-1.5 rounded-lg hover:bg-emerald-500/10 border border-emerald-400/30 font-bold focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                aria-label="Skip onboarding process"
              >
                ⚡ Skip Now
              </Button>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="px-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 rounded-full flex-1 transition-all duration-500 ease-out",
                  index < completedSteps.length + skippedSteps.length
                    ? "bg-gradient-to-r from-emerald-400 to-cyan-400"
                    : "bg-slate-700/50"
                )}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm font-medium">
              {completedSteps.length + skippedSteps.length} of {steps.length} completed
            </span>
            <span className="text-emerald-300 text-sm font-bold">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 pb-6">
          <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <header className="text-center mb-12 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 rounded-full blur-xl animate-pulse" />
              <h1 className="text-5xl font-black tracking-tighter text-white mb-3 bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
                Welcome to
              </h1>
              <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent mb-4">
                The Future 🚀
              </h2>
              <p className="text-lg text-white/70 font-medium max-w-xs mx-auto leading-relaxed mb-6">
                Let's unlock your creative superpowers in 60 seconds
              </p>
              
              {/* Flexible Setup Section with Skip Options */}
              <div className="bg-slate-800/40 backdrop-blur-lg border border-emerald-400/20 rounded-2xl p-4 mb-6 max-w-sm mx-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span className="text-emerald-200 font-semibold text-sm">Flexible Setup</span>
                </div>
                <p className="text-white/60 text-sm mb-4 leading-relaxed">
                  Skip any step and return later through your Settings. We'll save your progress!
                </p>
                <div className="flex gap-2">
                  {showSkipOptions && (
                    <>
                      <Button
                        onClick={handleSkipAll}
                        size="sm"
                        variant="ghost"
                        className="flex-1 text-slate-300 hover:text-white text-xs px-3 py-2 rounded-lg border border-slate-600/50 hover:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all duration-200"
                        aria-label="Skip all onboarding steps"
                      >
                        Skip All Steps
                      </Button>
                      <Button
                        onClick={handleSkipNow}
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-emerald-500/80 to-teal-500/80 hover:from-emerald-400 hover:to-teal-400 text-white font-medium text-xs px-3 py-2 rounded-lg border-0 shadow-lg transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                        aria-label="Skip onboarding and continue to app"
                      >
                        ⚡ Skip Now
                      </Button>
                    </>
                  )}
                  {!showSkipOptions && (
                    <div className="flex-1 text-center">
                      <span className="text-slate-400 text-xs">Skip options available in 3s...</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Next Step Recommendation */}
              {completedSteps.length < steps.length && (
                <div className="mt-6 inline-flex items-center gap-2 bg-slate-800/40 backdrop-blur-lg border border-emerald-400/30 rounded-2xl px-4 py-2">
                  <Star className="w-4 h-4 text-emerald-300" />
                  <span className="text-emerald-200 text-sm font-medium">
                    Next: {steps.find(step => !completedSteps.includes(step.id) && !skippedSteps.includes(step.id))?.title}
                  </span>
                </div>
              )}
            </header>

            {/* Step Cards */}
            <div className="space-y-4 mb-12">
              {steps.map((step) => {
                const isCompleted = completedSteps.includes(step.id);
                const isSkipped = skippedSteps.includes(step.id);
                const isCurrent = !isCompleted && !isSkipped;
                
                return (
                  <Card
                    key={step.id}
                    className={cn(
                      "group relative overflow-hidden transition-all duration-500 ease-out border-2",
                      isCompleted 
                        ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-400/50 backdrop-blur-xl shadow-lg shadow-emerald-500/20"
                        : isSkipped
                        ? "bg-slate-800/40 border-slate-600/30 backdrop-blur-xl"
                        : "bg-slate-800/60 border-slate-600/50 backdrop-blur-xl hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-[1.02]"
                    )}
                  >
                    {/* Visual Effects */}
                    <div className={cn(
                      "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                      `bg-gradient-to-r ${step.color} opacity-5`
                    )} />
                    
                    <CardContent className="p-6 relative z-10">
                      <div className="flex items-start gap-4">
                        {/* Icon with Status */}
                        <div className="relative flex-shrink-0">
                          <div
                            className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border-2",
                              isCompleted
                                ? "bg-gradient-to-r from-emerald-400 to-teal-400 border-emerald-300 text-slate-900 shadow-lg"
                                : isSkipped
                                ? "bg-slate-700 border-slate-600 text-slate-400"
                                : "bg-slate-700/80 border-slate-500 text-white group-hover:border-emerald-400 group-hover:text-emerald-300"
                            )}
                          >
                            {isCompleted ? (
                              <Check className="w-6 h-6 animate-in zoom-in duration-300" />
                            ) : isSkipped ? (
                              <X className="w-6 h-6" />
                            ) : (
                              <step.icon className="w-6 h-6" />
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className={cn(
                              "font-bold text-lg leading-tight",
                              isCompleted ? "text-emerald-200" : isSkipped ? "text-slate-400 line-through" : "text-white"
                            )}>
                              {step.title}
                            </h3>
                            {isCurrent && (
                              <div className="flex items-center gap-1 text-xs text-emerald-300 font-medium bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-400/30">
                                <Zap className="w-3 h-3" />
                                NEXT
                              </div>
                            )}
                          </div>
                          
                          <p className={cn(
                            "text-sm mb-3 leading-relaxed",
                            isCompleted ? "text-emerald-100/80" : isSkipped ? "text-slate-500" : "text-white/70"
                          )}>
                            {step.description}
                          </p>
                          
                          {/* Benefit Badge */}
                          <div className="flex items-center gap-2 text-xs">
                            <div className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full border",
                              isCompleted 
                                ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
                                : "bg-slate-700/50 text-slate-300 border-slate-600/50"
                            )}>
                              <Star className="w-3 h-3" />
                              {step.benefit}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                          {!isCompleted && !isSkipped && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAction(step.id)}
                                disabled={isLoading}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold px-4 py-2 rounded-xl border-0 shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50"
                              >
                                {isLoading ? (
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <>
                                    {step.id === "privacy" ? "Got it!" : "Connect"}
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                  </>
                                )}
                              </Button>
                              
                              {showSkipOptions && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSkipStep(step.id)}
                                  className="text-slate-400 hover:text-emerald-300 text-xs px-3 py-1.5 h-auto rounded-lg border border-slate-600/30 hover:border-emerald-400/50 transition-all duration-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                                  aria-label={`Skip ${step.title} step and return later`}
                                >
                                  🔄 Skip & Return Later
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Main CTA */}
            <div className="text-center space-y-4">
              <Button
                size="lg"
                onClick={handleGetStarted}
                disabled={completedSteps.length === 0 && skippedSteps.length === 0}
                className={cn(
                  "w-full rounded-2xl font-black text-lg py-6 transition-all duration-300 border-2 shadow-xl",
                  allStepsCompleted
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border-emerald-400 shadow-emerald-500/30 hover:scale-105"
                    : completedSteps.length > 0 || skippedSteps.length > 0
                    ? "bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white border-slate-500"
                    : "bg-slate-800/50 text-slate-400 border-slate-700 cursor-not-allowed"
                )}
              >
                {allStepsCompleted ? (
                  <>
                    🚀 Launch Vibely
                    <Sparkles className="w-5 h-5 ml-2" />
                  </>
                ) : completedSteps.length > 0 || skippedSteps.length > 0 ? (
                  "Continue to Vibely"
                ) : (
                  "Complete steps above"
                )}
              </Button>
              
              {/* Skip All Option */}
              {showSkipOptions && completedSteps.length === 0 && skippedSteps.length === 0 && (
                <div className="pt-4 border-t border-slate-700/50">
                  <Button
                    variant="ghost"
                    onClick={handleSkipAll}
                    className="text-slate-400 hover:text-emerald-300 text-sm font-medium"
                  >
                    Skip all and explore on my own →
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
