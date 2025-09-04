"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Volume2, VolumeX, MousePointer2, Keyboard,
  Type, Contrast, RotateCcw, Zap, Settings, CheckCircle,
  Users, Palette, Target, SkipForward, Pause, Play,
  X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight
} from "lucide-react";

interface AccessibilitySettings {
  screenReader: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  largerFonts: boolean;
  keyboardNavigation: boolean;
  gestureSensitivity: 'low' | 'medium' | 'high';
  audioDescriptions: boolean;
  focusIndicators: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  dyslexiaFont: boolean;
}

interface AccessibilityManagerProps {
  children: React.ReactNode;
  enableGlobalNavigation?: boolean;
}

// Global accessibility context
export class AccessibilityController {
  private static instance: AccessibilityController;
  private settings: AccessibilitySettings = {
    screenReader: false,
    highContrast: false,
    reducedMotion: false,
    largerFonts: false,
    keyboardNavigation: true,
    gestureSensitivity: 'medium',
    audioDescriptions: false,
    focusIndicators: true,
    colorBlindMode: 'none',
    dyslexiaFont: false
  };

  private listeners: ((settings: AccessibilitySettings) => void)[] = [];
  private speakQueue: string[] = [];
  private isSpeaking = false;

  static getInstance(): AccessibilityController {
    if (!AccessibilityController.instance) {
      AccessibilityController.instance = new AccessibilityController();
    }
    return AccessibilityController.instance;
  }

  // Initialize accessibility
  init() {
    this.loadSettings();
    this.applyGlobalSettings();
    this.setupKeyboardNavigation();
    this.setupScreenReaderDetection();
  }

  // Settings management
  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<AccessibilitySettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.applyGlobalSettings();
    this.notifyListeners();
  }

  // Screen reader functionality
  async speak(text: string, priority: 'low' | 'medium' | 'high' = 'medium') {
    if (!this.settings.screenReader) return;

    this.speakQueue.push(text);

    // Sort queue by priority if needed
    if (priority === 'high') {
      const highPriorityIndex = this.speakQueue.length - 1;
      this.speakQueue.unshift(this.speakQueue.splice(highPriorityIndex, 1)[0]);
    }

    if (!this.isSpeaking) {
      await this.processSpeakQueue();
    }
  }

  private async processSpeakQueue() {
    if (this.speakQueue.length === 0) return;

    this.isSpeaking = true;
    const text = this.speakQueue.shift()!;

    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.settings.largerFonts ? 0.8 : 1; // Slower for larger fonts
        utterance.pitch = 1;
        utterance.volume = 1;

        return new Promise<void>((resolve) => {
          utterance.onend = () => {
            this.isSpeaking = false;
            resolve();
          };
          utterance.onerror = () => {
            this.isSpeaking = false;
            resolve();
          };

          speechSynthesis.speak(utterance);
        });
      }
    } catch (error) {
      console.warn('Speech synthesis not available', error);
      this.isSpeaking = false;
    }
  }

  // Keyboard navigation
  setupKeyboardNavigation() {
    if (!this.settings.keyboardNavigation) return;

    document.addEventListener('keydown', (e) => {
      // Skip links to main content
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        const mainContent = document.getElementById('main-content') || document.querySelector('main');
        mainContent?.focus();
        this.speak('Navigated to main content');
      }

      // Skip to navigation
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        const navigation = document.getElementById('main-navigation') || document.querySelector('nav');
        navigation?.focus();
        this.speak('Navigated to main navigation');
      }
    });
  }

  // Screen reader detection
  private setupScreenReaderDetection() {
    // Detect common screen readers
    const isScreenReaderActive = () => {
      return (
        /NVDA|Job Access With Speech|JAWS|VoiceOver|TalkBack/i.test(navigator.userAgent) ||
        document.querySelector('[aria-live],[role="log"],[role="status"]') !== null
      );
    };

    setTimeout(() => {
      if (isScreenReaderActive()) {
        this.updateSettings({ screenReader: true });
        this.speak('Screen reader detected. Accessibility mode activated.');
      }
    }, 2000);
  }

  // Apply global accessibility settings
  private applyGlobalSettings() {
    const root = document.documentElement;

    // High contrast mode
    if (this.settings.highContrast) {
      root.classList.add('high-contrast');
      root.style.setProperty('--bg-primary', '#000000');
      root.style.setProperty('--bg-secondary', '#ffffff');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#000000');
    } else {
      root.classList.remove('high-contrast');
      root.style.removeProperty('--bg-primary');
      root.style.removeProperty('--bg-secondary');
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--text-secondary');
    }

    // Larger fonts
    if (this.settings.largerFonts) {
      root.classList.add('large-fonts');
      document.body.style.fontSize = '18px';
    } else {
      root.classList.remove('large-fonts');
      document.body.style.fontSize = '';
    }

    // Color blind support
    if (this.settings.colorBlindMode !== 'none') {
      root.classList.add(`colorblind-${this.settings.colorBlindMode}`);
    } else {
      root.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
    }

    // Dyslexia font
    if (this.settings.dyslexiaFont) {
      root.classList.add('dyslexia-font');
      document.body.style.fontFamily = '"Open Dyslexic", sans-serif';
    } else {
      root.classList.remove('dyslexia-font');
      document.body.style.fontFamily = '';
    }

    // Reduced motion
    if (this.settings.reducedMotion) {
      root.style.setProperty('--animation-duration', '0s');
    } else {
      root.style.removeProperty('--animation-duration');
    }
  }

  // ARIA live region management
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const liveRegion = document.getElementById('accessibility-announcer') ||
                      this.createLiveRegion();

    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }

  private createLiveRegion(): HTMLElement {
    const existing = document.getElementById('accessibility-announcer');
    if (existing) return existing;

    const liveRegion = document.createElement('div');
    liveRegion.id = 'accessibility-announcer';
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveRegion);

    return liveRegion;
  }

  // Settings persistence
  private saveSettings() {
    try {
      localStorage.setItem('vibely-accessibility', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save accessibility settings', error);
    }
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('vibely-accessibility');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load accessibility settings', error);
    }
  }

  // Listener management
  subscribe(callback: (settings: AccessibilitySettings) => void) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.settings));
  }
}

