import { NextRequest, NextResponse } from "next/server";
import { pauseJob, getJob } from "@/lib/server/regen-store";

export async function POST(req: NextRequest) {
  const { playlistId } = await req.json();
  if (!playlistId) return NextResponse.json({ error: "playlistId required" }, { status: 400 });
  pauseJob(playlistId);
  return NextResponse.json({ job: getJob(playlistId) });
}
