# Contributing to Vibely

Thanks for your interest in improving Vibely! This document outlines standards and workflow so changes are smooth and predictable.

## Prerequisites
- Node 20 (see `.nvmrc`), npm 9+
- Install deps: `npm ci`

## Development
- Start dev server: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Test: `npm test`

## Commit Format
We use Conventional Commits:
- `feat: add new playlist filter`
- `fix: correct mini-player overlay offset`
- `chore: update deps`
- `docs: improve README`
- `refactor: simplify auth flow`
- `test: add audio engine tests`

## Pull Requests
1. Create a feature branch from `main`
2. Ensure CI passes locally: `npm run typecheck && npm run lint && npm test`
3. Push and open a PR with a clear description and any screenshots
4. Address review comments; keep diffs focused and minimal
5. Squash-and-merge or merge after approvals and passing checks

## Code Style
- Follow ESLint rules via `next lint`
- Keep components small and focused
- Prefer TypeScript types over `any`
- Avoid over-engineering; prioritize readability

## Releases
Use the "Create Release Tag" GitHub Action (workflow_dispatch) to create a tag and release.

## Security
Do not commit secrets. Use environment variables (`.env.local`, GitHub Secrets, Vercel Project Settings).

