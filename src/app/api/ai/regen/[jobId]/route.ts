import { NextRequest, NextResponse } from "next/server";
import { getJob, pauseJob, resumeJob, cancelJob } from "@/lib/server/regen-store";
import { aiRegenRateLimiter } from "@/lib/rate-limiter";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: job.status,
      done: job.completed,
      total: job.total,
      results: Object.values(job.rows)
        .filter((row) => row.status === "updated" || row.status === "restored")
        .map((row) => ({
          trackId: row.trackId,
          imageUrl: row.newCoverUrl,
          variantId: `cv_${row.trackId}_${row.updatedAt || Date.now()}`,
        })),
    });
  } catch (error) {
    console.error("AI regen get job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
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

    const { jobId } = await params;
    const { action } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    switch (action) {
      case "pause":
        pauseJob(jobId);
        return NextResponse.json({ ok: true });

      case "resume":
        resumeJob(jobId);
        return NextResponse.json({ ok: true });

      case "cancel":
        cancelJob(jobId);
        return NextResponse.json({ ok: true });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("AI regen job action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
