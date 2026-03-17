# Sync Blogs v2 — Status, Bugs & Work Needed

> **For the next dev**: Assume nothing works correctly unless explicitly marked ✅ below.
> Every section documents what was *attempted*, what actually *works*, and what *needs fixing*.
> The app builds and deploys, but large parts of the UX are broken or incomplete.

---

## Live URLs

| Environment | URL |
|---|---|
| **Vercel (production)** | https://sync-blogs-v2.vercel.app |
| **Convex prod backend** | https://majestic-seal-152.convex.cloud |
| **Convex dev backend** | https://basic-nightingale-994.convex.cloud |
| **Convex dashboard** | https://dashboard.convex.dev — logs, queries, mutations visible here |

---

## Deployment Setup (READ THIS BEFORE TOUCHING ANYTHING)

The app has two separate backends that must both be deployed independently.

### 1. Next.js → Vercel
```bash
cd sync-blogs-v2
vercel --prod --yes
```

### 2. Convex functions → production
```bash
cd sync-blogs-v2
npx convex deploy --yes
```

### 3. Convex functions → dev (local development)
```bash
# In one terminal, keep running:
npx convex dev

# In another terminal:
npm run dev
```

### Why you need both Convex deploys
- Local `npm run dev` talks to the **dev** Convex deployment (`basic-nightingale-994`)
- Vercel production talks to the **prod** Convex deployment (`majestic-seal-152`)
- These are two separate function+schema deployments — a change pushed to prod does NOT
  update dev and vice versa
- **Root cause of most "validator error" bugs**: code changes to `convex/` are not
  deployed to the deployment the running app is pointing at
- After any change to `convex/` files, run BOTH `npx convex dev --once` (dev) AND
  `npx convex deploy --yes` (prod), then redeploy Vercel

### Environment variables
- `.env.local` → dev Convex URL (`basic-nightingale-994`)
- Vercel env → prod Convex URL (`majestic-seal-152`) — set via Vercel dashboard
- `ANTHROPIC_API_KEY` must be set in Convex env vars (not .env.local):
  ```bash
  npx convex env set ANTHROPIC_API_KEY sk-ant-...
  ```
  Verify it's set: `npx convex env list`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router, React 19 |
| Backend | Convex (real-time DB + serverless functions) |
| Auth | `@convex-dev/auth` (email/password + magic link) |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) — `claude-sonnet-4-6` default |
| Styling | Tailwind + custom CSS vars in `globals.css` |
| Markdown | `react-markdown` + `remark-gfm` |

---

## Feature Status

### ✅ Auth (working)
Sign in / sign up works. Session persists. Middleware protects `/app` routes.
One known issue: no user isolation on DB queries by default — see "Security" section below.

### ✅ Sidebar + post list (working)
Lists posts, filters by status, creates new post, delete with confirmation dialog (hover
trash icon). Delete cascades to revisions, review runs, review items, freshness updates,
task progress records.

### ⚠️ Compose flow (partially working — flaky)
The compose flow has 3 stages: thoughts → clarify → drafts.

**What works:**
- Rough input auto-saves to DB (debounced 1s)
- Textarea auto-expands as user types
- Clarifying questions generate via AI (Anthropic API call)
- 3 draft options generate (Argument / Narrative / Brief)
- Draft selection navigates to editor

**Known bugs:**
1. **Draft cards all show same 316-word content** — Intermittent. Root cause: legacy posts
   that generated drafts before the `generatedDrafts` field was added to `draftProgress`
   fall back to `getGeneratedDrafts` (revisions query). After selecting a draft, a 4th
   generated revision is created; the query's `slice(0,3)` then returns 2 originals + 1
   duplicate. Fix: ensure `generatedDrafts` is populated in `draftProgress` for all posts
   (migration needed for legacy posts).

2. **"Back to questions" loop** — Clicking back from draft selection should go to clarify
   stage. It clears `generatedDrafts: []` to prevent resume. For legacy posts using the
   revisions fallback, clearing `generatedDrafts` won't help because the fallback still
   finds revisions. Full fix: migrate all posts to use `draftProgress.generatedDrafts`.

3. **Compose flow sometimes shows thoughts stage instead of drafts** — Resume logic runs
   in a `useEffect` that fires when `draftProgress` and `generatedRevisions` resolve.
   If those queries arrive in the wrong order or after `initializedRef` is already set,
   the stage won't be correctly restored.