// React hook for accessibility
export function useAccessibility(): [AccessibilitySettings, (settings: Partial<AccessibilitySettings>) => void] {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    screenReader: false,
    highContrast: false,
    reducedMotion: false,
    largerFonts: false,
    keyboardNavigation: true,
    gestureSensitivity: 'medium',
    audioDescriptions: false,
    focusIndicators: true,
    colorBlindMode: 'none',
    dyslexiaFont: false
  });

  useEffect(() => {
    const controller = AccessibilityController.getInstance();
    controller.init();

    // Sync with controller
    setSettings(controller.getSettings());

    // Listen for changes
    return controller.subscribe(setSettings);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    const controller = AccessibilityController.getInstance();
    controller.updateSettings(newSettings);
  }, []);

  return [settings, updateSettings];
}

export function AccessibilityManager({ children, enableGlobalNavigation = true }: AccessibilityManagerProps) {
  const [isAccessibilityMenuOpen, setIsAccessibilityMenuOpen] = useState(false);
  const [settings, updateSettings] = useAccessibility();
  const controllerRef = useRef(AccessibilityController.getInstance());

  // Skip navigation links
  useEffect(() => {
    if (!enableGlobalNavigation) return;

    // Skip links
    const skipButtons = [
      { key: 'c', label: 'Skip to main content', selector: '#main-content, main' },
      { key: 'n', label: 'Skip to navigation', selector: '#navigation, nav' },
      { key: 's', label: 'Skip to search', selector: '[role="search"], input[type="search"]' }
    ];

    const handleSkipLink = (e: KeyboardEvent, selector: string) => {
      if (e.altKey) {
        e.preventDefault();
        const target = document.querySelector(selector) as HTMLElement;
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          controllerRef.current.speak(`Navigated to ${selector.replace('#', '').replace(',', ' or ')}`);
        }
      }
    };

    const handlers = skipButtons.map(({ key, selector }) =>
      (e: KeyboardEvent) => {
        if (e.key === key) handleSkipLink(e, selector);
      }
    );

    handlers.forEach(handler => document.addEventListener('keydown', handler));

    return () => {
      handlers.forEach(handler => document.removeEventListener('keydown', handler));
    };
  }, [enableGlobalNavigation]);

  // Enhanced keyboard navigation
  useEffect(() => {
    let tabPressed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        tabPressed = true;
      }

      // Arrow key navigation for interactive elements
      if ('ArrowLeft..4'.includes(e.key)) {
        const focusableElement = document.activeElement as HTMLElement;
        if (focusableElement?.hasAttribute('aria-activedescendant')) {
          // Handle arrow navigation for custom components
          controllerRef.current.speak(`${e.key} key pressed`);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        tabPressed = false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Generate CSS for accessibility
  useEffect(() => {
    const root = document.documentElement;

    // Focus indicators
    if (settings.focusIndicators) {
      root.style.setProperty('--focus-color', 'rgba(139, 92, 246, 0.8)');
      root.style.setProperty('--focus-width', '3px');
    }

    // Gesture sensitivity CSS variables
    const sensitivityValues = {
      low: 1.5,
      medium: 1,
      high: 0.8
    };

    root.style.setProperty('--gesture-sensitivity', sensitivityValues[settings.gestureSensitivity].toString());

    // Apply high contrast CSS
    if (settings.highContrast) {
      const style = document.createElement('style');
      style.textContent = `
        .high-contrast {
          --bg-primary: #000000 !important;
          --bg-secondary: #ffffff !important;
          --text-primary: #ffffff !important;
          --text-secondary: #000000 !important;
          filter: contrast(1.8);
        }
        .high-contrast button {
          border: 2px solid white !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, [settings]);

  return (
    <>
      {/* Access key hints (hidden but available for screen readers) */}
      <div className="sr-only" role="status" aria-live="polite">
        <h2>Accessibility Shortcuts</h2>
        <ul>
          <li>Alt + C: Skip to main content</li>
          <li>Alt + N: Skip to navigation</li>
          <li>Alt + S: Skip to search</li>
          <li>Alt + A: Open accessibility menu</li>
        </ul>
      </div>

      {/* Accessibility Menu Trigger */}
      <motion.button
        onClick={() => setIsAccessibilityMenuOpen(true)}
        className="fixed bottom-6 right-6 bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full shadow-lg z-40 border-2 border-transparent focus:border-white"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open accessibility settings"
        title="Accessibility Settings (Alt + A)"
      >
        <Settings size={24} />
      </motion.button>

      {/* Accessibility Menu */}
      <AnimatePresence>
        {isAccessibilityMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >

              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Eye className="text-purple-600 w-8 h-8" />
                  Accessibility Settings
                </h2>
                <button
                  onClick={() => setIsAccessibilityMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close accessibility menu"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Settings Grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Visual Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Eye size={20} />
                    Visual
                  </h3>

                  {/* High Contrast */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Contrast className="text-gray-600 w-5 h-5" />
                      <span className="text-gray-700 font-medium">High Contrast</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ highContrast: !settings.highContrast })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.highContrast ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                      aria-checked={settings.highContrast}
                      role="switch"
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.highContrast ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Larger Fonts */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Type className="text-gray-600 w-5 h-5" />
                      <span className="text-gray-700 font-medium">Larger Fonts</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ largerFonts: !settings.largerFonts })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.largerFonts ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                      role="switch"
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.largerFonts ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Reduced Motion */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="text-gray-600 w-5 h-5" />
                      <span className="text-gray-700 font-medium">Reduced Motion</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.reducedMotion ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                      role="switch"
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Dyslexia Font */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Type className="text-gray-600 w-5 h-5" />
                      <span className="text-gray-700 font-medium">Dyslexia Font</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ dyslexiaFont: !settings.dyslexiaFont })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.dyslexiaFont ? 'bg-pink-600' : 'bg-gray-300'
                      }`}
                      role="switch"
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.dyslexiaFont ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Interaction Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <MousePointer2 size={20} />
                    Interaction
                  </h3>

                  {/* Screen Reader */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Eye className="text-gray-600 w-5 h-5" />
                      <span className="text-gray-700 font-medium">Screen Reader</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ screenReader: !settings.screenReader })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.screenReader ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                      role="switch"
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.screenReader ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Keyboard Navigation */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Keyboard className="text-gray-600 w-5 h-5" />
                      <span className="text-gray-700 font-medium">Keyboard Nav</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ keyboardNavigation: !settings.keyboardNavigation })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.keyboardNavigation ? 'bg-teal-600' : 'bg-gray-300'
                      }`}
                      role="switch"
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.keyboardNavigation ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Audio Descriptions */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Volume2 className="text-gray-600 w-5 h-5" />
                      <span className="text-gray-700 font-medium">Audio Desc.</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ audioDescriptions: !settings.audioDescriptions })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.audioDescriptions ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                      role="switch"
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.audioDescriptions ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Gesture Sensitivity */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <MousePointer2 className="text-gray-600 w-5 h-5" />
                      <span className="text-gray-700 font-medium">Sensitivity</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => updateSettings({ gestureSensitivity: level })}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors capitalize ${
                            settings.gestureSensitivity === level
                              ? 'bg-purple-600 text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Blind Mode */}
              <div className="px-6 pb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Palette className="text-gray-600 w-5 h-5" />
                    <span className="text-gray-700 font-medium">Color Blind Support</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(['none', 'protanopia', 'deuteranopia', 'tritanopia'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => updateSettings({ colorBlindMode: mode })}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors capitalize ${
                          settings.colorBlindMode === mode
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save & Reset */}
              <div className="px-6 pb-6 flex gap-4">
                <motion.button
                  onClick={() => setIsAccessibilityMenuOpen(false)}
                  className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CheckCircle size={20} />
                  Apply Settings
                </motion.button>

                <motion.button
                  onClick={() => updateSettings({
                    screenReader: false,
                    highContrast: false,
                    reducedMotion: false,
                    largerFonts: false,
                    keyboardNavigation: true,
                    gestureSensitivity: 'medium',
                    audioDescriptions: false,
                    focusIndicators: true,
                    colorBlindMode: 'none',
                    dyslexiaFont: false
                  })}
                  className="py-3 px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RotateCcw size={20} />
                  Reset All
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render children with accessibility context */}
      <div className={settings.screenReader ? 'screen-reader-mode' : ''}>
        {children}
      </div>
    </>
  );
}

// Custom hooks for specific accessibility features
export function useScreenReader() {
  const controller = AccessibilityController.getInstance();

  return useCallback((text: string, priority?: 'low' | 'medium' | 'high') => {
    controller.speak(text, priority);
  }, []);
}

export function useARIAAnnouncer() {
  const controller = AccessibilityController.getInstance();

  return useCallback((message: string) => {
    controller.announce(message);
  }, []);
}

// Keyboard shortcuts for the entire app
export function useGlobalKeyboardShortcuts() {
  const [settings] = useAccessibility();

  useEffect(() => {
    if (!settings.keyboardNavigation) return;

    // Global shortcuts
    const shortcuts = {
      // Alt + A: Accessibility menu
      'a': 'accessibility menu',
      // Alt + H: Help
      'h': 'help',
      // Alt + P: Player controls
      'p': 'player',
      // Alt + S: Search
      's': 'search'
    };

    document.addEventListener('keydown', (e) => {
      if (e.altKey && shortcuts[e.key.toLowerCase()]) {
        e.preventDefault();
        AccessibilityController.getInstance().speak(`Opening ${shortcuts[e.key.toLowerCase()]}`);
      }
    });
  }, [settings.keyboardNavigation]);
}

// CSS for accessibility features (should be added to globals.css)
export const accessibilityCSS = `
/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus indicators */
*:focus-visible {
  outline: 3
