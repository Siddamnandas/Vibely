/**
 * Comprehensive User Onboarding System for Vibely
 * Guided user experience with progressive disclosure and personalized flows
 */

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  target?: string; // CSS selector for highlighting
  required: boolean;
  tooltipText?: string;
  actionText?: string;
  actionCallback?: () => void;
  dismissible?: boolean;
}

export interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  targetAudience: 'new-user' | 'music-enthusiast' | 'content-creator' | 'premium-interested';
  steps: OnboardingStep[];
  conditions?: () => Promise<boolean>;
  completionAction?: () => void;
}

export interface UserProgress {
  completedFlows: string[];
  completedSteps: { [flowId: string]: string[] };
  skippedFlows: string[];
  lastInteraction: Date;
  preferences: {
    skipOnboarding?: boolean;
    completedIntro?: boolean;
    showHints?: boolean;
  };
}

class OnboardingManager {
  private static instance: OnboardingManager;
  private flows: Map<string, OnboardingFlow> = new Map();
  private userProgress: UserProgress | null = null;
  private listeners: Set<(flowId: string, stepId: string) => void> = new Set();

  constructor() {
    if (OnboardingManager.instance) {
      return OnboardingManager.instance;
    }

    OnboardingManager.instance = this;
    this.initializeDefaultFlows();
    this.loadProgress();
  }

  /**
   * Initialize default onboarding flows
   */
  private initializeDefaultFlows() {
    // New User Flow - Complete beginner experience
    this.registerFlow({
      id: 'new-user-journey',
      name: 'Welcome to Vibely',
      description: 'Get started with personalized music covers',
      targetAudience: 'new-user',
      steps: [
        {
          id: 'welcome-splash',
          title: 'Welcome to Vibely!',
          description: 'Create personalized album covers from your music and photos. It takes 30 seconds to get started.',
          component: 'welcome-splash',
          required: true,
          actionText: 'Get Started',
          dismissible: false
        },
        {
          id: 'music-connection',
          title: 'Connect Your Music',
          description: 'Link your Spotify account to access your playlist library and create personalized covers.',
          component: 'music-connection-guide',
          target: '[data-tour="spotify-connect"]',
          required: true,
          tooltipText: 'Click here to connect Spotify',
          actionText: 'Connect Spotify',
          dismissible: false
        },
        {
          id: 'first-photo-upload',
          title: 'Upload Your Photo',
          description: 'Choose a personal photo to use in your first album cover. We analyze moods and match them perfectly.',
          component: 'photo-upload-guide',
          target: '[data-tour="photo-upload"]',
          required: true,
          tooltipText: 'Select a photo for your cover',
          actionText: 'Upload Photo',
          dismissible: false
        },
        {
          id: 'cover-generation',
          title: 'Behold Your Cover!',
          description: 'Watch as AI creates 2-3 personalized cover variants based on your song\'s mood and your photo.',
          component: 'cover-preview-guide',
          target: '[data-tour="cover-preview"]',
          required: true,
          tooltipText: 'This is your personalized cover!',
          actionText: 'Nice! Continue',
          dismissible: false
        },
        {
          id: 'story-sharing',
          title: 'Share to Stories',
          description: 'Share your new cover to Instagram/TikTok Stories. Each export is beautifully formatted.',
          component: 'story-share-guide',
          target: '[data-tour="story-share"]',
          required: false,
          tooltipText: 'Share your cover to Stories',
          actionText: 'Share Now',
          dismissible: true
        },
        {
          id: 'premium-introduction',
          title: 'Go Premium for HD',
          description: 'Upgrade to Premium for unlimited HD downloads, no watermarks, and exclusive features.',
          component: 'premium-cta',
          target: '[data-tour="premium-upgrade"]',
          required: false,
          tooltipText: 'Upgrade for unlimited HD exports',
          actionText: 'Try Premium',
          dismissible: true
        }
      ],
      conditions: async () => {
        // Check if user is completely new (no activity at all)
        const progress = this.getUserProgress();
        return progress.completedFlows.length === 0;
      }
    });

    // Music Enthusiast Flow - For users with Spotify already connected
    this.registerFlow({
      id: 'music-enthusiast-flow',
      name: 'Music Creator Journey',
      description: 'Advanced features for music enthusiasts',
      targetAudience: 'music-enthusiast',
      steps: [
        {
          id: 'cover-quality-explanation',
          title: 'AI-Powered Quality',
          description: 'Our AI analyzes tempo, energy, and mood to create covers that match your music perfectly.',
          component: 'quality-explanation',
          target: '[data-tour="cover-quality"]',
          required: false,
          dismissible: true
        },
        {
          id: 'regeneration-tips',
          title: 'Unlimited Regeneration',
          description: 'Don\'t like the results? Regenerate as many times as you want to find the perfect cover.',
          component: 'regeneration-guide',
          target: '[data-tour="regenerate"]',
          required: false,
          dismissible: true
        },
        {
          id: 'batch-processing',
          title: 'Playlist Cover Generation',
          description: 'Generate covers for your entire playlist at once. Process 20+ covers with batch regeneration.',
          component: 'batch-guide',
          target: '[data-tour="playlist-regeneration"]',
          required: false,
          dismissible: true
        }
      ],
      conditions: async () => {
        // Check if user has connected music and created some covers
        const progress = this.getUserProgress();
        return progress.completedFlows.includes('new-user-journey');
      }
    });

    // Content Creator Flow - Advanced features
    this.registerFlow({
      id: 'content-creator-flow',
      name: 'Content Creator Tools',
      description: 'Professional tools for content creation',
      targetAudience: 'content-creator',
      steps: [
        {
          id: 'bulk-operations',
          title: 'Bulk Operations',
          description: 'Process entire playlists with smart cover generation. Use our AI to match your brand colors.',
          component: 'bulk-operations-guide',
          target: '[data-tour="bulk-processing"]',
          required: false,
          dismissible: true
        },
        {
          id: 'export-formats',
          title: 'Multiple Export Formats',
          description: 'Export in various sizes and formats optimized for Instagram, TikTok, Twitter, and more.',
          component: 'export-formats-guide',
          target: '[data-tour="export-options"]',
          required: false,
          dismissible: true
        },
        {
          id: 'analytics-integration',
          title: 'Performance Analytics',
          description: 'Track which covers perform best and gain insights into your audience\'s preferences.',
          component: 'analytics-intro',
          target: '[data-tour="analytics-dashboard"]',
          required: false,
          dismissible: true
        }
      ],
      conditions: async () => {
        // Check if user has created many covers (50+)
        return false; // This will be checked by external conditions
      }
    });

    // Premium Feature Introduction
    this.registerFlow({
      id: 'premium-features-intro',
      name: 'Discover Premium',
      description: 'Unlock advanced features with Premium',
      targetAudience: 'premium-interested',
      steps: [
        {
          id: 'hd-downloads',
          title: 'HD Downloads',
          description: 'Download your covers in high resolution without watermarks or quality loss.',
          component: 'hd-download-demo',
          target: '[data-tour="hd-export"]',
          required: false,
          dismissible: true
        },
        {
          id: 'custom-branding',
          title: 'Custom Branding',
          description: 'Add your logo or branding to covers for professional use.',
          component: 'branding-guide',
          target: '[data-tour="custom-branding"]',
          required: false,
          dismissible: true
        },
        {
          id: 'advanced-ai',
          title: 'Advanced AI Features',
          description: 'Access cutting-edge AI tools like multi-person detection and custom backgrounds.',
          component: 'advanced-ai-showcase',
          target: '[data-tour="advanced-ai"]',
          required: false,
          dismissible: true
        }
      ],
      conditions: async () => {
        // Show to free users who have reached feature limits
        return false; // Will be determined by user actions
      }
    });
  }

