/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import GeneratorPage from "@/app/(app)/generator/page";

// Mock all the services
jest.mock("@/hooks/use-spotify-auth");
jest.mock("@/hooks/use-music-data");
jest.mock("@/lib/cover-generator");
jest.mock("@/lib/analytics");
jest.mock("@/lib/sharing");
jest.mock("@/lib/push-notifications");

import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { useMusicData } from "@/hooks/use-music-data";
import { coverGenerator } from "@/lib/cover-generator";
import { analyticsService } from "@/lib/analytics";
import { sharingService } from "@/lib/sharing";
import { pushNotificationService } from "@/lib/push-notifications";

const mockUseSpotifyAuth = useSpotifyAuth as jest.MockedFunction<typeof useSpotifyAuth>;
const mockUseMusicData = useMusicData as jest.MockedFunction<typeof useMusicData>;
const mockCoverGenerator = coverGenerator as jest.Mocked<typeof coverGenerator>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;
const mockSharingService = sharingService as jest.Mocked<typeof sharingService>;
const mockPushNotificationService = pushNotificationService as jest.Mocked<
  typeof pushNotificationService
>;

// Mock toast
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock fetch
global.fetch = jest.fn();

const mockTracks = [
  {
    id: "1",
    title: "Test Song",
    artist: "Test Artist",
    originalCoverUrl: "https://example.com/cover1.jpg",
    mood: "Happy" as const,
    tempo: 120,
    energy: 0.8,
  },
  {
    id: "2",
    title: "Another Song",
    artist: "Another Artist",
    originalCoverUrl: "https://example.com/cover2.jpg",
    mood: "Energetic" as const,
    tempo: 128,
    energy: 0.9,
  },
];

const mockGeneratedCovers = [
  {
    id: "cover_1_123",
    trackId: "1",
    imageUrl: "data:image/jpeg;base64,generatedcover1",
    template: {
      id: "modern",
      name: "Modern",
      style: "modern" as const,
      layout: {
        titlePosition: { x: 0.1, y: 0.1 },
        artistPosition: { x: 0.1, y: 0.9 },
        imageArea: { x: 0, y: 0, width: 1, height: 1 },
      },
      textStyles: {
        titleFont: "Inter",
        titleSize: 32,
        titleColor: "#FFFFFF",
        titleWeight: "bold" as const,
        artistFont: "Inter",
        artistSize: 18,
        artistColor: "#CCCCCC",
        artistWeight: "normal" as const,
      },
      effects: {
        hasGradient: true,
        gradientColors: ["#9FFFA2", "#FF6F91"] as [string, string],
        hasOverlay: true,
        overlayColor: "#000000",
        overlayOpacity: 0.4,
        hasBlur: false,
      },
    },
    userPhoto: "https://example.com/user-photo.jpg",
    generatedAt: new Date(),
    style: "modern",
    mood: "happy",
  },
];

