/**
 * Regen Store Unit Tests
 */

import { startJob } from "../src/lib/server/regen-store";
import { songs } from "../src/lib/data";

describe("Regen Store", () => {
  it("should create a job with photoDataUri", () => {
    const playlistId = "test-playlist-1";
    const trackIds = [songs[0].id];
    const currentCovers = { [songs[0].id]: songs[0].originalCoverUrl };
    const photoDataUri = "data:image/jpeg;base64,testPhoto123";

    const job = startJob(playlistId, trackIds, currentCovers, photoDataUri);

    expect(job.playlistId).toBe(playlistId);
    expect(job.photoDataUri).toBe(photoDataUri);
  });

  it("should create a job without photoDataUri", () => {
    const playlistId = "test-playlist-2";
    const trackIds = [songs[1].id];
    const currentCovers = { [songs[1].id]: songs[1].originalCoverUrl };

    const job = startJob(playlistId, trackIds, currentCovers);

    expect(job.playlistId).toBe(playlistId);
    expect(job.photoDataUri).toBeUndefined();
  });
});
