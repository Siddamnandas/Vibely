/**
 * @jest-environment jsdom
 */

import { coverGenerator } from "@/lib/cover-generator";
import { songs, userPhotos } from "@/lib/data";

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Buffer for Node.js environment
if (typeof Buffer === "undefined") {
  global.Buffer = require("buffer").Buffer;
}

describe("AI Cover Generation Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate covers using real AI when user photo is provided", async () => {
    const mockApiResponse = {
      success: true,
      generatedCoverUris: ["data:image/jpeg;base64,mockGeneratedImage123"],
    };

    // Mock image URL fetch
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        blob: () =>
          Promise.resolve({
            type: "image/jpeg",
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: () =>
          Promise.resolve({
            type: "image/jpeg",
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

    const track = songs[0];
    const options = {
      userPhoto: userPhotos[0].url,
      style: "modern" as const,
    };

    const result = await coverGenerator.generateCover(track, options);

    expect(mockFetch).toHaveBeenCalledWith("/api/generate-cover", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: expect.stringContaining(track.title),
    });

    expect(result).toMatchObject({
      trackId: track.id,
      imageUrl: "data:image/jpeg;base64,mockGeneratedImage123",
      userPhoto: userPhotos[0].url,
      style: "modern",
    });
  });

  it("should fall back to mock generation when AI fails", async () => {
    (mockFetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const track = songs[0];
    const options = {
      userPhoto: userPhotos[0].url,
      style: "neon" as const,
    };

    const result = await coverGenerator.generateCover(track, options);

    expect(result.imageUrl).toMatch(/images\.unsplash\.com/);
    expect(result.style).toBe("neon");
  });

  it("should generate multiple variants with different styles", async () => {
    const mockApiResponse = {
      success: true,
      generatedCoverUris: [
        "data:image/jpeg;base64,variant1",
        "data:image/jpeg;base64,variant2",
        "data:image/jpeg;base64,variant3",
      ],
    };

    // Mock all fetch calls for 3 variants (each needs 2 image fetches + 1 API call)
    // Mock image fetches (6 total - 2 per variant)
    for (let i = 0; i < 6; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () =>
          Promise.resolve({
            type: "image/jpeg",
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          }),
      });
    }

    // Mock API calls (3 total - 1 per variant)
    for (let i = 0; i < 3; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });
    }

    const track = songs[1];
    const options = {
      userPhoto: userPhotos[1].url,
    };

    const variants = await coverGenerator.generateVariants(track, options);

    expect(variants).toHaveLength(3);
    expect(variants[0].style).toBe("modern");
    expect(variants[1].style).toBe("neon");
    expect(variants[2].style).toBe("vintage");

    expect(mockFetch).toHaveBeenCalledTimes(9); // 3 variants × (2 image fetches + 1 API call)
  });

  it("should use mock generation when no user photo is provided", async () => {
    const track = songs[2];
    const options = { style: "classic" as const };

    const result = await coverGenerator.generateCover(track, options);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.imageUrl).toMatch(/images\.unsplash\.com/);
    expect(result.userPhoto).toBeUndefined();
  });
});
