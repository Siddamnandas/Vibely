/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { useOrientation, useResponsiveDesign, useMiniPlayerResponsive } from "../use-orientation";
import { mobileOrientationService } from "@/lib/mobile-orientation-service";

// Mock the mobile orientation service
jest.mock("@/lib/mobile-orientation-service", () => ({
  mobileOrientationService: {
    getState: jest.fn(),
    onOrientationChange: jest.fn(),
    isPortrait: jest.fn(),
    isLandscape: jest.fn(),
    updateConfig: jest.fn(),
    forceRefresh: jest.fn(),
    getOptimalMiniPlayerSize: jest.fn(),
    getOrientationCSS: jest.fn(),
  },
}));

const mockOrientationService = mobileOrientationService as jest.Mocked<
  typeof mobileOrientationService
>;

// Default mock state
const mockPortraitState = {
  orientation: "portrait" as const,
  angle: 0,
  isSupported: true,
  screenWidth: 375,
  screenHeight: 667,
  availableWidth: 375,
  availableHeight: 667,
  safeAreaInsets: {
    top: 44,
    right: 0,
    bottom: 34,
    left: 0,
  },
};

const mockLandscapeState = {
  ...mockPortraitState,
  orientation: "landscape" as const,
  angle: 90,
  availableWidth: 667,
  availableHeight: 375,
};

describe("useOrientation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrientationService.getState.mockReturnValue(mockPortraitState);
    mockOrientationService.isPortrait.mockReturnValue(true);
    mockOrientationService.isLandscape.mockReturnValue(false);
    mockOrientationService.onOrientationChange.mockReturnValue(jest.fn());
  });

  test("returns initial orientation state", () => {
    const { result } = renderHook(() => useOrientation());

    expect(result.current.orientation).toBe("portrait");
    expect(result.current.availableWidth).toBe(375);
    expect(result.current.availableHeight).toBe(667);
    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isLandscape).toBe(false);
  });

  test("updates config when provided", () => {
    const config = {
      enableLayoutOptimization: false,
      trackOrientationChanges: false,
    };

    renderHook(() => useOrientation(config));

    expect(mockOrientationService.updateConfig).toHaveBeenCalledWith(config);
  });

  test("subscribes to orientation changes", () => {
    renderHook(() => useOrientation());

    expect(mockOrientationService.onOrientationChange).toHaveBeenCalled();
  });

  test("unsubscribes on unmount", () => {
    const unsubscribe = jest.fn();
    mockOrientationService.onOrientationChange.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useOrientation());

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  test("updates state when orientation changes", () => {
    let orientationCallback: (state: any) => void = () => {};
    mockOrientationService.onOrientationChange.mockImplementation((callback) => {
      orientationCallback = callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useOrientation());

    expect(result.current.orientation).toBe("portrait");

    // Simulate orientation change
    act(() => {
      orientationCallback(mockLandscapeState);
    });

    expect(result.current.orientation).toBe("landscape");
    expect(result.current.availableWidth).toBe(667);
    expect(result.current.availableHeight).toBe(375);
  });

  test("provides utility functions", () => {
    const { result } = renderHook(() => useOrientation());

    expect(typeof result.current.forceRefresh).toBe("function");
    expect(typeof result.current.updateConfig).toBe("function");
    expect(typeof result.current.getOptimalMiniPlayerSize).toBe("function");
    expect(typeof result.current.getOrientationCSS).toBe("function");
  });
});

