import { NextRequest, NextResponse } from "next/server";
import { startJob, getAllJobs } from "@/lib/server/regen-store";
import { aiRegenRateLimiter } from "@/lib/rate-limiter";

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

    const { playlistId, trackIds, currentCovers, photoDataUri, idempotencyKey } =
      await request.json();

    if (!playlistId || !trackIds || !Array.isArray(trackIds)) {
      return NextResponse.json({ error: "playlistId and trackIds are required" }, { status: 400 });
    }

    // Start the regeneration job
    const job = startJob(playlistId, trackIds, currentCovers || {}, photoDataUri, idempotencyKey);

    return NextResponse.json({
      jobId: job.playlistId, // Using playlistId as jobId for consistency
      job,
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
