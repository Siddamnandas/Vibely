# Vibely – Playlist Detail & Playback

This project uses Next.js with a mobile-first UI for AI-generated album art and playlist playback.

Highlights:
- Playlist Detail overlay in Library (no extra routes)
- Persistent Mini Player (glassmorphic) + Full Player
- Background cover regeneration with progress, pause/resume/cancel, restore
- Local persistence and serialized multi-playlist regen
- Streaming auth hook for reconnect/refresh flows
- Analytics event logging for key actions

Changelog – Refinements
-----------------------
- Parallax header with 28pt cover radius, soft shadow, ~16px parallax
- Actions: Play All, Shuffle, Regenerate (modal preflight)
- Regen: chip with pause/resume/cancel, queued state, push on completion, per-track/playlist restore
- Mini Player: fixed 68px height, safe-area aware, full-bar tap; tiny spinner badge during regen
- Full Player: swipe left=next/right=prev; a11y labels; seek emits analytics
- Streaming auth: `useStreamingAuth()`; Reconnect banner appears when unauthenticated
- Analytics: playlist, track, regen, seek, share, swipe events
- A11y: all controls >=44pt, descriptive aria-labels

Design Tokens
-------------
- `--nav-height`: Glass bottom nav height (updated at runtime by `BottomNav` via ResizeObserver)
- `--nav-gap`: Breathing room above nav used by Mini Player offset
- `--mini-height`: Fixed Mini Player height used across components
- `--mini-offset-bottom`: Derived offset = nav height + gap + safe-area; used by Mini Player and overlays

Tokens live in `src/styles/tokens.css` and are imported by `src/app/globals.css`. Changing them adjusts Mini Player/nav spacing globally.

Known Issues / Next Up
----------------------
- Streaming auth is simulated via localStorage in `useStreamingAuth()`; wire to real Spotify/Apple tokens.
- Cover regeneration is simulated on the client; replace with server-side jobs + persistent DB.
- Push notifications use the Notification API directly; integrate with a real push service.
- `regen_progress` is throttled to ~10% steps to limit analytics volume; adjust to your needs.
- Share flow logs analytics only; connect to platform share sheet / Instagram Stories.
- Ensure bottom nav height changes are reflected in the Mini Player offset if you restyle the nav.

Mini Player (icon-only)
-----------------------
- Converted Mini Player to an icon-only UI with a single centered Play/Pause button sized via `--mini-icon` (default 44px).
- Removed title/artist, progress bar, and next/prev from the mini surface; Full Player retains full controls.
- Preserves glassmorphism, rounded corners, and safe-area offset: `calc(var(--nav-height) + var(--nav-gap) + env(safe-area-inset-bottom))`.
- Regen indicator shows as a small spinner badge anchored to the top-right of the circular button during cover generation.
- Analytics remain unchanged (toggle uses `togglePlay` which emits `track_play_pressed`).
- Mounted globally in `AppShell` so it persists across pages.