describe("useResponsiveDesign", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrientationService.getState.mockReturnValue(mockPortraitState);
    mockOrientationService.isPortrait.mockReturnValue(true);
    mockOrientationService.isLandscape.mockReturnValue(false);
    mockOrientationService.onOrientationChange.mockReturnValue(jest.fn());
  });

  test("detects mobile device in portrait", () => {
    const { result } = renderHook(() => useResponsiveDesign());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.breakpoint).toBe("sm-portrait");
  });

  test("detects tablet device in landscape", () => {
    const tabletLandscapeState = {
      ...mockLandscapeState,
      availableWidth: 1024,
      availableHeight: 768,
    };
    mockOrientationService.getState.mockReturnValue(tabletLandscapeState);
    mockOrientationService.isLandscape.mockReturnValue(true);
    mockOrientationService.isPortrait.mockReturnValue(false);

    const { result } = renderHook(() => useResponsiveDesign());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.breakpoint).toBe("lg-landscape");
  });

  test("detects desktop device", () => {
    const desktopState = {
      ...mockPortraitState,
      availableWidth: 1440,
      availableHeight: 900,
    };
    mockOrientationService.getState.mockReturnValue(desktopState);

    const { result } = renderHook(() => useResponsiveDesign());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.breakpoint).toBe("lg-portrait");
  });

  test("calculates responsive spacing", () => {
    const { result } = renderHook(() => useResponsiveDesign());

    // Portrait mode, standard screen
    expect(result.current.getSpacing(16)).toBe(16); // 16 * 1 * 1
  });

  test("calculates responsive spacing for landscape", () => {
    mockOrientationService.getState.mockReturnValue(mockLandscapeState);
    mockOrientationService.isLandscape.mockReturnValue(true);
    mockOrientationService.isPortrait.mockReturnValue(false);

    const { result } = renderHook(() => useResponsiveDesign());

    // Landscape mode should apply 0.75 multiplier
    expect(result.current.getSpacing(16)).toBe(12); // 16 * 0.75 * 1
  });

  test("calculates responsive spacing for small screen", () => {
    const smallScreenState = {
      ...mockPortraitState,
      availableWidth: 320,
    };
    mockOrientationService.getState.mockReturnValue(smallScreenState);

    const { result } = renderHook(() => useResponsiveDesign());

    // Small screen should apply 0.85 multiplier
    expect(result.current.getSpacing(16)).toBe(14); // 16 * 1 * 0.85
  });

  test("detects correct breakpoints for different screen sizes", () => {
    const testCases = [
      { width: 320, orientation: "portrait", expected: "xs-portrait" },
      { width: 375, orientation: "portrait", expected: "sm-portrait" },
      { width: 414, orientation: "portrait", expected: "md-portrait" },
      { width: 800, orientation: "portrait", expected: "lg-portrait" },
      { width: 500, orientation: "landscape", expected: "xs-landscape" },
      { width: 600, orientation: "landscape", expected: "sm-landscape" },
      { width: 800, orientation: "landscape", expected: "md-landscape" },
      { width: 1200, orientation: "landscape", expected: "lg-landscape" },
    ];

    testCases.forEach(({ width, orientation, expected }) => {
      const testState = {
        ...mockPortraitState,
        orientation: orientation as "portrait" | "landscape",
        availableWidth: width,
      };
      mockOrientationService.getState.mockReturnValue(testState);
      mockOrientationService.isLandscape.mockReturnValue(orientation === "landscape");
      mockOrientationService.isPortrait.mockReturnValue(orientation === "portrait");

      const { result } = renderHook(() => useResponsiveDesign());
      expect(result.current.breakpoint).toBe(expected);
    });
  });
});

