import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/server/regen-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playlistId = searchParams.get('playlistId');
  if (!playlistId) return NextResponse.json({ error: 'playlistId required' }, { status: 400 });
  const job = getJob(playlistId);
  return NextResponse.json({ job });
}

