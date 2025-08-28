"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Play,
  Shuffle,
  Sparkles,
  PauseCircle,
  XCircle,
  RotateCcw,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { getPlaylistById } from "@/lib/playlists";
import { usePlayback } from "@/context/playback-context";
import { useRegen } from "@/context/regen-context";
import { useToast } from "@/hooks/use-toast";
import { useStreamingAuth } from "@/hooks/use-streaming-auth";
import { track as trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";

export default function PlaylistDetailOverlay({
  playlistId,
  onClose,
}: {
  playlistId: string;
  onClose: () => void;
}) {
  const playlist = useMemo(() => getPlaylistById(playlistId), [playlistId]);
  const { toast } = useToast();
  const { setQueueWithPlaylist, play, playTrackAt } = usePlayback();
  const { jobs, start, pause, resume, cancel, restoreAll, restoreTrack } = useRegen();
  const job = jobs[playlistId!];

  const [showModal, setShowModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const { isAuthenticated, checking, provider, reconnect } = useStreamingAuth();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    const online = () => setIsOffline(false);
    const offline = () => setIsOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  useEffect(() => {
    if (playlist) {
      trackEvent("playlist_opened", { playlist_id: playlist.id, tracks: playlist.count });
    }
  }, [playlist]);

  if (!playlist) return null;

  const tracks = playlist.songs.map((s) => {
    const updated = job?.rows[s.id]?.newCoverUrl;
    return {
      id: s.id,
      title: s.title,
      artist: s.artist,
      coverUrl: updated ?? s.coverUrl,
      available: s.available,
    };
  });
  const coversMap = Object.fromEntries(tracks.map((t) => [t.id, t.coverUrl] as const));

  const handlePlayAll = () => {
    setQueueWithPlaylist(playlist.id, tracks, 0);
    play();
    navigator?.vibrate?.(10);
    trackEvent("playlist_play_all", { playlist_id: playlist.id, tracks: tracks.length });
  };

  const handleShuffleAll = () => {
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    setQueueWithPlaylist(playlist.id, shuffled, 0);
    play();
    toast({ title: "Shuffling", description: `${playlist.count} songs` });
    trackEvent("playlist_shuffle_all", { playlist_id: playlist.id, tracks: tracks.length });
  };

  const startRegen = () => {
    setShowModal(false);
    start(
      playlist.id,
      tracks.map((t) => t.id),
      coversMap,
    );
  };

  const pct = job ? Math.round((job.completed / job.total) * 100) : 0;

  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-[55] bg-[#0E0F12] text-white overflow-y-auto" ref={scrollRef}>
        {/* Top bar */}
        <div className="sticky top-0 z-50 bg-[#0E0F12]/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white">
            <ChevronDown />
          </Button>
          <div className="text-center">
            <p className="text-white/70 text-xs">Playlist</p>
            <p className="text-white font-medium text-sm">{playlist.name}</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Offline banner */}
        {isOffline && (
          <div className="sticky top-[52px] z-40 bg-red-500/10 text-red-300 px-4 py-2 flex items-center gap-2 backdrop-blur-xl">
            <AlertTriangle className="h-4 w-4" /> You're offline. Some actions may be unavailable.
          </div>
        )}

        {/* Parallax Header with rounded card */}
        <div className="relative h-[300px] px-4 pt-4">
          <div className="relative h-full rounded-[28px] overflow-hidden shadow-2xl">
            <Image
              src={playlist.coverImage}
              alt={playlist.name}
              fill
              className="object-cover"
              style={{ transform: `translateY(${Math.min(16, scrollY * 0.2)}px)` }}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>

          {/* Regen progress chip */}
          {job && job.status !== "idle" && job.status !== "completed" && (
            <div className="absolute top-6 left-6 right-6">
              <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {job.status === "paused" && "Generation paused — resume anytime"}
                    {job.status === "running" && `Generating… ${job.completed}/${job.total}`}
                    {job.status === "canceled" && "Generation canceled — previous covers kept"}
                    {job.status === "queued" && "Queued after current"}
                  </span>
                  <div className="flex items-center gap-2">
                    {job.status === "running" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => pause(playlist.id)}
                      >
                        <PauseCircle className="h-4 w-4 mr-1" /> Pause
                      </Button>
                    ) : job.status === "paused" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => resume(playlist.id)}
                      >
                        <Play className="h-4 w-4 mr-1" /> Resume
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-red-300"
                      onClick={() => cancel(playlist.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
                {job.status !== "canceled" && <Progress value={pct} />}
              </div>
            </div>
          )}

          <div className="absolute bottom-6 left-10 right-10">
            <h1 className="font-black text-4xl leading-tight drop-shadow-xl">{playlist.name}</h1>
            <p className="text-white/80 font-semibold">{playlist.count} songs</p>
          </div>
        </div>

        {/* Controls */}
        <div className="sticky top-0 z-40 bg-[#0E0F12]/80 backdrop-blur-xl border-b border-white/10">
          <div className="container mx-auto max-w-4xl px-4 py-3 flex items-center gap-3">
            <Button onClick={handlePlayAll} className="rounded-full">
              <Play className="mr-2 h-4 w-4" /> Play All
            </Button>
            <Button variant="secondary" onClick={handleShuffleAll} className="rounded-full">
              <Shuffle className="mr-2 h-4 w-4" /> Shuffle
            </Button>

            <Dialog open={showModal} onOpenChange={setShowModal}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="rounded-full">
                  <Sparkles className="mr-2 h-4 w-4" /> Regenerate Covers
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Regenerate Covers</DialogTitle>
                  <DialogDescription>
                    We’ll queue {playlist.count} songs. This may take a few minutes. You can keep
                    listening.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={startRegen}
                    className="bg-gradient-to-r from-[#9FFFA2] to-[#8FD3FF] text-black font-semibold"
                  >
                    Start
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="ml-auto flex items-center gap-2">
              {job?.status === "completed" && (
                <Badge variant="secondary" className="bg-white/10 text-white">
                  New covers are ready ✨
                </Badge>
              )}
              {job && (
                <Button variant="ghost" size="sm" onClick={() => restoreAll(playlist.id)}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Restore previous covers
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Reconnect banner (no token) */}
        {!checking && !isAuthenticated && (
          <div className="mx-4 mt-4 rounded-2xl bg-white/10 border border-white/20 p-4">
            <p className="text-white font-medium">
              Playback needs permission. Reconnect to {provider ?? "your provider"}.
            </p>
            <p className="text-white/70 text-sm">
              We need to refresh your streaming connection to play songs.
            </p>
            <div className="mt-3">
              <Button
                className="rounded-full"
                onClick={async () => {
                  await reconnect();
                  toast({ title: `Reconnected to ${provider ?? "provider"}` });
                }}
              >
                Reconnect
              </Button>
            </div>
          </div>
        )}

        {/* Songs List or Empty State */}
        <div className="container mx-auto max-w-4xl px-4 py-4">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 mb-4" />
              <h3 className="text-2xl font-black mb-2">No songs yet</h3>
              <p className="text-white/70 mb-4">Add songs to start vibing.</p>
              <Button className="rounded-full">Add songs</Button>
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {tracks.map((t, idx) => {
                const rowState = job?.rows[t.id];
                const disabled = t.available === false;
                const statusText =
                  rowState?.status === "pending"
                    ? "New cover pending"
                    : rowState?.status === "updated"
                      ? "Updated just now"
                      : rowState?.status === "restored"
                        ? "Restored"
                        : undefined;

                return (
                  <li key={t.id} className="py-3" data-track-id={t.id}>
                    <div className={`flex items-center gap-3 ${disabled ? "opacity-50" : ""}`}>
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                        <Image
                          src={rowState?.newCoverUrl ?? t.coverUrl}
                          alt={t.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{t.title}</p>
                        <p className="text-white/70 text-sm truncate">{t.artist}</p>
                        {statusText && <p className="text-xs text-white/60 mt-1">{statusText}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {disabled ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="px-3 py-2 text-xs rounded-full bg-white/10">
                                Unavailable
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Track is unavailable in your region</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            onClick={() => {
                              setQueueWithPlaylist(playlist.id, tracks, idx);
                              play();
                            }}
                            size="icon"
                            className="w-12 h-12 rounded-full"
                            aria-label={`Play ${t.title}`}
                          >
                            <Play className="h-5 w-5" />
                          </Button>
                        )}

                        {rowState?.status === "updated" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => restoreTrack(playlist.id, t.id)}
                            aria-label={`Restore cover for ${t.title}`}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" /> Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Completion banner with View link */}
        {job?.status === "completed" && (
          <div
            className="fixed left-1/2 -translate-x-1/2 z-[56] max-w-md w-[95%]"
            style={{
              bottom: "calc(var(--mini-height, 68px) + var(--mini-offset-bottom, 0px) + 8px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 shadow-lg flex items-center justify-between"
            >
              <div>
                <p className="font-semibold">All covers refreshed for ‘{playlist.name}’ 🎉</p>
                <p className="text-white/70 text-sm">{job.total} songs updated</p>
              </div>
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() => {
                  const firstUpdated = Object.values(job.rows).find((r) => r.status === "updated");
                  if (!firstUpdated) return;
                  const el = document.querySelector(`[data-track-id="${firstUpdated.trackId}"]`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  if (el instanceof HTMLElement) {
                    el.classList.add("ring-2", "ring-[#9FFFA2]", "rounded-xl");
                    setTimeout(
                      () => el.classList.remove("ring-2", "ring-[#9FFFA2]", "rounded-xl"),
                      1200,
                    );
                  }
                }}
              >
                View changes
              </Button>
            </motion.div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