describe("useMiniPlayerResponsive", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrientationService.getState.mockReturnValue(mockPortraitState);
    mockOrientationService.isPortrait.mockReturnValue(true);
    mockOrientationService.isLandscape.mockReturnValue(false);
    mockOrientationService.onOrientationChange.mockReturnValue(jest.fn());
    mockOrientationService.getOptimalMiniPlayerSize.mockReturnValue({
      width: 343,
      height: 68,
      iconSize: 44,
    });
  });

  test("provides mini-player dimensions for portrait", () => {
    const { result } = renderHook(() => useMiniPlayerResponsive());

    expect(result.current.dimensions).toEqual({
      width: 343,
      height: 68,
      iconSize: 44,
      marginX: 16,
      borderRadius: 20,
      padding: 4,
    });
  });

  test("provides mini-player dimensions for landscape", () => {
    mockOrientationService.getState.mockReturnValue(mockLandscapeState);
    mockOrientationService.isLandscape.mockReturnValue(true);
    mockOrientationService.isPortrait.mockReturnValue(false);
    mockOrientationService.getOptimalMiniPlayerSize.mockReturnValue({
      width: 643,
      height: 56,
      iconSize: 40,
    });

    const { result } = renderHook(() => useMiniPlayerResponsive());

    expect(result.current.dimensions).toEqual({
      width: 643,
      height: 56,
      iconSize: 40,
      marginX: 12,
      borderRadius: 16,
      padding: 2,
    });
  });

  test("provides mini-player dimensions for small screen", () => {
    const smallScreenState = {
      ...mockPortraitState,
      availableWidth: 320,
    };
    mockOrientationService.getState.mockReturnValue(smallScreenState);

    const { result } = renderHook(() => useMiniPlayerResponsive());

    expect(result.current.dimensions.marginX).toBe(12); // Smaller margin for small screens
  });

  test("generates correct player styles", () => {
    const { result } = renderHook(() => useMiniPlayerResponsive());

    expect(result.current.playerStyles).toEqual({
      height: "68px",
      borderRadius: "20px",
      marginLeft: "16px",
      marginRight: "16px",
    });
  });

  test("generates correct icon styles", () => {
    const { result } = renderHook(() => useMiniPlayerResponsive());

    expect(result.current.iconStyles).toEqual({
      width: "44px",
      height: "44px",
    });
  });

  test("provides responsive icon size helper", () => {
    // Portrait mode
    const { result: portraitResult } = renderHook(() => useMiniPlayerResponsive());
    expect(portraitResult.current.getIconSize(18)).toBe(18);

    // Landscape mode
    mockOrientationService.getState.mockReturnValue(mockLandscapeState);
    mockOrientationService.isLandscape.mockReturnValue(true);
    mockOrientationService.isPortrait.mockReturnValue(false);

    const { result: landscapeResult } = renderHook(() => useMiniPlayerResponsive());
    expect(landscapeResult.current.getIconSize(18)).toBe(16); // 18 - 2
    expect(landscapeResult.current.getIconSize(14)).toBe(14); // Min 14
  });

  test("provides responsive animation config", () => {
    const { result } = renderHook(() => useMiniPlayerResponsive());
    const animConfig = result.current.getAnimationConfig();

    expect(animConfig).toEqual({
      initial: { y: 100, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: 100, opacity: 0 },
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    });
  });

  test("provides responsive animation config for landscape", () => {
    mockOrientationService.getState.mockReturnValue(mockLandscapeState);
    mockOrientationService.isLandscape.mockReturnValue(true);
    mockOrientationService.isPortrait.mockReturnValue(false);

    const { result } = renderHook(() => useMiniPlayerResponsive());
    const animConfig = result.current.getAnimationConfig();

    expect(animConfig).toEqual({
      initial: { y: 80, opacity: 0 }, // Smaller y offset
      animate: { y: 0, opacity: 1 },
      exit: { y: 80, opacity: 0 },
      transition: {
        type: "spring",
        stiffness: 350, // Stiffer spring
        damping: 30,
      },
    });
  });

  test("updates configuration with mobile-specific settings", () => {
    renderHook(() => useMiniPlayerResponsive());

    expect(mockOrientationService.updateConfig).toHaveBeenCalledWith({
      enableLayoutOptimization: true,
      trackOrientationChanges: true,
    });
  });
});

// Integration test
describe("Hook Integration", () => {
  test("multiple hooks can be used together without conflicts", () => {
    const { result: orientationResult } = renderHook(() => useOrientation());
    const { result: responsiveResult } = renderHook(() => useResponsiveDesign());
    const { result: miniPlayerResult } = renderHook(() => useMiniPlayerResponsive());

    expect(orientationResult.current.orientation).toBe("portrait");
    expect(responsiveResult.current.breakpoint).toBe("sm-portrait");
    expect(miniPlayerResult.current.dimensions.height).toBe(68);

    // All should share the same base orientation data
    expect(orientationResult.current.availableWidth).toBe(responsiveResult.current.availableWidth);
    expect(responsiveResult.current.orientation).toBe(miniPlayerResult.current.orientation);
  });
});
