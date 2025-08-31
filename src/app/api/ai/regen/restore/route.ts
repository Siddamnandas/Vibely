import { NextRequest, NextResponse } from "next/server";
import { restoreAll, restoreTrack } from "@/lib/server/regen-store";
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

    const { scope, trackId, playlistId } = await request.json();

    if (!scope || !playlistId) {
      return NextResponse.json({ error: "scope and playlistId are required" }, { status: 400 });
    }

    if (scope === "track" && !trackId) {
      return NextResponse.json({ error: "trackId is required for track scope" }, { status: 400 });
    }

    if (scope === "track") {
      restoreTrack(playlistId, trackId!);
    } else if (scope === "playlist") {
      restoreAll(playlistId);
    } else {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("AI regen restore error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
