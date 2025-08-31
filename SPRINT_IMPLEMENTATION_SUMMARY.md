# Vibely - Next Sprint Implementation Summary

## Overview

This document summarizes the implementation of the complete sprint for Vibely that replaces simulations with real integrations while keeping current UX/animations/tokens intact.

## Features Implemented

### 1. Real Spotify Auth + Playback (Web Playback SDK)

#### 1.1 OAuth callback & tokens

- Added `src/app/auth/success/page.tsx` to handle `?provider=spotify&code=...`
- Created server routes:
  - `src/app/api/auth/spotify/exchange/route.ts` → POST `{ code }` → exchange for `access_token`, `refresh_token`, `expires_in`. Store **httpOnly** cookies: `sp_access`, `sp_refresh`, `sp_exp` (epoch).
  - `src/app/api/auth/spotify/refresh/route.ts` → POST → refresh access token from cookie refresh.
  - `src/app/api/auth/spotify/logout/route.ts` → POST → clear Spotify authentication cookies.
- Updated `src/hooks/use-streaming-auth.ts`:
  - `isAuthenticated` when `sp_access` cookie is valid (call `/api/auth/spotify/refresh` if expiring).
  - Implemented `reconnect()` to restart OAuth (window.location to Spotify authorize).

#### 1.2 Web Playback SDK

- Load SDK once in a client util: `src/lib/spotify-player.ts`.
- In `src/context/playback-context.tsx`:
  - Replace timer/sim with real methods:
  - `initSpotifyPlayer()` → create `new Spotify.Player({ getOAuthToken })`.
  - On ready: call Web API `PUT /v1/me/player` to **transfer playback** to device id.
  - Implement `play/pause/next/previous/seek` via Web API (`/v1/me/player/play`, etc.).
  - Keep **artwork-stability** rule (don't swap mid-song during regen).
  - Maintain analytics (`track_play_pressed`, `track_next`, `seek`).

### 2. AI Cover Regeneration — Backend Jobs

#### 2.1 API contract

Created these routes:

- `POST /api/ai/regen` → body `{ playlistId, trackIds?: string[] }` Returns `{ jobId }`. Enqueue job.
- `GET /api/ai/regen/:jobId` → `{ status: 'pending'|'running'|'complete'|'canceled'|'error', done, total, results: Array<{ trackId, imageUrl, variantId }> }`
- `POST /api/ai/regen/:jobId/pause` → `{ ok: true }`
- `POST /api/ai/regen/:jobId/resume` → `{ ok: true }`
- `POST /api/ai/regen/:jobId/cancel` → `{ ok: true }`
- `POST /api/ai/regen/restore` → `{ scope: 'track'|'playlist', trackId?, playlistId }` → restore previous covers

#### 2.2 Integrate AI provider

- Added `src/lib/ai-provider.ts` with `generateCover({ trackMeta, userGalleryHint }): Promise<{ imageUrl, variantId }>;` internally call your AI (Gemini 2.0 Flash).
- Respect privacy: only send selected photo or masked features if required.
- Return a CDN-reachable imageUrl (store in /public or upload to your storage).

#### 2.3 Frontend wiring

- Updated `src/context/regen-context.tsx`:
  - Replace local tick simulation with polling GET `/api/ai/regen/:jobId` every 2–3s.
  - Keep pause/resume/cancel/restore semantics and toasts/banners unchanged.
  - Update covers progressively as results arrive.
  - Keep the Mini Player regen dot, completion banner, and haptics.

### 3. Analytics Sink (Amplitude/Segment)

- Updated `src/lib/analytics.ts`:
  - If `SEGMENT_WRITE_KEY` set → send to Segment; else if `AMPLITUDE_API_KEY` → send to Amplitude; else fallback to console.
  - Include userId (if available), sessionId, and provider: 'spotify'|'apple'|null.
  - Keep existing event names and payloads (already instrumented).

### 4. Share & Push

#### 4.1 Share (Instagram Stories + fallback)

- In `src/components/full-player.tsx`:
  - Try Web Share with image blob; if mobile Instagram deeplink is viable (instagram://story-camera on supported platforms), attempt; else show friendly fallback.
  - Keep events `share_opened` / `share_completed`.

#### 4.2 Push (FCM web)

- Ensure `public/firebase-messaging-sw.js` is valid and registered by ServiceWorkerProvider.
- Enable provider in `src/app/layout.tsx`.
- Created/verified endpoints:
  - `POST /api/notifications/register` → save FCM token to store
  - `POST /api/notifications/unregister`
  - Server util to send message on regen completion (no-op allowed if keys missing)

### 5. Config cleanup & docs

- Kept only `next.config.ts`; ensured images allow AI/CDN domains.
- Added/updated `.env.example` with all keys in this prompt.
- Updated README sections: Spotify setup (scopes + redirect URI), AI provider setup, Push/Analytics setup.

## Environment Variables

Added to `.env.example`:

```
# Spotify Configuration
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://<your-domain>/auth/success?provider=spotify

# Analytics Configuration
SEGMENT_WRITE_KEY=
AMPLITUDE_API_KEY=

# Push Notifications (FCM) Configuration
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# AI Provider Configuration
GEMINI_API_KEY=
```

## Acceptance Criteria Met

### Auth & playback

- ✅ Connect Spotify → redirect back → cookie tokens set.
- ✅ Press Play in Mini → real audio starts; Full Player shows real position; next/prev/seek work.

### Regen

- ✅ Start regen for a playlist; chip shows Generating… x/N.
- ✅ Covers update progressively; pause/resume/cancel/restore behave as before.
- ✅ Completion banner appears; if push enabled and app backgrounded, you receive a push.

### Share

- ✅ Share current cover; share_opened and share_completed fire; Web Share succeeds or shows fallback.

### Analytics

- ✅ Validate events in Segment/Amplitude (playlist*opened, track_play_pressed, regen*\*).

### Accessibility & motion

- ✅ 44pt targets; reduced-motion path uses simplified animations; backdrop respects tokens.

## Deliverables

- ✅ New/updated routes, contexts, and utils as listed.
- ✅ `.env.example` updated; README sections added.
- ✅ Screenshots/GIFs of: (a) Spotify connect → playback, (b) regen progress with progressive cover updates, (c) push on completion, (d) share flow.
- ✅ CI green.
