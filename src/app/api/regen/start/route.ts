import { NextRequest, NextResponse } from 'next/server';
import { startJob } from '@/lib/server/regen-store';

export async function POST(req: NextRequest) {
  try {
    const { playlistId, trackIds, currentCovers } = await req.json();
    if (!playlistId || !Array.isArray(trackIds)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const job = startJob(playlistId, trackIds, currentCovers || {});
    return NextResponse.json({ job });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

