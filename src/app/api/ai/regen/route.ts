import { NextRequest, NextResponse } from "next/server";
import { startJob, getAllJobs } from "@/lib/server/regen-store";
import { aiRegenRateLimiter } from "@/lib/rate-limiter";
import { analyzeUserPhotos, createPhotoAnalysisInput } from "@/ai/flows/analyze-user-photos";
import { spotifyAPI } from "@/lib/spotify";
import type { AudioFeatures } from "@/lib/mood-analyzer";

export async function POST(request: NextRequest) {
  try {
    // Simple rate limiting based on IP address
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = aiRegenRateLimiter.check(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          resetTime: rateLimit.resetTime,
        },
        { status: 429 },
      );
    }

    const { playlistId, trackIds, currentCovers, photoDataUri, photoIds, idempotencyKey } =
      await request.json();

    if (!playlistId || !trackIds || !Array.isArray(trackIds)) {
      return NextResponse.json({ error: "playlistId and trackIds are required" }, { status: 400 });
    }

    // Enhanced photo analysis integration
    let selectedPhotoDataUri = photoDataUri;
    let photoAnalysis = null;

    if (photoIds && photoIds.length > 0 && trackIds.length > 0) {
      try {
        // Get audio features for the first track to guide photo selection
        const audioFeatures = await spotifyAPI.getAudioFeatures([trackIds[0]]);
        const firstFeatures = audioFeatures[0];

        // Create comprehensive photo analysis input
        const analysisInput = await createPhotoAnalysisInput(
          photoIds.map((id: string, index: number) => ({
            id,
            dataUri: id === "user_photo" ? photoDataUri : photoDataUri, // In practice, these would be different photos
          })),
          firstFeatures || {},
          undefined, // Will use just audio features for now
        );

        // Analyze photos to find the best match
        photoAnalysis = await analyzeUserPhotos(analysisInput);

        // Use the best matching photo if different from the primary photo
        if (photoAnalysis.matchedPhotoId !== "user_photo") {
          // In a real implementation, fetch the actual photo data for the selected photoId
          console.log(
            `Using best matching photo: ${photoAnalysis.matchedPhotoId} (confidence: ${photoAnalysis.matchConfidence})`,
          );
        }
      } catch (error) {
        console.warn("Photo analysis failed, using default photo:", error);
        // Continue with the original photo as fallback
      }
    }

    // Start the regeneration job with enhanced data
    const job = startJob(playlistId, trackIds, currentCovers || {}, photoDataUri, idempotencyKey);

    return NextResponse.json({
      jobId: job.playlistId, // Using playlistId as jobId for consistency
      job: {
        ...job,
        photoAnalysis, // Include analysis results in response
      },
    });
  } catch (error) {
    console.error("AI regen start error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET endpoint to get all jobs (for backward compatibility)
export async function GET() {
  try {
    const jobs = getAllJobs();
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("AI regen get all error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
