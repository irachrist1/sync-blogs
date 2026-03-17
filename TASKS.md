# Tasks

## Backend Migration: Express → Convex
- [ ] Install Convex (`npx convex init`)
- [ ] Define Convex schema (posts, revisions, feedback, settings)
- [ ] Migrate Express routes to Convex functions (mutations/queries)
- [ ] Replace JSON file storage (`data/store.json`) with Convex DB
- [ ] Move Anthropic SDK calls into Convex actions
- [ ] Update frontend (`public/app.js`) to use Convex client instead of fetch
- [ ] Remove Express server (`src/server.ts`) and related services
- [ ] Update `package.json` scripts for Convex dev/deploy

## Deployment: Vercel + Convex
- [ ] Set up Convex project (`npx convex dev`)
- [ ] Deploy Convex backend (`npx convex deploy`)
- [ ] Create `vercel.json` for static frontend hosting
- [ ] Link Vercel project (`vercel link`)
- [ ] Configure environment variables (Anthropic API key, Convex URL)
- [ ] Set up Vercel ↔ Convex integration
- [ ] Deploy frontend to Vercel
- [ ] Verify end-to-end: frontend (Vercel) → backend (Convex) → Anthropic API

## Git / Push
- [ ] Decide branch strategy (push to `main` or merge `wip/resume-2026-03-03` → `main`)
- [ ] Push landing page fixes
- [ ] Clean up stale branches (`claude/optimistic-leavitt`, `rebuild-sqlite-auth-integration`, `sqlite-auth-anthropic-rebuild`)
