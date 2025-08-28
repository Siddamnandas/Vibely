import { NextRequest, NextResponse } from "next/server";
import { restoreAll, restoreTrack, getJob } from "@/lib/server/regen-store";

export async function POST(req: NextRequest) {
  const { playlistId, trackId } = await req.json();
  if (!playlistId) return NextResponse.json({ error: "playlistId required" }, { status: 400 });
  if (trackId) restoreTrack(playlistId, trackId);
  else restoreAll(playlistId);
  return NextResponse.json({ job: getJob(playlistId) });
}
