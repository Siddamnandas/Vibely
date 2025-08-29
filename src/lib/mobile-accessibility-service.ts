"use client";

import { track as trackEvent } from "@/lib/analytics";

interface AccessibilityConfig {
  minTouchTargetSize: number; // Minimum touch target size in pixels (iOS: 44pt, Android: 48dp)
  enableHighContrast: boolean;
  enableReducedMotion: boolean;
  enableScreenReaderOptimizations: boolean;
  focusRingColor: string;
  textScaling: number;
}

interface AccessibilityViolation {
  element: HTMLElement;
  type: "touch_target_too_small" | "missing_label" | "poor_contrast" | "no_focus_indicator";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  suggestions: string[];
}

interface AccessibilityReport {
  violations: AccessibilityViolation[];
  score: number; // 0-100
  totalElements: number;
  compliantElements: number;
  recommendations: string[];
}

class MobileAccessibilityService {
  private static instance: MobileAccessibilityService;
  private config: AccessibilityConfig;
  private observer: MutationObserver | null = null;
  private violations: AccessibilityViolation[] = [];

  static getInstance(): MobileAccessibilityService {
    if (!MobileAccessibilityService.instance) {
      MobileAccessibilityService.instance = new MobileAccessibilityService();
    }
    return MobileAccessibilityService.instance;
  }

  constructor() {
    this.config = this.getDefaultConfig();
    this.initialize();
  }

  private getDefaultConfig(): AccessibilityConfig {
    // iOS uses 44pt minimum, Android uses 48dp minimum
    // Using 44px as base (iOS standard)
    return {
      minTouchTargetSize: 44,
      enableHighContrast: false,
      enableReducedMotion: this.prefersReducedMotion(),
      enableScreenReaderOptimizations: this.hasScreenReader(),
      focusRingColor: "#007AFF", // iOS blue
      textScaling: 1.0,
    };
  }

  private initialize() {
    this.detectAccessibilityPreferences();
    this.setupEventListeners();
    this.injectAccessibilityStyles();
    this.startDOMMonitoring();

    console.log("♿ Mobile Accessibility Service initialized");
  }

  private detectAccessibilityPreferences() {
    // Detect user preferences
    this.config.enableReducedMotion = this.prefersReducedMotion();
    this.config.enableHighContrast = this.prefersHighContrast();
    
    // Apply preferences
    this.applyAccessibilityPreferences();

    trackEvent("accessibility_preferences_detected", {
      reduced_motion: this.config.enableReducedMotion,
      high_contrast: this.config.enableHighContrast,
      screen_reader: this.config.enableScreenReaderOptimizations,
    });
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private prefersHighContrast(): boolean {
    return window.matchMedia("(prefers-contrast: high)").matches;
  }

  private hasScreenReader(): boolean {
    // Detect screen reader presence
    return !!(
      navigator.userAgent.match(/NVDA|JAWS|VoiceOver|TalkBack/) ||
      window.speechSynthesis?.getVoices().length > 0
    );
  }

  private setupEventListeners() {
    // Listen for preference changes
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
      this.config.enableReducedMotion = e.matches;
      this.applyAccessibilityPreferences();
    });

    window.matchMedia("(prefers-contrast: high)").addEventListener("change", (e) => {
      this.config.enableHighContrast = e.matches;
      this.applyAccessibilityPreferences();
    });

    // Focus management
    document.addEventListener("focusin", this.handleFocusIn.bind(this));
    document.addEventListener("focusout", this.handleFocusOut.bind(this));

