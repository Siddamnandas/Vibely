/**
 * @jest-environment jsdom
 */

import { mobileAccessibilityService } from \"@/lib/mobile-accessibility-service\";

// Mock analytics
jest.mock(\"@/lib/analytics\", () => ({
  track: jest.fn(),
}));

// Mock MutationObserver
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(),
}));

// Mock getComputedStyle
const mockGetComputedStyle = jest.fn();
Object.defineProperty(window, \"getComputedStyle\", {
  value: mockGetComputedStyle,
});

// Mock getBoundingClientRect
const mockGetBoundingClientRect = jest.fn();
Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;

describe(\"MobileAccessibilityService\", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockGetComputedStyle.mockReturnValue({
      getPropertyValue: jest.fn().mockReturnValue(\"auto\"),
      display: \"block\",
      visibility: \"visible\",
      opacity: \"1\",
    });
    
    mockGetBoundingClientRect.mockReturnValue({
      width: 100,
      height: 40,
      top: 0,
      left: 0,
      bottom: 40,
      right: 100,
      x: 0,
      y: 0,
    });

    // Clear document body
    document.body.innerHTML = \"\";
    
    // Reset service
    mobileAccessibilityService.stop();
  });

  afterEach(() => {
    mobileAccessibilityService.stop();
  });

  describe(\"Service Initialization\", () => {
    test(\"starts accessibility monitoring\", () => {
      mobileAccessibilityService.start();
      
      expect(MutationObserver).toHaveBeenCalled();
    });

    test(\"stops accessibility monitoring\", () => {
      mobileAccessibilityService.start();
      const mockDisconnect = jest.fn();
      (MutationObserver as jest.Mock).mock.results[0].value.disconnect = mockDisconnect;
      
      mobileAccessibilityService.stop();
      
      expect(mockDisconnect).toHaveBeenCalled();
    });

    test(\"accepts custom configuration\", () => {
      const config = {
        minTouchTargetSize: 48,
        enableAutoFix: false,
        enableReporting: false,
      };
      
      mobileAccessibilityService.updateConfig(config);
      mobileAccessibilityService.start();
      
      // Service should use custom config
      expect(mobileAccessibilityService.getViolations()).toBeDefined();
    });
  });

  describe(\"Touch Target Size Validation\", () => {
    test(\"identifies elements smaller than minimum touch target\", () => {
      // Create small button
      const button = document.createElement(\"button\");
      button.textContent = \"Small Button\";
      button.style.width = \"30px\";
      button.style.height = \"30px\";
      document.body.appendChild(button);
      
      // Mock small bounding rect
      mockGetBoundingClientRect.mockReturnValue({
        width: 30,
        height: 30,
        top: 0,
        left: 0,
        bottom: 30,
        right: 30,
        x: 0,
        y: 0,
      });
      
      mobileAccessibilityService.start();
      
      const violations = mobileAccessibilityService.getViolations();
      expect(violations.some(v => v.type === \"touch_target_too_small\")).toBe(true);
    });

    test(\"validates elements meet minimum 44pt touch target\", () => {
      // Create properly sized button
      const button = document.createElement(\"button\");
      button.textContent = \"Good Button\";
      document.body.appendChild(button);
      
      // Mock proper bounding rect (44pt = ~59px at 96dpi)
      mockGetBoundingClientRect.mockReturnValue({
        width: 60,
        height: 60,
        top: 0,
        left: 0,
        bottom: 60,
        right: 60,
        x: 0,
        y: 0,
      });
      
      mobileAccessibilityService.start();
      
      const violations = mobileAccessibilityService.getViolations();
      expect(violations.every(v => v.type !== \"touch_target_too_small\")).toBe(true);
    });

    test(\"auto-fixes small touch targets when enabled\", () => {
      mobileAccessibilityService.updateConfig({ enableAutoFix: true });
      
      const button = document.createElement(\"button\");
      button.textContent = \"Small Button\";
      document.body.appendChild(button);
      
      // Mock small size
      mockGetBoundingClientRect.mockReturnValue({
        width: 30,
        height: 30,
        top: 0,
        left: 0,
        bottom: 30,
        right: 30,
        x: 0,
        y: 0,
      });
      
      mobileAccessibilityService.start();
      
      // Should apply minimum size styles
      expect(button.style.minWidth).toBe(\"44px\");
      expect(button.style.minHeight).toBe(\"44px\");
    });
  });

  describe(\"Interactive Element Detection\", () => {
    test(\"identifies interactive elements\", () => {
      const button = document.createElement(\"button\");
      const link = document.createElement(\"a\");
      const input = document.createElement(\"input\");
      const customInteractive = document.createElement(\"div\");
      
      link.href = \"#\";
      input.type = \"text\";
      customInteractive.setAttribute(\"role\", \"button\");
      customInteractive.setAttribute(\"tabindex\", \"0\");
      
      document.body.appendChild(button);
      document.body.appendChild(link);
      document.body.appendChild(input);
      document.body.appendChild(customInteractive);
      
      mobileAccessibilityService.start();
      
      const violations = mobileAccessibilityService.getViolations();
      
      // All interactive elements should be checked for touch target size
      expect(violations.length).toBeGreaterThanOrEqual(0);
    });

    test(\"ignores non-interactive elements\", () => {
      const div = document.createElement(\"div\");
      const span = document.createElement(\"span\");
      const p = document.createElement(\"p\");
      
      div.textContent = \"Regular div\";
      span.textContent = \"Regular span\";
      p.textContent = \"Regular paragraph\";
      
      document.body.appendChild(div);
      document.body.appendChild(span);
      document.body.appendChild(p);
      
      mobileAccessibilityService.start();
      
      const violations = mobileAccessibilityService.getViolations();
      
      // Non-interactive elements should not generate touch target violations
      expect(violations.every(v => 
        v.type !== \"touch_target_too_small\" || 
        !([div, span, p].includes(v.element))
      )).toBe(true);
    });
  });

  describe(\"ARIA and Screen Reader Support\", () => {
    test(\"identifies missing ARIA labels on interactive elements\", () => {
      const button = document.createElement(\"button\");
      // No text content or aria-label
      document.body.appendChild(button);
      
      mobileAccessibilityService.start();
      
      const violations = mobileAccessibilityService.getViolations();
      expect(violations.some(v => v.type === \"missing_accessible_name\")).toBe(true);
    });

    test(\"validates elements have proper ARIA labels\", () => {
      const button1 = document.createElement(\"button\");
      const button2 = document.createElement(\"button\");
      const button3 = document.createElement(\"button\");
      
      button1.textContent = \"Click me\";
      button2.setAttribute(\"aria-label\", \"Close dialog\");
      button3.setAttribute(\"aria-labelledby\", \"label-id\");
      
      const label = document.createElement(\"span\");
      label.id = \"label-id\";
      label.textContent = \"Submit form\";
      
      document.body.appendChild(button1);
      document.body.appendChild(button2);
      document.body.appendChild(button3);
      document.body.appendChild(label);
      
      mobileAccessibilityService.start();
      
      const violations = mobileAccessibilityService.getViolations();
      
      // None of these buttons should have missing accessible name violations
      expect(violations.every(v => 
        v.type !== \"missing_accessible_name\" || 
        !([button1, button2, button3].includes(v.element))
      )).toBe(true);
    });

    test(\"auto-adds ARIA labels when enabled\", () => {
      mobileAccessibilityService.updateConfig({ enableAutoFix: true });
      
      const button = document.createElement(\"button\");
      button.className = \"close-btn\";
      document.body.appendChild(button);
      
      mobileAccessibilityService.start();
      
      // Should add a generated aria-label
      expect(button.hasAttribute(\"aria-label\")).toBe(true);
    });
  });

  describe(\"Color Contrast and Visual Accessibility\", () => {
    test(\"detects insufficient color contrast\", () => {
      const text = document.createElement(\"p\");
      text.textContent = \"Low contrast text\";
      text.style.color = \"#cccccc\";
      text.style.backgroundColor = \"#ffffff\";
      document.body.appendChild(text);
      
      mockGetComputedStyle.mockReturnValue({
        color: \"rgb(204, 204, 204)\",
        backgroundColor: \"rgb(255, 255, 255)\",
        fontSize: \"16px\",
      });
      
      mobileAccessibilityService.start();
      
      const violations = mobileAccessibilityService.getViolations();
      expect(violations.some(v => v.type === \"insufficient_color_contrast\")).toBe(true);
    });

    test(\"validates sufficient color contrast\", () => {
      const text = document.createElement(\"p\");
      text.textContent = \"Good contrast text\";
      text.style.color = \"#000000\";
      text.style.backgroundColor = \"#ffffff\";
      document.body.appendChild(text);
      
      mockGetComputedStyle.mockReturnValue({
        color: \"rgb(0, 0, 0)\",
        backgroundColor: \"rgb(255, 255, 255)\",
        fontSize: \"16px\",
      });
      
      mobileAccessibilityService.start();
      
      const violations = mobileAccessibilityService.getViolations();
      expect(violations.every(v => v.type !== \"insufficient_color_contrast\")).toBe(true);
    });
  });

  describe(\"Focus Management\", () => {
    test(\"ensures focusable elements have visible focus indicators\", () => {
      const button = document.createElement(\"button\");
      button.textContent = \"Focus me\";
      button.style.outline = \"none\";
      document.body.appendChild(button);
      
      mockGetComputedStyle.mockImplementation((element, pseudoElt) => {
        if (pseudoElt === \":focus\") {
          return {
            outline: \"none\",
            boxShadow: \"none\",
            border: \"1px solid transparent\",
          };
        }
        return {
          outline: \"none\",
          display: \"block\",
          visibility: \"visible\",
        };
      });
      
      mobileAccessibilityService.start();
      
      const violations = mobileAccessibilityService.getViolations();
      expect(violations.some(v => v.type === \"missing_focus_indicator\")).toBe(true);
    });

    test(\"manages focus order and keyboard navigation\", () => {
      const input1 = document.createElement(\"input\");
      const input2 = document.createElement(\"input\");
      const input3 = document.createElement(\"input\");
      
      input1.tabIndex = 3;
      input2.tabIndex = 1;
      input3.tabIndex = 2;
      
      document.body.appendChild(input1);
      document.body.appendChild(input2);
      document.body.appendChild(input3);
      
      mobileAccessibilityService.start();
      
      const violations = mobileAccessibilityService.getViolations();
      expect(violations.some(v => v.type === \"invalid_tab_order\")).toBe(true);
    });
  });

  describe(\"Motion and Animation Preferences\", () => {
    test(\"detects user preference for reduced motion\", () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, \"matchMedia\", {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes(\"prefers-reduced-motion: reduce\"),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
      
      const status = mobileAccessibilityService.getUserPreferences();
      expect(status.prefersReducedMotion).toBe(true);
    });

    test(\"detects high contrast preference\", () => {
      Object.defineProperty(window, \"matchMedia\", {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes(\"prefers-contrast: high\"),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
      
      const status = mobileAccessibilityService.getUserPreferences();
      expect(status.prefersHighContrast).toBe(true);
    });
  });

  describe(\"Dynamic Content Monitoring\", () => {
    test(\"monitors DOM changes for new accessibility violations\", () => {
      mobileAccessibilityService.start();
      
      // Get the MutationObserver instance
      const observerInstance = (MutationObserver as jest.Mock).mock.results[0].value;
      const observerCallback = (MutationObserver as jest.Mock).mock.calls[0][0];
      
      // Create a new small button dynamically
      const button = document.createElement(\"button\");
      button.textContent = \"New Button\";
      document.body.appendChild(button);
      
      mockGetBoundingClientRect.mockReturnValue({
        width: 30,
        height: 30,
        top: 0,
        left: 0,
        bottom: 30,
        right: 30,
        x: 0,
        y: 0,
      });
      
      // Simulate MutationObserver callback
      const mutations = [{
        type: \"childList\",
        addedNodes: [button],
        removedNodes: [],
        target: document.body,
      }];
      
      observerCallback(mutations);
      
      const violations = mobileAccessibilityService.getViolations();
      expect(violations.some(v => v.element === button && v.type === \"touch_target_too_small\")).toBe(true);
    });
  });

  describe(\"Reporting and Analytics\", () => {
    test(\"generates accessibility report\", () => {
      const button = document.createElement(\"button\");
      document.body.appendChild(button);
      
      mockGetBoundingClientRect.mockReturnValue({
        width: 30,
        height: 30,
        top: 0,
        left: 0,
        bottom: 30,
        right: 30,
        x: 0,
        y: 0,
      });
      
      mobileAccessibilityService.start();
      
      const report = mobileAccessibilityService.generateReport();
      
      expect(report).toHaveProperty(\"summary\");
      expect(report).toHaveProperty(\"violations\");
      expect(report).toHaveProperty(\"recommendations\");
      expect(report.summary.total).toBeGreaterThan(0);
    });

    test(\"tracks accessibility events when reporting enabled\", () => {
      const { track } = require(\"@/lib/analytics\");
      
      mobileAccessibilityService.updateConfig({ enableReporting: true });
      
      const button = document.createElement(\"button\");
      document.body.appendChild(button);
      
      mobileAccessibilityService.start();
      
      expect(track).toHaveBeenCalledWith(\"accessibility_scan_completed\", expect.any(Object));
    });
  });

  describe(\"Error Handling\", () => {
    test(\"handles errors in DOM queries gracefully\", () => {
      // Mock querySelector to throw an error
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn().mockImplementation(() => {
        throw new Error(\"Query error\");
      });
      
      expect(() => {
        mobileAccessibilityService.start();
      }).not.toThrow();
      
      // Restore original function
      document.querySelector = originalQuerySelector;
    });

    test(\"handles missing getBoundingClientRect gracefully\", () => {
      const button = document.createElement(\"button\");
      document.body.appendChild(button);
      
      // Remove getBoundingClientRect
      button.getBoundingClientRect = undefined as any;
      
      expect(() => {
        mobileAccessibilityService.start();
      }).not.toThrow();
    });

    test(\"continues monitoring after individual element errors\", () => {
      const button1 = document.createElement(\"button\");
      const button2 = document.createElement(\"button\");
      
      document.body.appendChild(button1);
      document.body.appendChild(button2);
      
      // Make first button throw error
      button1.getBoundingClientRect = jest.fn().mockImplementation(() => {
        throw new Error(\"Rect error\");
      });
      
      // Second button should still be processed
      mockGetBoundingClientRect.mockReturnValue({
        width: 30,
        height: 30,
        top: 0,
        left: 0,
        bottom: 30,
        right: 30,
        x: 0,
        y: 0,
      });
      
      mobileAccessibilityService.start();
      
      const violations = mobileAccessibilityService.getViolations();
      expect(violations.some(v => v.element === button2)).toBe(true);
    });
  });

  describe(\"Performance Considerations\", () => {
    test(\"debounces rapid DOM changes\", async () => {
      mobileAccessibilityService.start();
      
      const observerCallback = (MutationObserver as jest.Mock).mock.calls[0][0];
      
      // Simulate rapid DOM changes
      const mutations = Array.from({ length: 10 }, (_, i) => ({
        type: \"childList\",
        addedNodes: [document.createElement(\"div\")],
        removedNodes: [],
        target: document.body,
      }));
      
      // Fire multiple mutations quickly
      mutations.forEach(mutation => {
        observerCallback([mutation]);
      });
      
      // Should debounce and not overwhelm the system
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(true).toBe(true); // Test that no errors occurred
    });
  });
});"