  /**
   * Register a new onboarding flow
   */
  registerFlow(flow: OnboardingFlow) {
    this.flows.set(flow.id, flow);
  }

  /**
   * Get available flows for current user
   */
  async getAvailableFlows(): Promise<OnboardingFlow[]> {
    const progress = this.getUserProgress();
    const available: OnboardingFlow[] = [];

    for (const flow of this.flows.values()) {
        // Skip completed flows
        if (progress.completedFlows.includes(flow.id)) {
          continue;
        }

        // Skip skipped flows
        if (progress.skippedFlows.includes(flow.id)) {
          continue;
        }

      // Check flow conditions
      if (flow.conditions) {
        try {
          const isEligible = await flow.conditions();
          if (!isEligible) continue;
        } catch (error) {
          console.warn(`Error checking conditions for flow ${flow.id}:`, error);
          continue;
        }
      }

      available.push(flow);
    }

    return available;
  }

  /**
   * Start the most appropriate flow for current user
   */
  async startOptimalFlow(): Promise<OnboardingFlow | null> {
    const available = await this.getAvailableFlows();

    if (available.length === 0) {
      return null; // No flows available
    }

    // Prioritize based on target audience and user context
    const progress = this.getUserProgress();

    // For completely new users, start with introduction
    if (progress.completedFlows.length === 0) {
      return available.find(f => f.id === 'new-user-journey') || available[0];
    }

    // Return first available flow
    return available[0];
  }

  /**
   * Complete a step in a flow
   */
  completeStep(flowId: string, stepId: string) {
    if (!this.userProgress) {
      this.loadProgress();
    }

    if (!this.userProgress!.completedSteps[flowId]) {
      this.userProgress!.completedSteps[flowId] = [];
    }

    if (!this.userProgress!.completedSteps[flowId].includes(stepId)) {
      this.userProgress!.completedSteps[flowId].push(stepId);
      this.saveProgress();
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(flowId, stepId));
  }

