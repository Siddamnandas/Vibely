"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { track as trackEvent } from "@/lib/analytics";
import { toast } from "@/hooks/use-toast";

type RegenStatus = "idle" | "running" | "paused" | "canceled" | "completed" | "queued";

export type RegenRowState = {
  trackId: string;
  status: "pending" | "updating" | "updated" | "restored";
  prevCoverUrl?: string; // Original cover
  newCoverUrl?: string; // AI-generated cover (when status is "updated") or currently displayed cover
  aiCoverUrl?: string; // Always stores the AI-generated cover for undo functionality
  updatedAt?: number;
};

export type RegenJob = {
  playlistId: string;
  total: number;
  completed: number;
  status: RegenStatus;
  startedAt?: number;
  lastPctEmitted?: number;
  rows: Record<string, RegenRowState>; // keyed by trackId
};

type RegenContextType = {
  jobs: Record<string, RegenJob>;
  start: (playlistId: string, trackIds: string[], currentCovers: Record<string, string>) => void;
  pause: (playlistId: string) => void;
  resume: (playlistId: string) => void;
  cancel: (playlistId: string) => void;
  restoreAll: (playlistId: string) => void;
  restoreTrack: (playlistId: string, trackId: string) => void;
  undoRestore: (playlistId: string, trackId: string) => void;
};

const RegenContext = createContext<RegenContextType | undefined>(undefined);
const STORAGE_KEY = "vibely.regenState.v1";
const MAX_CONCURRENT = 1;

const randomCover = (seed: string) =>
  `https://picsum.photos/seed/cover-${seed}-${Math.floor(Math.random() * 10000)}/500/500`;

const USE_BACKEND = true;

