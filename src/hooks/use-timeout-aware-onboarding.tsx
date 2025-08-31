"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { useAppleMusicAuth } from "@/hooks/use-apple-music-auth";
import { usePhotoGallery } from "@/hooks/use-photo-gallery";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { track } from "@/lib/analytics";

interface TimeoutAwareOnboardingStep {
  id: string;
  title: string;
  description: string;
  timeoutMs: number;
  fallbackAction: () => void;
  isCompleted: boolean;
  isSkipped: boolean;
  isTimedOut: boolean;
  timeRemaining: number;
  canProceedWithoutCompletion: boolean;
}

interface TimeoutAwareOnboardingStatus {
  steps: TimeoutAwareOnboardingStep[];
  overallProgress: number;
  isComplete: boolean;
  canSkipToApp: boolean;
  activeStepId: string | null;
  timeToNextStep: number;
}

const ONBOARDING_STORAGE_KEY = "vibely.onboarding.timeout-aware";
const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds default timeout

export function useTimeoutAwareOnboarding() {
  const [status, setStatus] = useState<TimeoutAwareOnboardingStatus>({
    steps: [
      {
        id: "music",
        title: "Connect Your Music",
        description: "Link your Spotify or Apple Music to unlock personalized AI magic.",
        timeoutMs: 15000, // 15 seconds for music connection
        fallbackAction: () => {},
        isCompleted: false,
        isSkipped: false,
        isTimedOut: false,
        timeRemaining: 15000,
        canProceedWithoutCompletion: true,
      },
      {
        id: "photos",
        title: "Grant Photo Access",
        description: "Your photos become stunning album covers with AI creativity.",
        timeoutMs: 10000, // 10 seconds for photo access
        fallbackAction: () => {},
        isCompleted: false,
        isSkipped: false,
        isTimedOut: false,
        timeRemaining: 10000,
        canProceedWithoutCompletion: true,
      },
      {
        id: "privacy",
        title: "Privacy First",
        description: "Everything stays on your device. Zero data uploaded, maximum privacy.",
        timeoutMs: 5000, // 5 seconds for privacy acknowledgment
        fallbackAction: () => {},
        isCompleted: false,
        isSkipped: false,
        isTimedOut: false,
        timeRemaining: 5000,
        canProceedWithoutCompletion: true,
      },
    ],
    overallProgress: 0,
    isComplete: false,
    canSkipToApp: false,
    activeStepId: "music",
    timeToNextStep: 15000,
  });

  const spotifyAuth = useSpotifyAuth();
  const appleMusicAuth = useAppleMusicAuth();
  const photoGallery = usePhotoGallery();
  const deviceProfile = useDevicePerformance();
  
  const timerRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const intervalRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Load saved progress
  const loadSavedProgress = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) {
        const progress = JSON.parse(saved);
        setStatus(prev => ({
          ...prev,
          steps: prev.steps.map(step => ({
            ...step,
            ...progress.steps.find((s: any) => s.id === step.id) || {}
          })),
          overallProgress: progress.overallProgress || 0,
          isComplete: progress.isComplete || false,
          canSkipToApp: progress.canSkipToApp || false,
          activeStepId: progress.activeStepId || "music",
        }));
      }
    } catch (error) {
      console.warn("Failed to load onboarding progress:", error);
    }
  }, []);

  // Save progress
  const saveProgress = useCallback((newStatus: TimeoutAwareOnboardingStatus) => {
    if (typeof window === "undefined") return;

    try {
      const progress = {
        steps: newStatus.steps.map(step => ({
          id: step.id,
          isCompleted: step.isCompleted,
          isSkipped: step.isSkipped,
          isTimedOut: step.isTimedOut,
        })),
        overallProgress: newStatus.overallProgress,
        isComplete: newStatus.isComplete,
        canSkipToApp: newStatus.canSkipToApp,
        activeStepId: newStatus.activeStepId,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.warn("Failed to save onboarding progress:", error);
    }
  }, []);

  // Initialize onboarding
  useEffect(() => {
    loadSavedProgress();
  }, [loadSavedProgress]);

  // Start timer for active step
  useEffect(() => {
    const activeStep = status.steps.find(step => step.id === status.activeStepId);
    
    if (!activeStep || activeStep.isCompleted || activeStep.isSkipped) {
      return;
    }

    // Clear existing timers
    if (timerRefs.current[activeStep.id]) {
      clearTimeout(timerRefs.current[activeStep.id]);
    }
    
    if (intervalRefs.current[activeStep.id]) {
      clearInterval(intervalRefs.current[activeStep.id]);
    }

    // Start timeout timer
    timerRefs.current[activeStep.id] = setTimeout(() => {
      handleStepTimeout(activeStep.id);
    }, activeStep.timeoutMs);

    // Start countdown interval
    let timeRemaining = activeStep.timeoutMs;
    intervalRefs.current[activeStep.id] = setInterval(() => {
      timeRemaining -= 1000;
      if (timeRemaining <= 0) {
        clearInterval(intervalRefs.current[activeStep.id]);
        return;
      }
      
      setStatus(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.id === activeStep.id 
            ? { ...step, timeRemaining } 
            : step
        ),
        timeToNextStep: timeRemaining,
      }));
    }, 1000);

    return () => {
      if (timerRefs.current[activeStep.id]) {
        clearTimeout(timerRefs.current[activeStep.id]);
      }
      if (intervalRefs.current[activeStep.id]) {
        clearInterval(intervalRefs.current[activeStep.id]);
      }
    };
  }, [status.activeStepId, status.steps]);

  // Handle step completion
  const handleStepComplete = useCallback((stepId: string) => {
    setStatus(prev => {
      const updatedSteps = prev.steps.map(step => 
        step.id === stepId ? { ...step, isCompleted: true } : step
      );
      
      const completedCount = updatedSteps.filter(s => s.isCompleted).length;
      const overallProgress = (completedCount / updatedSteps.length) * 100;
      const isComplete = completedCount === updatedSteps.length;
      
      // Move to next step or complete onboarding
      const nextStep = updatedSteps.find(step => !step.isCompleted && !step.isSkipped);
      
      const newStatus = {
        ...prev,
        steps: updatedSteps,
        overallProgress,
        isComplete,
        canSkipToApp: completedCount > 0 || isComplete,
        activeStepId: nextStep?.id || null,
        timeToNextStep: nextStep?.timeoutMs || 0,
      };
      
      saveProgress(newStatus);
      return newStatus;
    });
    
    track("onboarding_step_completed", {
      step: stepId,
      progress: status.overallProgress,
    });
  }, [status.overallProgress, saveProgress]);

  // Handle step skip
  const handleStepSkip = useCallback((stepId: string) => {
    setStatus(prev => {
      const updatedSteps = prev.steps.map(step => 
        step.id === stepId ? { ...step, isSkipped: true } : step
      );
      
      const completedOrSkippedCount = updatedSteps.filter(s => s.isCompleted || s.isSkipped).length;
      const overallProgress = (completedOrSkippedCount / updatedSteps.length) * 100;
      const isComplete = completedOrSkippedCount === updatedSteps.length;
      
      // Move to next step
      const nextStep = updatedSteps.find(step => !step.isCompleted && !step.isSkipped);
      
      const newStatus = {
        ...prev,
        steps: updatedSteps,
        overallProgress,
        isComplete,
        canSkipToApp: completedOrSkippedCount > 0 || isComplete,
        activeStepId: nextStep?.id || null,
        timeToNextStep: nextStep?.timeoutMs || 0,
      };
      
      saveProgress(newStatus);
      return newStatus;
    });
    
    track("onboarding_step_skipped", {
      step: stepId,
      progress: status.overallProgress,
    });
  }, [status.overallProgress, saveProgress]);

  // Handle step timeout
  const handleStepTimeout = useCallback((stepId: string) => {
    setStatus(prev => {
      const updatedSteps = prev.steps.map(step => 
        step.id === stepId ? { ...step, isTimedOut: true } : step
      );
      
      const step = updatedSteps.find(s => s.id === stepId);
      if (step) {
        step.fallbackAction();
      }
      
      const completedOrSkippedCount = updatedSteps.filter(s => s.isCompleted || s.isSkipped).length;
      const overallProgress = (completedOrSkippedCount / updatedSteps.length) * 100;
      
      // Move to next step
      const nextStep = updatedSteps.find(step => !step.isCompleted && !step.isSkipped);
      
      const newStatus = {
        ...prev,
        steps: updatedSteps,
        overallProgress,
        canSkipToApp: completedOrSkippedCount > 0,
        activeStepId: nextStep?.id || null,
        timeToNextStep: nextStep?.timeoutMs || 0,
      };
      
      saveProgress(newStatus);
      return newStatus;
    });
    
    track("onboarding_step_timeout", {
      step: stepId,
      progress: status.overallProgress,
    });
  }, [status.overallProgress, saveProgress]);

  // Handle skip all
  const handleSkipAll = useCallback(() => {
    setStatus(prev => {
      const updatedSteps = prev.steps.map(step => ({ ...step, isSkipped: true }));
      
      const newStatus = {
        ...prev,
        steps: updatedSteps,
        overallProgress: 100,
        isComplete: true,
        canSkipToApp: true,
        activeStepId: null,
        timeToNextStep: 0,
      };
      
      saveProgress(newStatus);
      return newStatus;
    });
    
    track("onboarding_skip_all", {
      progress: status.overallProgress,
    });
  }, [status.overallProgress, saveProgress]);

  // Handle skip to app
  const handleSkipToApp = useCallback(() => {
    setStatus(prev => {
      const newStatus = {
        ...prev,
        isComplete: true,
        canSkipToApp: true,
        activeStepId: null,
        timeToNextStep: 0,
      };
      
      saveProgress(newStatus);
      return newStatus;
    });
    
    track("onboarding_skip_to_app", {
      progress: status.overallProgress,
    });
  }, [status.overallProgress, saveProgress]);

  // Reset onboarding (for testing)
  const resetOnboarding = useCallback(() => {
    setStatus({
      steps: [
        {
          id: "music",
          title: "Connect Your Music",
          description: "Link your Spotify or Apple Music to unlock personalized AI magic.",
          timeoutMs: 15000,
          fallbackAction: () => {},
          isCompleted: false,
          isSkipped: false,
          isTimedOut: false,
          timeRemaining: 15000,
          canProceedWithoutCompletion: true,
        },
        {
          id: "photos",
          title: "Grant Photo Access",
          description: "Your photos become stunning album covers with AI creativity.",
          timeoutMs: 10000,
          fallbackAction: () => {},
          isCompleted: false,
          isSkipped: false,
          isTimedOut: false,
          timeRemaining: 10000,
          canProceedWithoutCompletion: true,
        },
        {
          id: "privacy",
          title: "Privacy First",
          description: "Everything stays on your device. Zero data uploaded, maximum privacy.",
          timeoutMs: 5000,
          fallbackAction: () => {},
          isCompleted: false,
          isSkipped: false,
          isTimedOut: false,
          timeRemaining: 5000,
          canProceedWithoutCompletion: true,
        },
      ],
      overallProgress: 0,
      isComplete: false,
      canSkipToApp: false,
      activeStepId: "music",
      timeToNextStep: 15000,
    });
    
    // Clear saved progress
    if (typeof window !== "undefined") {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
    
    track("onboarding_reset");
  }, []);

  // Auto-advance if all steps are completed or skipped
  useEffect(() => {
    const allDone = status.steps.every(step => step.isCompleted || step.isSkipped);
    if (allDone && !status.isComplete) {
      setStatus(prev => ({
        ...prev,
        isComplete: true,
        canSkipToApp: true,
        activeStepId: null,
        timeToNextStep: 0,
      }));
    }
  }, [status.steps, status.isComplete]);

  return {
    status,
    handleStepComplete,
    handleStepSkip,
    handleStepTimeout,
    handleSkipAll,
    handleSkipToApp,
    resetOnboarding,
  };
}