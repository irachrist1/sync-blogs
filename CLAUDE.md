# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## What This Is

Sync Blogs — AI-assisted blogging tool with draft composition, multi-persona review, and content freshness monitoring. Express backend, vanilla JS frontend, JSON file storage. No external AI API installed yet — review and freshness use local heuristics.

## Commands

```bash
npm run dev          # Dev server with hot reload (tsx watch, port 4000)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled server (node dist/server.js)
npm run typecheck    # Type check without emitting
```

## Architecture

### Tech Stack
- Express 5 with TypeScript (ES modules)
- Vanilla JavaScript + HTML/CSS frontend (no framework)
- JSON file storage (`data/store.json`) with in-memory caching
- tsx for development watch mode

### Directory Structure
```
src/
  server.ts                # Express app + route definitions
  services/appService.ts   # Central state management & persistence
  composer/compose.ts      # Draft generation templates
  orchestrator/            # Persona aggregation & scoring
  freshness/severity.ts    # Drift classification logic
public/
  app.js                   # SPA client code
  index.html               # Shell & component layout
  styles.css               # UI styling
data/
  store.json               # Persistent data (posts, revisions, feedback, settings)
```

### API Routes
- `GET /health` — Health check
- `GET /v1/posts` — List posts (with status filter)
- `GET /v1/posts/:postId` — Get single post
- `PATCH /v1/posts/:postId` — Update post
- `POST /v1/posts/:postId/revisions` — Save content revision
- `POST /v1/posts/:postId/compose` — Generate draft options from rough thoughts
- `POST /v1/posts/:postId/review-runs` — Trigger review (intensity: gentle/balanced/rigorous)
- `POST /v1/posts/:postId/publish` — Publish with visibility
- `POST /v1/posts/:postId/freshness-scan` — Scan for outdated versions
- `GET /v1/freshness/updates` — List freshness updates
- `POST /v1/review-items/:itemId/decision` — Apply feedback decision
- `GET /v1/settings` — Get version watchlist
- `PATCH /v1/settings` — Update version watchlist

### Data Flow
1. User creates/edits posts → saves revisions
2. Compose generates 3 draft templates (argument/narrative/brief)
3. Review runs through 5 personas (Editor, Skeptic, Empath, Philosopher, Coach)
4. Freshness scan detects outdated version references against watchlist
5. Updates queue supports approve/dismiss/snooze actions

## Key Patterns

- **Stateless routes**: All state lives in AppService, routes are thin wrappers
- **Persona-based review**: 5 static personas with different perspectives
- **Priority-weighted scoring**: Issues ranked by confidence x priority multiplier
- **Version monitoring**: Regex extraction + watchlist comparison
- **In-memory + JSON persistence**: AppService loads store.json on startup, writes on mutation

## Environment Variables

```
PORT=4000    # Server port (default: 4000)
```

## Current State

Functional single-page blogging app. Draft composition, persona review, and freshness monitoring all work with local heuristics. No external AI API integrated yet — compose and review are template/rule-based. JSON storage works for single user. Version watchlist initialized with `codex: 5.3`.