export function RegenProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Record<string, RegenJob>>({});
  const [queueOrder, setQueueOrder] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const timers = useRef<Record<string, NodeJS.Timeout | null>>({});
  const pollers = useRef<Record<string, NodeJS.Timeout | null>>({});

  // Note: useRegenNotifications() moved to layout.tsx to avoid circular dependency

  const updateMilestones = (job: RegenJob, startedAt?: number) => {
    const pct = Math.round((job.completed / job.total) * 100);
    if ([25, 50].includes(pct)) {
      toast({ title: "New covers arriving…", description: `${job.completed}/${job.total}.` });
    }
    if (pct === 100 && startedAt) {
      toast({ title: `All covers refreshed for ‘${job.playlistId}’ 🎉` });
      trackEvent("regen_completed", {
        playlist_id: job.playlistId,
        total: job.total,
        duration_ms: Date.now() - startedAt,
      });
      try {
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("Vibely", {
              body: `New covers are ready ✨ – ${job.total} songs updated`,
            });
          }
        }
        navigator?.vibrate?.(30);
      } catch {}
    }
  };

  const tick = (
    playlistId: string,
    trackQueue: string[],
    covers: Record<string, string>,
    startedAt?: number,
  ) => {
    setJobs((prev) => {
      const job = prev[playlistId];
      if (!job || job.status !== "running") return prev;
      const nextTrackId = trackQueue[job.completed];
      if (!nextTrackId) return prev;

      const updatedRow: RegenRowState = {
        trackId: nextTrackId,
        status: "updated",
        prevCoverUrl: covers[nextTrackId],
        newCoverUrl: randomCover(nextTrackId),
        aiCoverUrl: randomCover(nextTrackId), // Store the AI cover for undo functionality
        updatedAt: Date.now(),
      };
      const variantId = `cv_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      trackEvent("track_cover_updated", {
        track_id: nextTrackId,
        playlist_id: playlistId,
        variant_id: variantId,
      });

      let updatedJob: RegenJob = {
        ...job,
        completed: job.completed + 1,
        rows: {
          ...job.rows,
          [nextTrackId]: updatedRow,
        },
      };

      // Throttle regen_progress emission to ~10% step changes
      const pct = Math.round((updatedJob.completed / updatedJob.total) * 100);
      const shouldEmit =
        pct === 100 ||
        updatedJob.lastPctEmitted === undefined ||
        pct - (updatedJob.lastPctEmitted ?? 0) >= 10;
      if (shouldEmit) {
        trackEvent("regen_progress", {
          playlist_id: playlistId,
          done: updatedJob.completed,
          total: updatedJob.total,
        });
        updatedJob = { ...updatedJob, lastPctEmitted: pct };
      }

      updateMilestones(updatedJob, startedAt);

      const nextState = { ...prev, [playlistId]: updatedJob };
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ jobs: nextState, queue: [], active: playlistId }),
        );
      } catch {}
      return nextState;
    });
  };

  const persist = (
    nextJobs: Record<string, RegenJob>,
    nextQueue: string[],
    nextActive: string | null,
  ) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ jobs: nextJobs, queue: nextQueue, active: nextActive }),
      );
    } catch {}
  };

  useEffect(() => {
    // hydrate persisted jobs/queue/active
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const { jobs: j, queue, active } = JSON.parse(raw);
          setJobs(j || {});
          setQueueOrder(queue || []);
          setActiveId(active || null);
          if (active && j?.[active]?.status === "running") {
            runTimer(active);
          }
        }
      } catch {}
    }
    // If using backend, seed jobs from server (survive reloads/background)
    if (typeof window !== "undefined" && USE_BACKEND) {
      fetch("/api/regen/all", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          const srvJobs = (data?.jobs || {}) as Record<string, RegenJob>;
          setJobs(srvJobs);
          // start pollers for running jobs
          Object.values(srvJobs).forEach((j) => {
            if (j.status === "running") {
              if (pollers.current[j.playlistId])
                clearInterval(pollers.current[j.playlistId] as any);
              pollers.current[j.playlistId] = setInterval(async () => {
                const res = await fetch(`/api/regen/status?playlistId=${j.playlistId}`, {
                  cache: "no-store",
                });
                const sj = (await res.json()).job as RegenJob | undefined;
                if (sj) {
                  setJobs((prev) => ({ ...prev, [j.playlistId]: sj }));
                  if (sj.status === "completed" || sj.status === "canceled") {
                    clearInterval(pollers.current[j.playlistId] as any);
                    pollers.current[j.playlistId] = null;
                  }
                }
              }, 1000) as any;
            }
          });
        })
        .catch(() => {});
    }
    
    // Cleanup all timers and intervals when component unmounts
    const timersSnapshot = timers.current;
    const pollersSnapshot = pollers.current;
    return () => {
      Object.values(timersSnapshot).forEach((timer) => {
        if (timer) clearInterval(timer);
      });
      Object.values(pollersSnapshot).forEach((poller) => {
        if (poller) clearInterval(poller);
      });
    };
  }, []);

  const runTimer = (playlistId: string) => {
    const startedAt = Date.now();
    const job = jobs[playlistId];
    if (!job) return;
    const trackIds = Object.keys(job.rows);
    const interval = setInterval(() => {
      setJobs((prev) => {
        const current = prev[playlistId];
        if (!current) return prev;
        if (current.status !== "running") return prev;
        if (current.completed >= current.total) {
          clearInterval(interval);
          timers.current[playlistId] = null;
          const done: RegenJob = { ...current, status: "completed" };
          const nextJobs = { ...prev, [playlistId]: done };
          // start next from queue
          setQueueOrder((q) => {
            const [, ...rest] = q;
            const nextId = rest[0] || null;
            setActiveId(nextId);
            if (nextId) {
              setJobs((p) => {
                const queuedJob = p[nextId];
                if (!queuedJob) return p;
                const started: RegenJob = {
                  ...queuedJob,
                  status: "running",
                  startedAt: Date.now(),
                };
                timers.current[nextId] && clearInterval(timers.current[nextId] as any);
                timers.current[nextId] = null;
                const np = { ...p, [nextId]: started };
                persist(np, rest, nextId);
                runTimer(nextId);
                return np;
              });
            } else {
              persist(nextJobs, rest, null);
            }
            return rest;
          });
          persist(done ? { ...nextJobs } : prev, queueOrder, activeId);
          return nextJobs;
        }
        return prev;
      });
      tick(
        playlistId,
        trackIds,
        Object.fromEntries(trackIds.map((id) => [id, job.rows[id]?.prevCoverUrl || ""])),
        startedAt,
      );
    }, 800);
    timers.current[playlistId] = interval as any;
  };

  const start = (playlistId: string, trackIds: string[], currentCovers: Record<string, string>) => {
    if (USE_BACKEND) {
      fetch("/api/regen/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, trackIds, currentCovers }),
      })
        .then((r) => r.json())
        .then((data) => {
          const job = data.job as RegenJob;
          if (!job) return;
          setJobs((prev) => ({ ...prev, [playlistId]: job }));
          if (pollers.current[playlistId]) clearInterval(pollers.current[playlistId] as any);
          pollers.current[playlistId] = setInterval(async () => {
            const res = await fetch(`/api/regen/status?playlistId=${playlistId}`, {
              cache: "no-store",
            });
            const j = (await res.json()).job as RegenJob | undefined;
            if (j) {
              setJobs((prev) => ({ ...prev, [playlistId]: j }));
              if (j.status === "completed" || j.status === "canceled") {
                clearInterval(pollers.current[playlistId] as any);
                pollers.current[playlistId] = null;
              }
            }
          }, 1000) as any;
        })
        .catch(() => {});
      return;
    }
    setJobs((prev) => {
      if (prev[playlistId]?.status === "running" || prev[playlistId]?.status === "queued")
        return prev;
      const rows: Record<string, RegenRowState> = Object.fromEntries(
        trackIds.map((id) => [
          id,
          { trackId: id, status: "pending", prevCoverUrl: currentCovers[id] },
        ]),
      );
      const hasActive = activeId && prev[activeId]?.status === "running";
      const status: RegenStatus = hasActive && MAX_CONCURRENT === 1 ? "queued" : "running";
      const job: RegenJob = {
        playlistId,
        total: trackIds.length,
        completed: 0,
        status,
        rows,
        startedAt: status === "running" ? Date.now() : undefined,
      };
      const nextJobs = { ...prev, [playlistId]: job };
      if (status === "queued") {
        setQueueOrder((q) => {
          const nq = [...q, playlistId];
          persist(nextJobs, nq, activeId);
          return nq;
        });
        toast({ title: "Queued after current" });
      } else {
        setActiveId(playlistId);
        trackEvent("regen_started", { playlist_id: playlistId, total_tracks: trackIds.length });
        toast({
          title: "We're regenerating covers",
          description: `Queued ${trackIds.length} songs.`,
        });
        try {
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "default"
          ) {
            Notification.requestPermission().catch(() => {});
          }
        } catch {}
        // Start timer for active
        setTimeout(() => runTimer(playlistId), 0);
        persist(nextJobs, queueOrder, playlistId);
      }
      return nextJobs;
    });
  };

  const pause = (playlistId: string) => {
    if (USE_BACKEND) {
      fetch("/api/regen/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      })
        .then(() => {})
        .catch(() => {});
    }
    setJobs((prev) => {
      const job = prev[playlistId];
      if (!job) return prev;
      if (timers.current[playlistId]) clearInterval(timers.current[playlistId] as any);
      timers.current[playlistId] = null;
      toast({ title: "Generation paused — resume anytime" });
      trackEvent("regen_paused", {
        playlist_id: playlistId,
        done: job.completed,
        total: job.total,
      });
      return { ...prev, [playlistId]: { ...job, status: "paused" } };
    });
  };

  const resume = (playlistId: string) => {
    if (USE_BACKEND) {
      fetch("/api/regen/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      })
        .then(() => {})
        .catch(() => {});
    }
    setJobs((prev) => {
      const job = prev[playlistId];
      if (!job) return prev;
      toast({ title: "Resuming generation" });
      trackEvent("regen_resumed", {
        playlist_id: playlistId,
        done: job.completed,
        total: job.total,
      });
      return { ...prev, [playlistId]: { ...job, status: "running" } };
    });
    if (!timers.current[playlistId]) {
      runTimer(playlistId);
    }
  };

  const cancel = (playlistId: string) => {
    if (USE_BACKEND) {
      fetch("/api/regen/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      })
        .then(() => {})
        .catch(() => {});
    }
    if (timers.current[playlistId]) clearInterval(timers.current[playlistId] as any);
    timers.current[playlistId] = null;
    setJobs((prev) => {
      const job = prev[playlistId];
      if (!job) return prev;
      trackEvent("regen_canceled", {
        playlist_id: playlistId,
        done: job.completed,
        total: job.total,
      });
      toast({ title: "Generation canceled — previous covers kept" });
      return { ...prev, [playlistId]: { ...job, status: "canceled" } };
    });
  };

  const restoreAll = (playlistId: string) => {
    if (USE_BACKEND) {
      fetch("/api/regen/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      })
        .then(() => {})
        .catch(() => {});
    }
    setJobs((prev) => {
      const job = prev[playlistId];
      if (!job) return prev;

      const updatedRows = { ...job.rows };
      let restoredCount = 0;

      Object.keys(updatedRows).forEach((trackId) => {
        const row = updatedRows[trackId];
        if (row?.status === "updated" && row.prevCoverUrl) {
          updatedRows[trackId] = {
            ...row,
            status: "restored" as const,
            newCoverUrl: row.prevCoverUrl, // Show original cover
            aiCoverUrl: row.aiCoverUrl || row.newCoverUrl, // Keep AI cover for undo
          };
          restoredCount++;
        }
      });

      if (restoredCount > 0) {
        trackEvent("cover_restored", {
          playlist_id: playlistId,
          scope: "playlist",
          tracks_restored: restoredCount,
        });
        toast({
          title: "Restored previous covers",
          description: `${restoredCount} song${restoredCount !== 1 ? "s" : ""} restored to original covers`,
        });
      }

      return { ...prev, [playlistId]: { ...job, rows: updatedRows } };
    });
  };

  const restoreTrack = (playlistId: string, trackId: string) => {
    if (USE_BACKEND) {
      fetch("/api/regen/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, trackId }),
      })
        .then(() => {})
        .catch(() => {});
    }
    setJobs((prev) => {
      const job = prev[playlistId];
      if (!job) return prev;
      const row = job.rows[trackId];
      if (!row || row.status !== "updated" || !row.prevCoverUrl) return prev;

      const updated: RegenRowState = {
        ...row,
        status: "restored",
        newCoverUrl: row.prevCoverUrl,
        aiCoverUrl: row.aiCoverUrl || row.newCoverUrl, // Keep AI cover for undo
      };
      trackEvent("cover_restored", { playlist_id: playlistId, track_id: trackId, scope: "track" });
      toast({
        title: "Cover restored",
        description: "Switched back to the original cover",
      });
      return { ...prev, [playlistId]: { ...job, rows: { ...job.rows, [trackId]: updated } } };
    });
  };

  const undoRestore = (playlistId: string, trackId: string) => {
    setJobs((prev) => {
      const job = prev[playlistId];
      if (!job) return prev;
      const row = job.rows[trackId];
      if (!row || row.status !== "restored" || !row.aiCoverUrl) return prev;

      // Switch back to the AI-generated cover
      const updated: RegenRowState = {
        ...row,
        status: "updated",
        newCoverUrl: row.aiCoverUrl, // Use the stored AI cover
      };

      trackEvent("cover_restored", {
        playlist_id: playlistId,
        track_id: trackId,
        scope: "track",
        action: "undo",
      });
      toast({
        title: "Restore undone",
        description: "Switched back to the AI-generated cover",
      });
      return { ...prev, [playlistId]: { ...job, rows: { ...job.rows, [trackId]: updated } } };
    });
  };

  const value = useMemo(
    () => ({ jobs, start, pause, resume, cancel, restoreAll, restoreTrack, undoRestore }),
    [jobs],
  );

  return <RegenContext.Provider value={value}>{children}</RegenContext.Provider>;
}

export function useRegen() {
  const ctx = useContext(RegenContext);
  if (!ctx) throw new Error("useRegen must be used within RegenProvider");
  return ctx;
}
