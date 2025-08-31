/**
 * Photo Selection Integration Test
 *
 * This test verifies that the photo selection feature for AI cover regeneration
 * is properly integrated into the regen store and context.
 */

// Import the core functionality we want to test
import { startJob } from "../src/lib/server/regen-store";

// We'll create a simple test that doesn't rely on complex mocking
describe("Photo Selection Integration", () => {
  // Simple test data
  const mockPlaylistId = "test-playlist-1";
  const mockTrackIds = ["track-1", "track-2"];
  const mockCurrentCovers = { "track-1": "http://example.com/cover1.jpg" };
  const mockPhotoDataUri =
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAeEAABAwUBAQEAAAAAAAAAAAABAAIRIQMSUWGBkf/EABUBAQEAAAAAAAAAAAAAAAAAAAQF/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEh/9oADAMBAAIRAxEAPwCdABmXsVqNs2y//9k=";

  it("should accept photoDataUri parameter in startJob function", () => {
    // This test verifies that our modified startJob function accepts the new photoDataUri parameter
    const job = startJob(mockPlaylistId, mockTrackIds, mockCurrentCovers, mockPhotoDataUri);

    // Verify that the job object contains the photoDataUri
    expect(job).toHaveProperty("playlistId", mockPlaylistId);
    expect(job).toHaveProperty("photoDataUri", mockPhotoDataUri);
  });

  it("should work without photoDataUri parameter for backward compatibility", () => {
    // This test verifies that our modification maintains backward compatibility
    const job = startJob(mockPlaylistId, mockTrackIds, mockCurrentCovers);

    // Verify that the job object is created correctly without photoDataUri
    expect(job).toHaveProperty("playlistId", mockPlaylistId);
    expect(job).not.toHaveProperty("photoDataUri");
  });
});