4. **"Turn this into a draft" can fail if Convex validator mismatch** — If the dev and
   prod Convex deployments are out of sync, the client sends args that don't match the
   deployed validator. Always run `npx convex dev --once` AND `npx convex deploy --yes`
   after any change to `convex/` files.

### ⚠️ Editor (partially working — UX broken)
**What works:**
- Auto-saves content as revisions (1.5s debounce)
- Edit / Preview tab toggle (Preview renders markdown via `react-markdown`)
- Title editing auto-saves
- "Switch draft" button returns to compose flow

**Known bugs:**
1. **Edit mode has no markdown rendering** — The textarea shows raw markdown (`## Header`,
   `**bold**`). Only Preview mode renders it. The user never sees formatted text while
   typing. Needs either: a live markdown editor (e.g. `@uiw/react-md-editor` or
   `@milkdown/kit`) or at minimum split-pane edit+preview.

2. **Textarea is too small by default** — The content textarea has no auto-resize and
   users must scroll within it. The title textarea auto-resizes (uses `scrollHeight`)
   but the content textarea does not. Add the same pattern.

3. **No word count or reading time in editor** — Users want to see "850 words · 4 min read"
   while writing.

4. **No unsaved indicator that's reliable** — The `SaveStatus` component shows "saving" /
   "saved" but if the user types quickly and navigates away, the debounced save may not
   fire in time. No "unsaved changes" warning on navigation.

### ⚠️ Review (implemented but broken UX)
**What was attempted:**
- Two AI personas (Craft, Truth) run in parallel and return JSON feedback items
- Feedback shown in a side panel inside the editor
- "Got it" streams the fixed article back via Convex `streamContent` field
- "Skip" dismisses the item

**Known bugs:**
1. **"Got it" rewrites the ENTIRE article** — This is by design in `applyReviewFix`:
   the AI receives the full article + one issue + suggestion and returns the full modified
   article. This is expensive, slow, and often changes more than just the targeted fix.
   Better approach: surgical patch (find+replace the affected sentence/paragraph only).

2. **Review only processes one item at a time** — Can't apply multiple fixes concurrently.
   The `applyingItemId` lock blocks all other items while one fix streams. Items should
   be processable independently.

3. **Streaming UI is janky** — The streaming editor replaces the textarea while the AI
   writes. When streaming finishes, the textarea snaps back. The transition is abrupt.

4. **Review panel UI is small and cramped** — The `review-side-panel` uses a fixed width
   that may overflow or be too narrow on smaller screens. Not responsive.

5. **Review runs accumulate** — Every time the user clicks "Review this draft", a new
   `reviewRun` is created. Old runs and their items persist. There's no UI to see or
   manage past runs. The editor only shows the most recent completed run.

6. **No re-review after making edits** — After applying fixes, if the user edits the
   article manually, there's no obvious way to trigger a fresh review (the button says
   "View review" and just opens the old panel). Should detect content changes and offer
   a fresh review.

7. **Review page (`/app/[postId]/review`) exists but is orphaned** — There's a "Full
   review page →" link in the panel footer but the review page UI was not fully
   updated to match the new review data model. May render incorrectly.

### ❌ Freshness scan (structurally implemented, results unreliable)
**What was attempted:**
- Uses Anthropic's built-in `web_search_20250305` tool — no external API key needed
- Single API call; Anthropic executes searches server-side
- Results saved to `freshnessUpdates` table with severity / suggestedAction / sourceLinks

**Known issues:**
1. **Freshness results have no UI on the editor page** — After scanning, results are saved
   to the DB but there's no indicator in the editor showing that freshness issues were found.
   Results are only visible on the (non-functional) review page.

2. **`web_search_20250305` availability is not guaranteed** — This is a beta Anthropic
   tool. If the model or account tier doesn't support it, the call silently falls back
   to the model's training knowledge, which may hallucinate version numbers.

3. **No way for the user to act on freshness results** — The schema has
   `approve / dismiss / snooze` actions but there's no UI that surfaces them.

### ❌ Settings (partially implemented)
**What works:**
- AI model selector — saves `preferredModel` to `users` table, all AI actions read it

**What's broken:**
1. **Writing profile display is read-only** — The settings page shows the writing profile
   that was set during onboarding but the user can't edit it. No way to update preferences
   without re-doing onboarding.

2. **Onboarding can be re-triggered from settings** — There's no link/button to do this.

