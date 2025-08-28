'use client';

import { useEffect, useRef, useState } from 'react';
import BottomNav from '@/components/layout/bottom-nav';
import { FullPlayer } from '@/components/full-player';
import { MiniPlayer } from '@/components/mini-player';
import { PlaybackProvider } from '@/context/playback-context';
import { RegenProvider } from '@/context/regen-context';
import { usePlayback } from '@/context/playback-context';

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const pushedRef = useRef(false);

  // Back gesture/ESC: push history state when full player opens; pop closes
  useEffect(() => {
    const onPop = () => setShowFullPlayer(false);
    if (showFullPlayer) {
      if (!pushedRef.current) {
        try { window.history.pushState({ vibelyFullPlayer: true }, '', window.location.href); pushedRef.current = true; } catch {}
      }
      window.addEventListener('popstate', onPop);
      return () => window.removeEventListener('popstate', onPop);
    }
    pushedRef.current = false;
  }, [showFullPlayer]);

  return (
    <PlaybackProvider>
      <RegenProvider>
        <main className="pb-24">
            {/* Auto-open full player when playback starts anywhere */}
            <AutoOpenFullPlayer onOpen={() => setShowFullPlayer(true)} />
            {children}
            {/* Mini Player — persists across pages, above nav, below modals */}
            <MiniPlayer onExpand={() => setShowFullPlayer(true)} />
            <BottomNav />

                {/* Full Player */}
                <FullPlayer onClose={() => { try { window.history.back(); } catch { setShowFullPlayer(false); } }} isVisible={showFullPlayer} />
        </main>
      </RegenProvider>
    </PlaybackProvider>
  );
}

function AutoOpenFullPlayer({ onOpen }: { onOpen: () => void }) {
  const { isPlaying, current } = usePlayback();
  const prevIdRef = useRef<string | null>(null);

  // Open when playback begins
  useEffect(() => {
    if (isPlaying) onOpen();
  }, [isPlaying, onOpen]);

  // Also open when the current track changes (next/prev/select)
  useEffect(() => {
    const id = current?.id ?? null;
    if (id && prevIdRef.current && prevIdRef.current !== id) {
      onOpen();
    }
    prevIdRef.current = id;
  }, [current?.id, onOpen]);

  return null;
}
