// Simple in-memory regen job store for development
// NOTE: In production, replace with a persistent queue + DB

export type RegenStatus = 'idle' | 'running' | 'paused' | 'canceled' | 'completed' | 'queued';

export type RegenRowState = {
  trackId: string;
  status: 'pending' | 'updating' | 'updated' | 'restored';
  prevCoverUrl?: string;
  newCoverUrl?: string;
  updatedAt?: number;
};

export type RegenJob = {
  playlistId: string;
  total: number;
  completed: number;
  status: RegenStatus;
  startedAt?: number;
  lastPctEmitted?: number;
  rows: Record<string, RegenRowState>;
};

type Store = {
  jobs: Record<string, RegenJob>;
  queue: string[];
  active: string | null;
  timers: Record<string, NodeJS.Timeout | null>;
};

import fs from 'fs';
import path from 'path';

const g = globalThis as any;
if (!g.__REGEN_STORE__) {
  g.__REGEN_STORE__ = { jobs: {}, queue: [], active: null, timers: {} } as Store;
}
const store: Store = g.__REGEN_STORE__ as Store;

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'regen-store.json');

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

function loadFromDisk() {
  try {
    ensureDir();
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      store.jobs = parsed.jobs || {};
      store.queue = parsed.queue || [];
      store.active = parsed.active || null;
    }
  } catch {}
}

let persistTimer: NodeJS.Timeout | null = null;
function persistSoon() {
  try {
    ensureDir();
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        fs.writeFileSync(
          DATA_FILE,
          JSON.stringify({ jobs: store.jobs, queue: store.queue, active: store.active }, null, 2),
          'utf8'
        );
      } catch {}
    }, 150);
  } catch {}
}

// Load persisted state on module load
loadFromDisk();

const MAX_CONCURRENT = 1;

const randomCover = (seed: string) => `https://picsum.photos/seed/cover-${seed}-${Math.floor(Math.random() * 10000)}/500/500`;

export function getJob(playlistId: string): RegenJob | undefined {
  return store.jobs[playlistId];
}

export function getAllJobs(): Store {
  return store;
}

export function startJob(playlistId: string, trackIds: string[], currentCovers: Record<string, string>): RegenJob {
  // If already exists and running/queued, return current job
  const existing = store.jobs[playlistId];
  if (existing && (existing.status === 'running' || existing.status === 'queued' || existing.status === 'paused')) {
    return existing;
  }
  const rows: Record<string, RegenRowState> = Object.fromEntries(
    trackIds.map((id) => [id, { trackId: id, status: 'pending', prevCoverUrl: currentCovers[id] }])
  );
  const hasActive = store.active && store.jobs[store.active]?.status === 'running';
  const status: RegenStatus = hasActive && MAX_CONCURRENT === 1 ? 'queued' : 'running';
  const job: RegenJob = {
    playlistId,
    total: trackIds.length,
    completed: 0,
    status,
    startedAt: status === 'running' ? Date.now() : undefined,
    rows,
  };
  store.jobs[playlistId] = job;
  if (status === 'queued') {
    store.queue.push(playlistId);
  } else {
    store.active = playlistId;
    runTimer(playlistId, trackIds, currentCovers);
  }
  persistSoon();
  return job;
}

export function pauseJob(playlistId: string) {
  const job = store.jobs[playlistId];
  if (!job) return;
  job.status = 'paused';
  persistSoon();
}

export function resumeJob(playlistId: string) {
  const job = store.jobs[playlistId];
  if (!job) return;
  if (store.active && store.active !== playlistId && MAX_CONCURRENT === 1) {
    // cannot resume now, queue it
    job.status = 'queued';
    if (!store.queue.includes(playlistId)) store.queue.push(playlistId);
    return;
  }
  job.status = 'running';
  if (!store.active) store.active = playlistId;
  if (!store.timers[playlistId]) {
    const trackIds = Object.keys(job.rows);
    const covers = Object.fromEntries(trackIds.map((id) => [id, job.rows[id]?.prevCoverUrl || '']));
    runTimer(playlistId, trackIds, covers);
  }
  persistSoon();
}

export function cancelJob(playlistId: string) {
  const job = store.jobs[playlistId];
  if (!job) return;
  job.status = 'canceled';
  if (store.timers[playlistId]) {
    clearInterval(store.timers[playlistId] as any);
    store.timers[playlistId] = null;
  }
  if (store.active === playlistId) {
    store.active = null;
    startNextFromQueue();
  } else {
    // remove from queue if queued
    store.queue = store.queue.filter((id) => id !== playlistId);
  }
  persistSoon();
}

export function restoreAll(playlistId: string) {
  const job = store.jobs[playlistId];
  if (!job) return;
  Object.keys(job.rows).forEach((id) => {
    const r = job.rows[id];
    job.rows[id] = { ...r, status: 'restored', newCoverUrl: r.prevCoverUrl };
  });
  persistSoon();
}

export function restoreTrack(playlistId: string, trackId: string) {
  const job = store.jobs[playlistId];
  if (!job) return;
  const r = job.rows[trackId];
  if (!r) return;
  job.rows[trackId] = { ...r, status: 'restored', newCoverUrl: r.prevCoverUrl };
  persistSoon();
}

function runTimer(playlistId: string, trackIds: string[], currentCovers: Record<string, string>) {
  const job = store.jobs[playlistId];
  if (!job) return;
  if (store.timers[playlistId]) {
    clearInterval(store.timers[playlistId] as any);
    store.timers[playlistId] = null;
  }
  const interval = setInterval(() => {
    const j = store.jobs[playlistId];
    if (!j) {
      clearInterval(interval);
      store.timers[playlistId] = null;
      return;
    }
    if (j.status !== 'running') return; // paused or queued
    if (j.completed >= j.total) {
      clearInterval(interval);
      store.timers[playlistId] = null;
      j.status = 'completed';
      if (store.active === playlistId) {
        store.active = null;
        startNextFromQueue();
      }
      persistSoon();
      return;
    }
    const nextTrackId = trackIds[j.completed];
    const updatedRow: RegenRowState = {
      trackId: nextTrackId,
      status: 'updated',
      prevCoverUrl: currentCovers[nextTrackId],
      newCoverUrl: randomCover(nextTrackId),
      updatedAt: Date.now(),
    };
    j.completed += 1;
    j.rows[nextTrackId] = updatedRow;
    persistSoon();
  }, 800);
  store.timers[playlistId] = interval as any;
}

function startNextFromQueue() {
  const nextId = store.queue.shift();
  if (!nextId) return;
  const job = store.jobs[nextId];
  if (!job) return startNextFromQueue();
  job.status = 'running';
  job.startedAt = Date.now();
  store.active = nextId;
  const trackIds = Object.keys(job.rows);
  const covers = Object.fromEntries(trackIds.map((id) => [id, job.rows[id]?.prevCoverUrl || '']));
  runTimer(nextId, trackIds, covers);
  persistSoon();
}