3. **No usage stats** — No dashboard showing tokens used per generation, cost estimates,
   or API call history. This requires storing `usage.input_tokens` / `usage.output_tokens`
   from each Anthropic API response (already available in the response object — just not
   being saved).

---

## AI Prompting Issues

All AI calls are in `convex/ai.ts`. Current state:

### ❌ No prompt caching
Anthropic's prompt caching (`cache_control: { type: "ephemeral" }`) is not implemented.
Every call sends the full context. For long articles, this wastes tokens and slows
response times. The writing profile and system prompt are identical across calls and
are prime caching candidates.

### ❌ No token tracking
`response.usage.input_tokens` and `response.usage.output_tokens` are available on every
Anthropic response but are not saved anywhere. No way to see cost or usage per action.
To fix: add a `tokenUsage` table and log every AI call's usage there.

### ❌ formattingAvoid not fully honored
`writingProfile.formattingAvoid` (set during onboarding) is partially wired in
`composeDrafts` but not in `runReview` or `applyReviewFix`. The review AI may still
introduce forbidden patterns.

### ⚠️ Em-dash handling (attempted, not fully tested)
`composeDrafts` has explicit `NEVER use em-dashes` instruction if `formattingAvoid`
includes `"em-dashes"`. Not verified end-to-end. Other actions (`runReview`,
`applyReviewFix`) don't check `formattingAvoid` at all.

### ❌ No structured logging UI
AI logs appear in the Convex dashboard (`console.log` statements in action handlers).
There's no in-app log viewer. Developers must open the Convex dashboard to see what
the AI generated, what errors occurred, and how long each action took.
URL: https://dashboard.convex.dev → select project → Functions → Logs

### ❌ JSON parse fragility
`parseJson()` in `convex/ai.ts` has a recovery heuristic that tries to fix truncated
JSON from the AI. It works sometimes. When it fails, the entire action throws and the
user sees a generic error. The `composeDrafts` action retries up to 3 times with
`max_tokens: 20000` to avoid truncation but this is expensive.

---

## Security Issues

### ❌ No server-side user ownership validation
Convex queries and mutations take `userId` as a plain argument from the client.
There's no server-side check that the authenticated user matches the `userId` being
passed. This means a user could pass another user's `userId` to read or modify their
posts. Fix: use `ctx.auth.getUserIdentity()` in each mutation/query to validate the
caller.

### ❌ Post access is not scoped to owner
`getPost({ postId })` returns any post regardless of which user is logged in.
No authorization check.

---

## Database Schema Notes

All tables are in `convex/schema.ts`.

| Table | Purpose | Notes |
|---|---|---|
| `users` | Auth + writing profile + preferred model | Extended from `@convex-dev/auth` authTables |
| `posts` | Post metadata + draftProgress | `draftProgress` is a JSON blob — can get out of sync |
| `revisions` | Content snapshots | Every save creates a new row. No cleanup/pruning. |
| `reviewRuns` | Review session metadata | Accumulates indefinitely — no cleanup |
| `reviewItems` | Individual feedback items | Linked to `reviewRuns` by `runId` |
| `freshnessUpdates` | Freshness scan results | No UI to surface these |
| `taskProgress` | Streaming progress + streamContent | Used for live AI streaming to UI |
| `settings` | Version watchlist (unused) | Watchlist UI was removed; table stays |

### draftProgress object (lives on `posts` table)
```typescript
{
  roughInput?: string;          // user's raw notes
  clarifyingQuestions?: any;    // AI-generated questions array
  clarifyingAnswers?: any;      // user's answers
  draftChosen?: boolean;        // true = user selected a draft, show editor
  generatedDrafts?: any;        // array of {content, titleSuggestion} — new field
}
```
**Warning**: `generatedDrafts` was added mid-development. Existing posts in the DB
don't have it. The UI has a fallback to `getGeneratedDrafts` (revisions query) for
legacy posts, but that fallback has the duplicate-content bug described above.

---

## Known Missing Features (not attempted at all)

1. **Tags / categories** — Schema has `tags: string[]` on posts but no UI to set them
2. **Post visibility (public/private)** — Schema has `visibility` field, `publishPost`
   sets it, but there's no public-facing read route (`/posts/[slug]`) to serve published posts