describe("End-to-End Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseSpotifyAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      userProfile: { id: "user123", display_name: "Test User" },
      login: jest.fn(),
      logout: jest.fn(),
      handleAuthCallback: jest.fn(),
      checkAuthStatus: jest.fn(),
    });

    mockUseMusicData.mockReturnValue({
      tracks: mockTracks,
      isLoading: false,
      error: null,
      refreshTracks: jest.fn(),
    });

    mockCoverGenerator.generateVariants.mockResolvedValue(mockGeneratedCovers);
    mockAnalyticsService.track.mockReturnValue(undefined);
    mockSharingService.share.mockResolvedValue(true);
    mockPushNotificationService.showNotification.mockResolvedValue(true);
  });

  it("should complete full workflow: load tracks -> generate covers -> share", async () => {
    render(<GeneratorPage />);

    // 1. Verify tracks are loaded
    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
      expect(screen.getByText("Test Artist")).toBeInTheDocument();
    });

    // 2. Select a style
    const modernStyleButton = screen.getByRole("button", { name: /modern/i });
    fireEvent.click(modernStyleButton);

    // 3. Click generate button
    const generateButton = screen.getByRole("button", { name: /generate/i });

    await act(async () => {
      fireEvent.click(generateButton);
    });

    // 4. Verify cover generation was called
    expect(mockCoverGenerator.generateVariants).toHaveBeenCalledWith(
      mockTracks[0],
      expect.objectContaining({
        style: "modern",
        colorPalette: "vibrant",
      }),
    );

    // 5. Verify analytics tracking
    expect(mockAnalyticsService.track).toHaveBeenCalledWith(
      "regen_started",
      expect.objectContaining({
        trackId: "1",
        style: "modern",
      }),
    );

    // 6. Wait for covers to appear
    await waitFor(() => {
      expect(screen.getByText(/your generated covers/i)).toBeInTheDocument();
    });

    // 7. Test sharing functionality
    const shareButton = screen.getAllByRole("button", { name: /share/i })[0];

    await act(async () => {
      fireEvent.click(shareButton);
    });

    expect(mockSharingService.share).toHaveBeenCalled();
  });

  it("should handle authentication flow correctly", async () => {
    // Start with unauthenticated state
    mockUseSpotifyAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userProfile: null,
      login: jest.fn(),
      logout: jest.fn(),
      handleAuthCallback: jest.fn(),
      checkAuthStatus: jest.fn(),
    });

    render(<GeneratorPage />);

    // Should show authentication prompt or redirect
    expect(mockUseSpotifyAuth).toHaveBeenCalled();

    // Simulate authentication success
    await act(async () => {
      mockUseSpotifyAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userProfile: { id: "user123", display_name: "Test User" },
        login: jest.fn(),
        logout: jest.fn(),
        handleAuthCallback: jest.fn(),
        checkAuthStatus: jest.fn(),
      });
    });
  });

  it("should handle API failures gracefully", async () => {
    // Mock API failure
    mockCoverGenerator.generateVariants.mockRejectedValue(new Error("API Error"));

    render(<GeneratorPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });

    const generateButton = screen.getByRole("button", { name: /generate/i });

    await act(async () => {
      fireEvent.click(generateButton);
    });

    // Should handle error gracefully without crashing
    await waitFor(() => {
      expect(mockCoverGenerator.generateVariants).toHaveBeenCalled();
    });
  });

  it("should track user interactions with analytics", async () => {
    render(<GeneratorPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });

    // Track style selection
    const neonStyleButton = screen.getByRole("button", { name: /neon/i });
    fireEvent.click(neonStyleButton);

    // Track shuffle action
    const shuffleButton = screen.getByRole("button", { name: /shuffle/i });
    fireEvent.click(shuffleButton);

    expect(mockAnalyticsService.track).toHaveBeenCalledWith(
      "user_interaction",
      expect.objectContaining({
        action: "style_selected",
        style: "neon",
      }),
    );
  });

  it("should handle offline mode gracefully", async () => {
    // Mock offline status
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });

    render(<GeneratorPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });

    const generateButton = screen.getByRole("button", { name: /generate/i });
    fireEvent.click(generateButton);

    // Should show offline message and prevent generation
    await waitFor(() => {
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
    });
  });

  it("should handle real-time notifications for completed generations", async () => {
    render(<GeneratorPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });

    // Simulate cover generation completion
    await act(async () => {
      const generateButton = screen.getByRole("button", { name: /generate/i });
      fireEvent.click(generateButton);
    });

    // Verify notification was sent
    expect(mockPushNotificationService.showNotification).toHaveBeenCalledWith({
      title: "Cover Generation Complete! ✨",
      body: expect.stringContaining("Test Song"),
      icon: "/icon-192x192.png",
      data: expect.objectContaining({
        type: "cover_ready",
        trackId: "1",
      }),
    });
  });

  it("should validate all integrations work together", async () => {
    render(<GeneratorPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });

    // Complete workflow
    await act(async () => {
      // Select style
      const styleButton = screen.getByRole("button", { name: /modern/i });
      fireEvent.click(styleButton);

      // Generate covers
      const generateButton = screen.getByRole("button", { name: /generate/i });
      fireEvent.click(generateButton);
    });

    // Verify all services were called
    expect(mockUseMusicData).toHaveBeenCalled();
    expect(mockCoverGenerator.generateVariants).toHaveBeenCalled();
    expect(mockAnalyticsService.track).toHaveBeenCalled();

    // Verify UI updates
    await waitFor(() => {
      expect(screen.getByText(/your generated covers/i)).toBeInTheDocument();
    });

    // Test save functionality
    const saveButton = screen.getAllByRole("button", { name: /save/i })[0];
    if (saveButton) {
      fireEvent.click(saveButton);
    }

    // Verify completion
    expect(mockPushNotificationService.showNotification).toHaveBeenCalled();
  });

  it("should handle subscription limits correctly", async () => {
    // Mock freemium user at limit
    const mockUser = {
      id: "user123",
      subscriptionTier: "freemium",
      coversGeneratedThisMonth: 3,
    };

    // Mock subscription check
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      json: () =>
        Promise.resolve({
          error: "Monthly limit reached",
          upgradeRequired: true,
        }),
    });

    render(<GeneratorPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Song")).toBeInTheDocument();
    });

    const generateButton = screen.getByRole("button", { name: /generate/i });
    fireEvent.click(generateButton);

    // Should show upgrade prompt
    await waitFor(() => {
      expect(screen.getByText(/upgrade/i)).toBeInTheDocument();
    });
  });
});
