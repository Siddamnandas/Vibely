'use client';

import { useParams, useRouter } from 'next/navigation';
import PlaylistDetailOverlay from '@/components/playlist-detail-overlay';

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = (params?.id as string) || '';

  if (!playlistId) return null;

  return (
    <PlaylistDetailOverlay playlistId={playlistId} onClose={() => router.back()} />
  );
}