    // Touch target validation on interaction
    document.addEventListener("touchstart", this.validateTouchTarget.bind(this), { passive: true });
    document.addEventListener("click", this.validateClickTarget.bind(this), { passive: true });
  }

  private injectAccessibilityStyles() {
    const styleId = "mobile-accessibility-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      /* Enhanced focus indicators */
      .a11y-enhanced-focus:focus {
        outline: 2px solid ${this.config.focusRingColor} !important;
        outline-offset: 2px !important;
        border-radius: 4px !important;
      }

      /* Touch target minimum sizes */
      .a11y-touch-target {
        min-width: ${this.config.minTouchTargetSize}px !important;
        min-height: ${this.config.minTouchTargetSize}px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      /* High contrast mode */
      .a11y-high-contrast {
        filter: contrast(2) !important;
      }

      /* Reduced motion */
      .a11y-reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }

      /* Screen reader optimizations */
      .a11y-sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }

      /* Skip links */
      .a11y-skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: ${this.config.focusRingColor};
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 1000;
        transition: top 0.3s;
      }

      .a11y-skip-link:focus {
        top: 6px;
      }
    `;

    document.head.appendChild(style);
  }

  private applyAccessibilityPreferences() {
    const body = document.body;
    
    // Apply reduced motion
    if (this.config.enableReducedMotion) {
      body.classList.add("a11y-reduced-motion");
    } else {
      body.classList.remove("a11y-reduced-motion");
    }

    // Apply high contrast
    if (this.config.enableHighContrast) {
      body.classList.add("a11y-high-contrast");
    } else {
      body.classList.remove("a11y-high-contrast");
    }

    // Text scaling
    if (this.config.textScaling !== 1.0) {
      body.style.fontSize = `${this.config.textScaling * 100}%`;
    }
  }

  private startDOMMonitoring() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.enhanceElementAccessibility(node as HTMLElement);
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial scan
    this.scanDocumentAccessibility();
  }

  private enhanceElementAccessibility(element: HTMLElement) {
    // Enhance interactive elements
    if (this.isInteractiveElement(element)) {
      this.enhanceInteractiveElement(element);
    }

    // Scan child elements
    element.querySelectorAll("button, a, input, [role='button'], [tabindex]").forEach((el) => {
      this.enhanceInteractiveElement(el as HTMLElement);
    });
  }

  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ["button", "a", "input", "select", "textarea"];
    const interactiveRoles = ["button", "link", "tab", "menuitem"];
    
    return (
      interactiveTags.includes(element.tagName.toLowerCase()) ||
      interactiveRoles.includes(element.getAttribute("role") || "") ||
      element.hasAttribute("tabindex") ||
      element.onclick !== null
    );
  }

  private enhanceInteractiveElement(element: HTMLElement) {
    // Ensure minimum touch target size
    this.ensureMinimumTouchTarget(element);
    
    // Enhance focus indicator
    element.classList.add("a11y-enhanced-focus");
    
    // Ensure proper ARIA labels
    this.ensureProperLabeling(element);
    
    // Ensure keyboard accessibility
    this.ensureKeyboardAccessibility(element);
  }

  private ensureMinimumTouchTarget(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const isSmall = rect.width < this.config.minTouchTargetSize || 
                   rect.height < this.config.minTouchTargetSize;

    if (isSmall) {
      element.classList.add("a11y-touch-target");
      
      // Log violation
      this.violations.push({
        element,
        type: "touch_target_too_small",
        severity: "medium",
        message: `Touch target is ${Math.round(rect.width)}×${Math.round(rect.height)}px, minimum is ${this.config.minTouchTargetSize}×${this.config.minTouchTargetSize}px`,
        suggestions: [
          "Increase padding around the element",
          "Add min-width and min-height CSS properties",
          "Consider using a larger icon or text"
        ]
      });
    }
  }

  private ensureProperLabeling(element: HTMLElement) {
    const hasLabel = element.getAttribute("aria-label") ||
                    element.getAttribute("aria-labelledby") ||
                    element.title ||
                    element.textContent?.trim();

    if (!hasLabel) {
      this.violations.push({
        element,
        type: "missing_label",
        severity: "high",
        message: "Interactive element lacks accessible label",
        suggestions: [
          "Add aria-label attribute",
          "Add descriptive text content",
          "Use aria-labelledby to reference a label element",
          "Add title attribute for additional context"
        ]
      });
    }
  }

  private ensureKeyboardAccessibility(element: HTMLElement) {
    // Ensure focusable elements have tabindex
    if (this.isInteractiveElement(element) && !element.hasAttribute("tabindex")) {
      if (element.tagName.toLowerCase() === "div" || 
          element.tagName.toLowerCase() === "span") {
        element.setAttribute("tabindex", "0");
      }
    }

    // Add keyboard event handlers if missing
    if (!element.onkeydown && element.onclick) {
      element.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          element.click();
        }
      });
    }
  }

  private handleFocusIn(event: FocusEvent) {
    const target = event.target as HTMLElement;
    if (target) {
      // Announce focus to screen readers
      if (this.config.enableScreenReaderOptimizations) {
        this.announceToScreenReader(`Focused on ${this.getElementDescription(target)}`);
      }
    }
  }

  private handleFocusOut(event: FocusEvent) {
    // Clean up any temporary focus indicators
  }

  private validateTouchTarget(event: TouchEvent) {
    const target = event.target as HTMLElement;
    if (this.isInteractiveElement(target)) {
      const rect = target.getBoundingClientRect();
      const isCompliant = rect.width >= this.config.minTouchTargetSize && 
                         rect.height >= this.config.minTouchTargetSize;

      if (!isCompliant) {
        trackEvent("accessibility_violation_touch_target", {
          element_tag: target.tagName.toLowerCase(),
          actual_width: rect.width,
          actual_height: rect.height,
          minimum_size: this.config.minTouchTargetSize,
        });
      }
    }
  }

  private validateClickTarget(event: MouseEvent) {
    // Similar validation for mouse clicks
    this.validateTouchTarget(event as any);
  }

  private getElementDescription(element: HTMLElement): string {
    return element.getAttribute("aria-label") ||
           element.title ||
           element.textContent?.trim() ||
           `${element.tagName.toLowerCase()} element`;
  }

  private announceToScreenReader(message: string) {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "a11y-sr-only";
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Public API methods
  scanDocumentAccessibility(): AccessibilityReport {
    this.violations = [];
    const allInteractiveElements = document.querySelectorAll(
      "button, a, input, select, textarea, [role='button'], [tabindex], [onclick]"
    );

    allInteractiveElements.forEach((element) => {
      this.enhanceElementAccessibility(element as HTMLElement);
    });

    const score = Math.max(0, 100 - (this.violations.length * 5));
    
    const report: AccessibilityReport = {
      violations: this.violations,
      score,
      totalElements: allInteractiveElements.length,
      compliantElements: allInteractiveElements.length - this.violations.length,
      recommendations: this.generateRecommendations(),
    };

    trackEvent("accessibility_scan_completed", {
      total_elements: report.totalElements,
      violations_count: report.violations.length,
      accessibility_score: report.score,
    });

    return report;
  }

  private generateRecommendations(): string[] {
    const recommendations = [
      "Ensure all interactive elements meet minimum touch target size (44×44px)",
      "Provide meaningful labels for all interactive elements",
      "Use high contrast colors for better visibility",
      "Test with screen readers and keyboard navigation",
      "Consider user preferences for reduced motion and high contrast",
    ];

    if (this.violations.some(v => v.type === "touch_target_too_small")) {
      recommendations.push("Increase padding or size of small touch targets");
    }

    if (this.violations.some(v => v.type === "missing_label")) {
      recommendations.push("Add aria-label or descriptive text to unlabeled elements");
    }

    return recommendations;
  }

  updateConfig(newConfig: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.applyAccessibilityPreferences();
    
    trackEvent("accessibility_config_updated", newConfig);
  }

  enableAccessibilityMode(enabled: boolean): void {
    if (enabled) {
      this.config.enableScreenReaderOptimizations = true;
      this.config.minTouchTargetSize = Math.max(this.config.minTouchTargetSize, 48);
      this.scanDocumentAccessibility();
    }
    
    trackEvent("accessibility_mode_toggled", { enabled });
  }

  addSkipLink(targetId: string, label: string): void {
    const skipLink = document.createElement("a");
    skipLink.href = `#${targetId}`;
    skipLink.className = "a11y-skip-link";
    skipLink.textContent = label;
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  getViolations(): AccessibilityViolation[] {
    return [...this.violations];
  }

  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    const style = document.getElementById("mobile-accessibility-styles");
    if (style) {
      style.remove();
    }
  }
}

// Export singleton instance
export const mobileAccessibilityService = MobileAccessibilityService.getInstance();

export type { AccessibilityConfig, AccessibilityViolation, AccessibilityReport };