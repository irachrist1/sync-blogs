# Sync Blogs

Private, AI-integrated personal blogging platform focused on:

- idea-first drafting
- voice-preserving refinement
- post-publish freshness updates with approval workflow

## Run the app

```bash
npm install
npm run dev
```

Open:

- `http://localhost:4000`

## What is implemented

- Full browser app (`public/`) served by Express.
- Post creation, selection, title editing, revision saving.
- "Start from thoughts" draft generation (argument/narrative/brief).
- AI collaborator review with prioritized feedback and decision actions.
- Publish (private/public) and freshness scan workflow.
- Freshness queue with approve/dismiss/snooze actions.
- Persistent local data storage in `data/store.json`.
- Version watchlist settings used by freshness checks.

## Useful API endpoints

- `GET /health`
- `GET /v1/posts`
- `POST /v1/posts`
- `GET /v1/posts/:postId`
- `POST /v1/posts/:postId/revisions`
- `POST /v1/posts/:postId/compose`
- `POST /v1/posts/:postId/review-runs`
- `POST /v1/posts/:postId/publish`
- `POST /v1/posts/:postId/freshness-scan`
- `GET /v1/freshness/updates?status=needs_review`

## Local checks

```bash
npm run typecheck
```

## Project layout

- `public/`: web client UI.
- `src/`: server and service logic.
- `data/store.json`: local persistence file.
- `DOCS/`: product and UX docs.
- `ARCHITECTURE/`: API/schema/orchestration specs.
- `TASKS/`: implementation backlog.