  /**
   * Complete an entire flow
   */
  completeFlow(flowId: string) {
    const flow = this.flows.get(flowId);
    if (!flow) return;

    const progress = this.getUserProgress();

    if (!progress.completedFlows.includes(flowId)) {
      progress.completedFlows.push(flowId);
      progress.lastInteraction = new Date();

      // Run completion action if defined
      if (flow.completionAction) {
        try {
          flow.completionAction();
        } catch (error) {
          console.error(`Error running completion action for flow ${flowId}:`, error);
        }
      }

      this.saveProgress();
    }
  }

  /**
   * Skip a flow entirely
   */
  skipFlow(flowId: string) {
    const progress = this.getUserProgress();
    if (!progress.skippedFlows.includes(flowId)) {
      progress.skippedFlows.push(flowId);
      this.saveProgress();
    }
  }

  /**
   * Get user's onboarding progress
   */
  getUserProgress(): UserProgress {
    return this.userProgress || this.createDefaultProgress();
  }

  /**
   * Reset user's progress (useful for debugging)
   */
  resetProgress() {
    this.userProgress = this.createDefaultProgress();
    this.saveProgress();
  }

  /**
   * Subscribe to onboarding events
   */
  onStepComplete(listener: (flowId: string, stepId: string) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Create default user progress
   */
  private createDefaultProgress(): UserProgress {
    return {
      completedFlows: [],
      completedSteps: {},
      skippedFlows: [],
      lastInteraction: new Date(),
      preferences: {
        skipOnboarding: false,
        completedIntro: false,
        showHints: true
      }
    };
  }

  /**
   * Load progress from localStorage
   */
  private loadProgress() {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem('vibely_onboarding_progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date string back to Date object
        parsed.lastInteraction = new Date(parsed.lastInteraction);
        this.userProgress = parsed;
      } else {
        this.userProgress = this.createDefaultProgress();
      }
    } catch (error) {
      console.warn('Error loading onboarding progress:', error);
      this.userProgress = this.createDefaultProgress();
    }
  }

  /**
   * Save progress to localStorage
   */
  private saveProgress() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('vibely_onboarding_progress', JSON.stringify(this.userProgress));
    } catch (error) {
      console.warn('Error saving onboarding progress:', error);
    }
  }
}

export const onboardingManager = new OnboardingManager();

// React hooks for using onboarding system
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface OnboardingContextType {
  currentFlow: OnboardingFlow | null;
  currentStep: OnboardingStep | null;
  progress: UserProgress | null;
  startFlow: (flowId: string) => Promise<void>;
  nextStep: () => void;
  previousStep: () => void;
  skipFlow: () => void;
  completeStep: (stepId: string) => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [currentFlow, setCurrentFlow] = useState<OnboardingFlow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState<UserProgress | null>(null);

  const startFlow = async (flowId: string) => {
    try {
      const flow = onboardingManager.flows.get(flowId);
      if (flow) {
        setCurrentFlow(flow);
        setCurrentStepIndex(0);
        setProgress(onboardingManager.getUserProgress());
      }
    } catch (error) {
      console.error('Error starting onboarding flow:', error);
    }
  };

  const nextStep = () => {
    if (!currentFlow) return;
    if (currentStepIndex < currentFlow.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Complete the flow
      onboardingManager.completeFlow(currentFlow.id);
      setCurrentFlow(null);
      setCurrentStepIndex(0);
    }
  };

  const previousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const skipFlow = () => {
    if (currentFlow) {
      onboardingManager.skipFlow(currentFlow.id);
      setCurrentFlow(null);
      setCurrentStepIndex(0);
    }
  };

  const completeStep = (stepId: string) => {
    if (currentFlow) {
      onboardingManager.completeStep(currentFlow.id, stepId);
      nextStep();
    }
  };

  const resetOnboarding = () => {
    onboardingManager.resetProgress();
    setCurrentFlow(null);
    setCurrentStepIndex(0);
    setProgress(null);
  };

  const currentStep = currentFlow?.steps[currentStepIndex] || null;

  const value: OnboardingContextType = {
    currentFlow,
    currentStep,
    progress,
    startFlow,
    nextStep,
    previousStep,
    skipFlow,
    completeStep,
    resetOnboarding
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}

// Utility hooks
export function useOnboardingStep(stepId: string) {
  const { completeStep } = useOnboarding();

  return useCallback(() => {
    completeStep(stepId);
  }, [completeStep, stepId]);
}

export function useOnboardingTrigger(flowId: string, triggerCondition?: () => boolean) {
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (hasTriggered || (triggerCondition && !triggerCondition())) return;

    onboardingManager.startOptimalFlow().then(flow => {
      if (flow?.id === flowId) {
        setHasTriggered(true);
      }
    });
  }, [flowId, triggerCondition, hasTriggered]);

  return hasTriggered;
}
