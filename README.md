# Vibely – Playlist Detail & Playback

![CI](https://github.com/Siddamnandas/Vibely/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/Siddamnandas/Vibely/actions/workflows/deploy-vercel.yml/badge.svg)

Next.js app with a mobile‑first UI for AI‑generated album art and playlist playback.

Highlights
----------
- Playlist Detail overlay in Library (no extra routes)
- Persistent Mini Player (glassmorphic) + Full Player
- Background cover regeneration with progress, pause/resume/cancel, restore
- Local persistence and serialized multi-playlist regen
- Streaming auth hook for reconnect/refresh flows
- Analytics event logging for key actions
- A11y: all controls ≥44pt with descriptive labels

Changelog – Refinements
-----------------------
- Parallax header with 28pt radius, soft shadow, ~16px parallax
- Actions: Play All, Shuffle, Regenerate (modal preflight)
- Regen: chip with pause/resume/cancel, queued state, push on completion, restore per track/playlist
- Mini Player: fixed 68px height, safe‑area aware, full‑bar tap; tiny spinner badge during regen
- Full Player: swipe left=next/right=prev; seek emits analytics
- Streaming auth: `useStreamingAuth()`; Reconnect banner when unauthenticated
- Analytics: playlist, track, regen, seek, share, swipe

Design Tokens
-------------
- `--nav-height`: Bottom nav height (updated by `BottomNav` via ResizeObserver)
- `--nav-gap`: Breathing room above nav used by Mini Player offset
- `--mini-height`: Fixed Mini Player height used across components
- `--mini-offset-bottom`: nav height + gap + safe-area; used by Mini Player and overlays

Tokens live in `src/styles/tokens.css` and are imported by `src/app/globals.css`.

Getting Started
---------------
Prereqs: Node 20 (see `.nvmrc`), npm 9+.

1) Install

```bash
npm ci
```

2) Run locally

```bash
npm run dev
```

3) Typecheck, lint, test, build

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Environment Variables
---------------------
Set these in `.env.local` (no values shown):

- Public Firebase: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- Base URLs: `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_API_ENDPOINT`
- Spotify: `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`, `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI`, `SPOTIFY_CLIENT_SECRET`
- Apple Music: `APPLE_MUSIC_CLIENT_ID`, `APPLE_MUSIC_CLIENT_SECRET`, `APPLE_MUSIC_DEVELOPER_TOKEN`, `NEXT_PUBLIC_APPLE_MUSIC_CLIENT_ID`, `NEXT_PUBLIC_APPLE_MUSIC_DEVELOPER_TOKEN`
- Analytics: `NEXT_PUBLIC_AMPLITUDE_API_KEY`, `NEXT_PUBLIC_SEGMENT_WRITE_KEY`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_MIXPANEL_TOKEN`
- Payments: `STRIPE_SECRET_KEY`

CI/CD
-----
- CI runs on pushes/PRs to `main` (typecheck, lint, tests, build). See `.github/workflows/ci.yml`.
- Vercel deploys on push to `main` using `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets. See `.github/workflows/deploy-vercel.yml`.

Branch Protection
-----------------
Enable on GitHub for `main`:
- Require PR reviews
- Require status checks (CI) to pass before merge

Contributing
------------
See `CONTRIBUTING.md`. In short:
- Use Conventional Commits (e.g., `feat: ...`, `fix: ...`)
- Run `npm run typecheck && npm run lint && npm test` before pushing
- Open a PR targeting `main` with a clear description and screenshots if UI changes

Discussions
-----------
Consider enabling GitHub Discussions to collect feedback, Q&A, and ideas.


Mini Player (icon-only)
-----------------------
- Converted Mini Player to an icon-only UI with a single centered Play/Pause button sized via `--mini-icon` (default 44px).
- Removed title/artist, progress bar, and next/prev from the mini surface; Full Player retains full controls.
- Preserves glassmorphism, rounded corners, and safe-area offset: `calc(var(--nav-height) + var(--nav-gap) + env(safe-area-inset-bottom))`.
- Regen indicator shows as a small spinner badge anchored to the top-right of the circular button during cover generation.
- Analytics remain unchanged (toggle uses `togglePlay` which emits `track_play_pressed`).
- Mounted globally in `AppShell` so it persists across pages.
