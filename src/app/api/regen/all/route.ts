import { NextResponse } from 'next/server';
import { getAllJobs } from '@/lib/server/regen-store';

export async function GET() {
  const all = getAllJobs();
  return NextResponse.json({ jobs: all.jobs, queue: all.queue, active: all.active });
}