3. **Collaboration** — Single-user only; no sharing, no team workspaces
4. **Export** — No way to export a post as Markdown, HTML, or PDF
5. **Import** — No way to import existing posts from other platforms
6. **Version history UI** — Revisions are saved but no UI to browse or restore them
7. **Mobile layout** — App has a sidebar-based layout that doesn't adapt to mobile.
   Sidebar overlaps content on narrow viewports.
8. **Dark mode** — CSS vars exist for theming but no dark mode toggle
9. **Keyboard shortcuts** — None implemented
10. **Undo/redo for AI fixes** — When "Got it" applies a fix, there's no undo button.
    The previous revision is saved in the `revisions` table but there's no UI to restore it.

---

## Recommended Fix Order for Next Dev

Priority is based on impact on core user flow (write → review → publish):

| Priority | Issue | Effort | Where |
|---|---|---|---|
| P0 | Editor textarea doesn't auto-resize | Small | `post-editor.tsx` |
| P0 | Edit mode shows raw markdown (no rendering) | Medium | `post-editor.tsx`, add md editor lib |
| P0 | "Got it" rewrites full article instead of targeted patch | Large | `convex/ai.ts:applyReviewFix` |
| P1 | Review panel: allow processing multiple items without lock | Medium | `post-editor.tsx` |
| P1 | Server-side user ownership checks on all mutations | Medium | `convex/posts.ts`, `convex/reviews.ts` etc. |
| P1 | Token usage logging + settings page display | Medium | `convex/ai.ts`, new `tokenUsage` table |
| P1 | Writing profile editable in settings (not just onboarding) | Medium | `src/app/app/settings/page.tsx` |
| P2 | Freshness results surfaced in editor UI | Medium | `post-editor.tsx` or new component |
| P2 | Prompt caching on system prompts and writing profile | Small | `convex/ai.ts` |
| P2 | formattingAvoid in runReview + applyReviewFix | Small | `convex/ai.ts` |
| P2 | Migrate legacy posts to use `draftProgress.generatedDrafts` | Small | One-time Convex migration script |
| P3 | Mobile responsive layout | Large | `globals.css`, layout components |
| P3 | Public post view route | Medium | New `src/app/posts/[slug]/page.tsx` |
| P3 | Revision history browser in editor | Medium | New component + revisions query |

---

## File Map (start here when picking up the codebase)

```
sync-blogs-v2/
├── convex/                        # All backend logic (Convex serverless)
│   ├── schema.ts                  # All table definitions — read this first
│   ├── ai.ts                      # All Anthropic API calls (compose, review, freshness, fix)
│   ├── posts.ts                   # Post CRUD + draftProgress + deletePost (cascade)
│   ├── revisions.ts               # Content revision snapshots
│   ├── reviews.ts                 # Review runs and items
│   ├── freshness.ts               # Freshness update records
│   ├── taskProgress.ts            # Streaming progress state
│   ├── users.ts                   # User profile + preferred model
│   └── auth.config.ts             # @convex-dev/auth configuration
│
├── src/
│   ├── app/
│   │   ├── app/
│   │   │   ├── [postId]/
│   │   │   │   ├── page.tsx       # Route: shows ThoughtsInput OR PostEditor
│   │   │   │   └── review/
│   │   │   │       └── page.tsx   # Review page (mostly orphaned — see review bugs)
│   │   │   ├── settings/
│   │   │   │   └── page.tsx       # Settings: model selector + writing profile (read-only)
│   │   │   └── page.tsx           # /app root — redirects or shows first post
│   │   ├── onboarding/
│   │   │   └── page.tsx           # Writing profile setup (multi-step)
│   │   └── globals.css            # All custom CSS — Tailwind + CSS vars + component classes
│   │
│   ├── components/
│   │   ├── compose/
│   │   │   ├── thoughts-input.tsx # Stage manager: thoughts → clarify → drafts
│   │   │   ├── clarify-questions.tsx
│   │   │   └── draft-options.tsx  # 3 draft cards with select button
│   │   ├── editor/
│   │   │   └── post-editor.tsx    # Main editor: textarea + review side panel + streaming
│   │   ├── layout/
│   │   │   ├── sidebar.tsx        # Post list, new post, delete, filter, settings link
│   │   │   └── app-shell.tsx      # Sidebar + main content layout
│   │   └── publish/
│   │       └── publish-dialog.tsx # Publish modal (visibility selector)
│   │
│   └── lib/
│       ├── constants.ts           # PERSONAS, PRIORITY_LABELS, POST_STATUSES
│       └── onboarding-questions.ts # All onboarding step definitions
```
