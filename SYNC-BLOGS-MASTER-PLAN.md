# Sync Blogs — Master Build Plan
**Version:** March 2026 | **Status:** Active rebuild from POC

---

## The Real Idea

**"You don't struggle with ideas. You struggle with the gap between how fast you think and how fast you can type and organize."**

Sync Blogs fixes two things:

**1. Thoughts to draft:** Paste in your scattered notes, fragments, voice-to-text dumps, bullet points — anything. We co-edit with you to produce a first draft that sounds exactly like you wrote it. Because you did — we just organized what was already in your head.

**2. Auto-update past writing:** You wrote something 8 months ago. Some of it is now wrong or outdated. We detect exactly which claims aged badly, show you what changed, and let you approve specific edits. You never have to remember to go back and check.

---

## What Competitors Get Wrong (Research Findings)

| Tool | What They Do | What's Wrong |
|------|-------------|--------------|
| TalkNotes / Voicepen | Voice → structured blog post | Transcribes your words, doesn't learn your style or voice |
| Contentpen | Auto-refresh old content | Creates "fake freshness" (just updating dates without substance) |
| Jasper / Copy.ai | AI writes for you | Sounds like AI slop — readers spot it immediately |
| Reword | AI co-editing assistant | Good concept, but no freshness monitoring, no "your voice" profile |
| Blog Recorder | Audio → draft | No style learning, single-use tool |
| Notion AI | In-editor AI assistant | Great for editing, not for thought-to-draft or freshness tracking |

**What everyone gets wrong:**
1. **Voice without personality** — transcription tools produce your words in a generic AI structure. The rhythm is gone. The voice is lost.
2. **Fake freshness** — tools that just change publish dates are now penalized by Google's December 2025 core update. Substantive updates only.
3. **Black box rewrites** — tools rewrite without showing you what changed or why. Users lose trust and stop using it.
4. **No style memory** — every session starts from zero. No tool knows how you write across 50 articles.
5. **Disconnected workflows** — your voice notes, your drafts, your published posts, and your update queue live in 4 different places.
6. **AI replacement, not collaboration** — "just dictate and we do everything" is a red flag. Writers want to be in control.

**What we fix:**
1. Style profile built from YOUR published writing — it learns your voice over time
2. Co-edit model — you're always in the driver's seat. AI proposes, you approve.
3. Transparent updates — every suggested change shows exactly what and why
4. Thought-to-draft, not voice-to-article — paste any format of thinking, we structure
5. Freshness that's substantive — we only flag changes that actually matter
6. One place — drafts, published posts, and update queue all in one UI

---

## Codebase Reality (March 2026)

### What actually works:
- ✅ Post management (create, list, filter, status: draft/published/archived)
- ✅ Revision system (SHA256 hashing, source tracking, version numbering)
- ✅ 3-draft composition (argument/narrative/brief) — template-based only, no AI
- ✅ 5-persona review (Editor, Skeptic, Empath, Philosopher, Coach) — heuristic, no AI
- ✅ Publish flow (private/public, timestamps)
- ✅ Freshness scanning (regex version detection, watchlist, severity classification)
- ✅ Freshness decision workflow (approve/dismiss/snooze)
- ✅ Full end-to-end working flow

### What's missing (everything that makes it real):
- ❌ Zero actual AI — no Anthropic or any LLM installed
- ❌ No style profile (user voice learning)
- ❌ No auth system
- ❌ No real database (JSON file with locking)
- ❌ No frontend framework (vanilla JS — hard to extend)
- ❌ No deployment config
- ❌ Zero tests
- ❌ Thought-to-draft input (paste scattered notes → structure them) — not built

### Stack decision for rebuild:
Keep Express + TypeScript backend (solid). Replace storage + add AI.
- **Keep**: Express 5, TypeScript, route structure, API contracts (14 endpoints)
- **Replace**: JSON storage → **SQLite via Turso** (local-first, no cloud required for MVP)
- **Add**: Anthropic Claude API (co-editing, style analysis, freshness reasoning)
- **Add**: Better Auth or simple JWT (single-user for MVP — just email/password)
- **Replace**: Vanilla JS frontend → **React + Vite** (served by Express, not Next.js)
- **Database schema**: defined in ARCHITECTURE/schema.sql — implement it properly

**Why not Next.js?** This app's backend is Express-native with SSE streaming and complex state. A separate React frontend + Express API is cleaner than forcing App Router.

---

## Core Concepts

### The Style Profile
The single most important technical feature. Learned from the user's existing published writing.

```typescript
type StyleProfile = {
  userId: string,
  vocabulary: {
    preferredWords: string[],      // words they use often
    avoidedWords: string[],        // words they never use
    avgSentenceLength: number,     // in words
    avgParagraphLength: number,    // in sentences
  },
  tone: {
    formality: 0 | 1 | 2 | 3,   // 0=casual, 3=academic
    voice: 'first-person' | 'second-person' | 'mixed',
    opinionated: boolean,          // do they hedge or take stances?
    questionFrequency: number,     // rhetorical questions per 100 words
  },
  structure: {
    preferredDraftStyle: 'argument' | 'narrative' | 'concise',
    usesBulletPoints: boolean,
    usesSubheadings: boolean,
    introPattern: string,          // how they typically start articles
    outroPattern: string,          // how they typically end
  },
  samplePhrases: string[],        // 10-20 phrases extracted from their writing
  lastAnalyzedAt: number,
  analyzedPostCount: number,
}
```

### The Co-Edit Model
Not AI writing FOR you. AI writing WITH you.

```
Input (any format):
  - Scattered bullet points
  - Voice-to-text dump (messy, incomplete sentences)
  - A few paragraphs in random order
  - A thread of ideas from multiple messages

Step 1: Structure analysis
  "I see 4 main ideas here. Here's how I'd organize them: [outline]"
  User approves or reorders the outline.

Step 2: Draft generation
  AI fills in the outline using the user's style profile.
  3 options (argument / narrative / concise).
  Every generated sentence is marked [AI] in the editor.

Step 3: Inline co-editing
  User edits freely. On-demand: select any [AI] sentence → "Rewrite in my style"
  AI rewrites using style profile. Shows 2-3 options, user picks.
  User can also select THEIR OWN writing → "Make this clearer" → AI suggests only.

Step 4: Anti-slop pass (before publish)
  Scans for generic AI patterns ("In conclusion", "It's important to note")
  Flags them. User decides to keep or replace.
  Outputs "sounds like me" score: 0-100.
```

### The Freshness Engine (upgraded)
Current: regex-based version detection.
New: semantic + AI-powered reasoning.

```
Step 1: Periodic scan (weekly per published post)
  - Extract "factual claims" from post using AI (entities, statistics, named tools)
  - Compare against: web search context, current date, known version databases

Step 2: Drift detection (classify)
  Types:
    - Version drift: "uses React 17" but React 19 is current
    - Fact drift: "X company is the market leader" but landscape changed
    - Link drift: external URL now 404 or redirects
    - Opinion drift: user has written a newer post that contradicts an old claim

Step 3: Approval workflow
  Alert: "Your March 2025 article mentions GPT-4 as the latest model. GPT-5 was released in 2025."
  Options:
    a. Add context banner (small note at top of post, doesn't change body)
    b. Approve specific edit (user reviews the exact change before it applies)
    c. Add addendum (section at bottom with "Updated March 2026")
    d. Dismiss (user decides it's fine)

  Rule: NEVER silently rewrite published content. Every change needs approval.
```

---

## Database Schema (Implement Properly This Time)

```sql
-- Users (single-user MVP, multi-user ready)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Style profiles
CREATE TABLE style_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  vocabulary_data TEXT NOT NULL,  -- JSON
  tone_data TEXT NOT NULL,        -- JSON
  structure_data TEXT NOT NULL,   -- JSON
  sample_phrases TEXT NOT NULL,   -- JSON array
  analyzed_post_count INTEGER DEFAULT 0,
  last_analyzed_at INTEGER,
  created_at INTEGER NOT NULL
);

-- Posts
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | published | archived
  visibility TEXT DEFAULT 'private',     -- private | public
  published_at INTEGER,
  freshness_enabled BOOLEAN DEFAULT true,
  last_freshness_scan INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Revisions (content history)
CREATE TABLE revisions (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id),
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,    -- SHA256 for dedup
  source TEXT NOT NULL,          -- manual | ai-generated | ai-assisted
  ai_edit_percentage INTEGER,    -- 0-100 (how much AI contributed)
  word_count INTEGER,
  created_at INTEGER NOT NULL
);

-- Draft sessions (thought-to-draft input)
CREATE TABLE draft_sessions (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id),
  raw_input TEXT NOT NULL,       -- the scattered thoughts pasted in
  detected_ideas TEXT,           -- JSON: AI-extracted structure
  approved_outline TEXT,         -- JSON: user-approved outline
  style TEXT,                    -- argument | narrative | concise
  status TEXT DEFAULT 'pending', -- pending | outlined | drafted | accepted
  created_at INTEGER NOT NULL
);

-- Review runs
CREATE TABLE review_runs (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id),
  revision_id TEXT REFERENCES revisions(id),
  intensity TEXT NOT NULL,       -- gentle | balanced | rigorous
  status TEXT DEFAULT 'pending', -- pending | running | complete
  created_at INTEGER NOT NULL
);

-- Review items (individual feedback from personas)
CREATE TABLE review_items (
  id TEXT PRIMARY KEY,
  review_run_id TEXT REFERENCES review_runs(id),
  persona TEXT NOT NULL,         -- Editor | Skeptic | Empath | Philosopher | Coach
  priority TEXT NOT NULL,        -- now | soon | optional
  feedback TEXT NOT NULL,
  suggestion TEXT,
  target_text TEXT,              -- the excerpt being reviewed
  decision TEXT,                 -- accepted | dismissed | pinned | null
  decided_at INTEGER
);

-- Freshness scans
CREATE TABLE freshness_scans (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id),
  revision_id TEXT REFERENCES revisions(id),
  claims TEXT NOT NULL,          -- JSON: extracted factual claims
  drift_items TEXT,              -- JSON: detected drift events
  scan_status TEXT DEFAULT 'pending',
  scanned_at INTEGER
);

-- Freshness updates (what needs approval)
CREATE TABLE freshness_updates (
  id TEXT PRIMARY KEY,
  scan_id TEXT REFERENCES freshness_scans(id),
  post_id TEXT REFERENCES posts(id),
  claim_text TEXT NOT NULL,      -- the original claim
  drift_type TEXT NOT NULL,      -- version | fact | link | opinion
  drift_explanation TEXT NOT NULL, -- why it's outdated
  suggested_edit TEXT,           -- what to change it to
  severity TEXT NOT NULL,        -- critical | high | low
  decision TEXT,                 -- context-banner | approved-edit | addendum | dismissed
  decided_at INTEGER,
  created_at INTEGER NOT NULL
);

-- Settings
CREATE TABLE settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  user_id TEXT REFERENCES users(id),
  version_watchlist TEXT DEFAULT '[]',  -- JSON array of {name, version, pattern}
  freshness_scan_frequency TEXT DEFAULT 'weekly',
  digest_email TEXT,
  created_at INTEGER NOT NULL
);
```

---

## Phase Breakdown

---

### PHASE 0 — Foundation Rebuild (2-3 days)
**Who:** Codex

```
Working directory: /Users/christiantonny/Documents/sync-blogs
Read CLAUDE.md and SYNC-BLOGS-MASTER-PLAN.md before starting.

Task 1: Install dependencies
  npm install @anthropic-ai/sdk better-sqlite3 @libsql/client jose zod
  npm install --save-dev @types/better-sqlite3 vitest @vitest/coverage-v8

Task 2: Replace JSON storage with SQLite (Turso-compatible)
  File: src/db/index.ts

  Use @libsql/client (works with local SQLite and Turso cloud):
    const client = createClient({
      url: process.env.DATABASE_URL || 'file:./data/syncblogs.db'
    })

  Create: src/db/schema.ts — execute the full SQL schema above on startup
  Create: src/db/migrations.ts — idempotent migration runner

Task 3: Rewrite appService.ts
  File: src/services/appService.ts

  Replace all JSON file read/write operations with SQL queries.
  Keep the same method signatures — no API contract changes.
  All existing API routes must continue to work after this change.

  Critical methods to rewrite:
    - getAllPosts(userId, status?) → SELECT from posts + latest revision
    - getPost(postId) → SELECT post + revisions + latest review
    - createPost(title, userId) → INSERT into posts
    - updatePost(postId, changes) → UPDATE posts
    - saveRevision(postId, content, source) → INSERT into revisions (with SHA256 dedup)
    - saveDraftSession(postId, rawInput) → INSERT into draft_sessions
    - getLatestRevision(postId) → SELECT from revisions ORDER BY created_at DESC LIMIT 1

Task 4: Simple auth (JWT, single-user MVP)
  File: src/auth/index.ts
    - POST /auth/login — verify email/password, issue JWT (7d expiry)
    - POST /auth/register — create user, hash password (bcrypt, 12 rounds)
    - Middleware: verifyJWT(req) → attach userId to request

  Apply middleware to all /v1/* routes.

  Seed a default user for development:
    email: dev@syncblogs.local, password: password123

Task 5: Configure Anthropic
  File: src/ai/client.ts
    import Anthropic from '@anthropic-ai/sdk'
    export const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    export const MODEL = 'claude-sonnet-4-6'

Task 6: Tests
  File: tests/db.test.ts
    - createPost + getPost works
    - saveRevision deduplicates by content hash
    - updatePost changes persist
    - auth: valid credentials → JWT
    - auth: invalid credentials → 401

  File: tests/api.test.ts (use supertest)
    - GET /health → 200
    - POST /auth/login → 200 with token
    - GET /v1/posts without auth → 401
    - GET /v1/posts with valid token → 200

Run: npm run typecheck → 0 errors
Run: npm test → all passing
```

---

### PHASE 1 — Style Profile Engine (2 days)
**Who:** Codex (algorithm + API) + Claude (prompt engineering)

**Codex tasks:**
```
File: src/ai/styleAnalyzer.ts

Function: analyzeWritingStyle(posts: string[]) → StyleProfile

Algorithm:
  1. Combine all post content (revisions where source='manual' only)
  2. Call Claude with the combined text + analysis prompt (see Claude tasks)
  3. Parse structured JSON response
  4. Store in style_profiles table

Function: buildStylePrompt(styleProfile: StyleProfile) → string
  Returns a system prompt fragment like:
  "Write in first person. Use short sentences (avg 12 words).
   Prefer concrete examples over abstractions. Never use 'leverage' or 'utilize'.
   Start paragraphs with a direct claim, not a question."

Route: POST /v1/style/analyze
  - Takes: { postIds: string[] } (which posts to learn from)
  - Runs analyzeWritingStyle on those posts' content
  - Saves to style_profiles table
  - Returns: { profile: StyleProfile, samplePhrases: string[] }

Route: GET /v1/style/profile
  - Returns current style profile
  - If none: { exists: false, message: "Add a post and analyze your style first" }

Tests:
  tests/styleAnalyzer.test.ts:
    - analyzeWritingStyle with 3 mock posts returns valid StyleProfile shape
    - buildStylePrompt returns non-empty string
    - POST /v1/style/analyze stores profile in DB
    - GET /v1/style/profile returns stored profile
```

**Claude tasks (write the prompts, not code):**
```
You are writing the AI prompts for Sync Blogs' style analysis engine.

Write two prompts and add them to: src/ai/prompts/styleAnalysis.ts

Prompt 1: STYLE_ANALYSIS_PROMPT
  System prompt for Claude to analyze a writer's style from their posts.
  Input: combined text of 3-10 posts
  Output: structured JSON matching the StyleProfile type
  The JSON must include:
    - vocabulary (preferredWords[], avoidedWords[], avgSentenceLength, avgParagraphLength)
    - tone (formality 0-3, voice, opinionated, questionFrequency)
    - structure (preferredDraftStyle, usesBulletPoints, usesSubheadings, introPattern, outroPattern)
    - samplePhrases (10-20 real phrases extracted verbatim from their writing)

  The prompt should tell Claude to:
    - Extract patterns from HOW they write, not WHAT they write about
    - Find samplePhrases that capture their unique voice (not generic phrases)
    - Return ONLY valid JSON, no explanation text

Prompt 2: DRAFT_WITH_STYLE_PROMPT
  System prompt for Claude to draft content using a style profile.
  Input: [style profile JSON] + [approved outline] + [preferred style: argument/narrative/concise]
  Output: a draft that sounds like the user wrote it

  The prompt should tell Claude to:
    - Use the samplePhrases as examples of the target voice
    - Match avgSentenceLength within ±3 words
    - Honor the voice (first/second/mixed person)
    - Mark each AI-generated sentence with a data attribute so UI can highlight it
    - Never use: "In conclusion", "It's important to note", "Delve into", "Leverage"
    - Sound opinionated if opinionated=true, hedge if false
```

---

### PHASE 2 — Thought-to-Draft Flow (2-3 days)
**Who:** Codex (backend) + Claude (prompts + UI architecture)

**Codex backend:**
```
File: src/ai/draftComposer.ts

The full thought-to-draft pipeline:

Step 1: extractStructure(rawInput: string) → DetectedIdeas
  Calls Claude with EXTRACT_STRUCTURE_PROMPT
  Returns: { ideas: string[], suggestedOrder: number[], themes: string[] }
  Route: POST /v1/posts/:postId/draft-sessions → creates draft_session record

Step 2: approveOutline(sessionId, approvedOrder: number[]) → ApprovedOutline
  Saves user's approved ordering to draft_sessions.approved_outline
  Route: PATCH /v1/draft-sessions/:sessionId/outline

Step 3: generateDraft(sessionId, style: 'argument'|'narrative'|'concise') → Draft
  Uses buildStylePrompt(styleProfile) + DRAFT_WITH_STYLE_PROMPT
  Generates the draft using approved outline + raw input
  Saves as new revision (source='ai-generated', ai_edit_percentage=100)
  Returns: { content: string, wordCount: number, aiEditPercentage: 100 }
  Route: POST /v1/draft-sessions/:sessionId/generate

Step 4: Anti-slop pass
  Function: detectSlop(content: string) → SlopResult
  Calls Claude with ANTI_SLOP_PROMPT
  Returns: { slopPatterns: string[], soundsLikeMeScore: number, suggestions: string[] }
  Route: GET /v1/posts/:postId/slop-check

Tests:
  tests/draftComposer.test.ts:
    - extractStructure returns ideas array
    - generateDraft returns non-empty content
    - generateDraft saves revision with source='ai-generated'
    - detectSlop returns soundsLikeMeScore between 0-100
    - Full pipeline: POST session → PATCH outline → POST generate → works end-to-end
```

**Claude (prompts):**
```
Add to src/ai/prompts/:

EXTRACT_STRUCTURE_PROMPT:
  Takes raw input (messy notes, bullet points, voice dump)
  Extracts distinct ideas as numbered list
  Suggests logical ordering
  Does NOT clean up or rewrite — just identifies structure
  Output: JSON { ideas: string[], suggestedOrder: number[], themes: string[] }
  Max 8 ideas per draft (if more: group related ones)

ANTI_SLOP_PROMPT:
  Scans draft content for generic AI patterns
  Flags specific phrases that don't sound like authentic writing
  Returns "sounds like me" score and specific suggestions
  Never rewrites — only identifies and suggests
  Output: JSON { slopPatterns: [{phrase, lineNumber, suggestion}], soundsLikeMeScore }

Also architect the React frontend component for the draft flow:
  Create: src/client/components/DraftFlow.tsx (React, Vite-compatible)

  The component has 3 states:
  State 1 (PASTE): Large textarea "Paste your scattered thoughts here"
    + "What format is this?" (bullets / voice notes / random paragraphs)
    + "Analyze Structure" button → calls POST /v1/posts/:postId/draft-sessions

  State 2 (OUTLINE): Shows detected ideas as draggable cards
    + "Reorder until the structure feels right"
    + "Generate Draft" button with style selector (argument/narrative/concise)

  State 3 (DRAFT): Shows generated draft in editor
    + AI-generated sentences highlighted in zinc-700 background
    + Click any AI sentence → "Rewrite in my style" / "Keep as is" / "Delete"
    + "Check for Slop" button → highlights generic patterns
    + "Looks good → Continue to Review"

  Design: zinc palette (same rules as SkillSync). No blues.
```

---

### PHASE 3 — Freshness Engine Upgrade (2 days)
**Who:** Codex (backend) + Claude (prompts)

**Codex backend:**
```
The current freshness engine uses regex to detect version numbers.
We need AI-powered semantic claim extraction + drift detection.

File: src/ai/freshnessEngine.ts

Function: extractClaims(content: string) → Claim[]
  Calls Claude with CLAIM_EXTRACTION_PROMPT
  Returns: [{ text, type: 'version'|'fact'|'stat'|'person'|'tool', confidence }]

Function: detectDrift(claim: Claim, currentDate: Date) → DriftResult | null
  For version claims: check if a newer version exists (use web search context)
  For date claims: check if the referenced period is still current
  For tool claims: check if the tool still exists / has changed significantly
  Returns: { explanation, severity, suggestedEdit } or null if no drift

Function: runFreshnessScan(postId: string) → FreshnessScan
  1. Get latest published revision
  2. extractClaims(content)
  3. For each claim: detectDrift()
  4. Save scan + drift items to DB
  5. Create freshness_updates for each drift item

Route: POST /v1/posts/:postId/freshness-scan (upgrade existing)
  Now uses AI extraction instead of regex

Route: PATCH /v1/freshness-updates/:id
  Body: { decision: 'context-banner' | 'approved-edit' | 'addendum' | 'dismissed' }
  For 'approved-edit': also requires { editedContent: string }
  Saves decision, records timestamp

Tests:
  tests/freshnessEngine.test.ts:
    - extractClaims: detects version mentions
    - extractClaims: detects statistics ("X% of companies...")
    - detectDrift: returns null for claims that are still accurate
    - runFreshnessScan: saves results to DB
    - Decision 'approved-edit' requires editedContent
    - Decision 'dismissed' sets decided_at timestamp
```

**Claude (prompts):**
```
Add to src/ai/prompts/freshness.ts:

CLAIM_EXTRACTION_PROMPT:
  Reads post content and extracts factual claims that could become outdated.
  Focus on: version numbers, statistics, named tools/products, named companies/people,
            time references ("currently", "as of 2024"), rankings, prices
  Do NOT flag: timeless truths, author opinions, general principles
  Output: JSON array of { text, type, startIndex, confidence }

DRIFT_DETECTION_PROMPT:
  Takes a specific claim + current date.
  Assesses: is this claim likely still accurate?
  For version claims: is there a newer major version?
  For statistics: is this data likely still representative?
  Output: JSON { isDrifted: boolean, explanation?, severity?, suggestedEdit? }
  Conservative: only flag high-confidence drift. Don't flag everything.

EDIT_APPROVAL_PROMPT:
  When user selects "approved-edit":
  Takes original claim + user's approved change direction + style profile
  Produces a specific edited sentence that:
    - Fixes the outdated information
    - Maintains the user's voice and style
    - Is minimal (changes only what needs changing)
  Output: { editedSentence, explanation }
```

---

### PHASE 4 — React Frontend (2-3 days)
**Who:** Claude

```
Working directory: /Users/christiantonny/Documents/sync-blogs

Replace the vanilla JS frontend with React + Vite.
Express serves the built React app at GET * (catch-all).
All API calls go to the same Express server (no CORS needed).

Stack: React 18, Vite, TypeScript, Tailwind CSS 3, Lucide React

Setup:
  mkdir client && cd client
  npm create vite@latest . -- --template react-ts
  npm install tailwindcss lucide-react
  Configure: build output → ../public/dist (served by Express)
  Express: app.use(express.static('public/dist')) + catch-all → index.html

Pages to build:

/              → Posts list (all posts: drafts + published + archived)
/posts/new     → New post (title input → DraftFlow component OR blank editor)
/posts/:id     → Editor view (rich text, revision history panel)
/posts/:id/review → Review run display (persona feedback, accept/dismiss)
/posts/:id/freshness → Freshness dashboard (scans, drift items, approval queue)
/settings      → Version watchlist, scan frequency, style profile status

Global layout:
  Left sidebar (200px):
    - "Sync" wordmark (text-lg font-semibold)
    - Nav: Posts (FileText), New Draft (Plus), Freshness (RefreshCw), Settings (Settings)
    - Style profile status: "Voice learned from 12 posts" or "Analyze your voice →"
    Active states: bg-zinc-800 text-zinc-100 (same rules as SkillSync)
  Mobile: bottom tab bar (same pattern as SkillSync)

Post List (/ page):
  - Tab bar: All | Drafts | Published | Archived
  - Post cards: title, status, word count, "sounds like me" score (if analyzed), last updated
  - Quick actions: edit, publish, archive, scan freshness
  - Empty state: "Start by pasting your first set of thoughts" → /posts/new

Editor (/posts/:id):
  - Clean writing area: max-w-2xl mx-auto, generous padding
  - No WYSIWYG toolbar clutter — minimal: Bold, Italic, H2, Link, Code (5 buttons)
  - AI-generated sections highlighted (subtle bg-zinc-800/50 background)
  - Click highlighted section → popover: "Rewrite in my style" | "Edit manually" | "Remove highlight"
  - Autosave (every 30s + on blur)
  - Sidebar (right, collapsible): revision history, word count, "sounds like me" score

Freshness Dashboard (/posts/:id/freshness):
  - "Last scanned: X days ago" + "Scan Now" button
  - List of detected drift items:
    * Claim text (quoted)
    * Drift type badge (Version / Fact / Link)
    * Severity (Critical: red, High: amber, Low: zinc)
    * "Why this is outdated" explanation
    * Decision buttons: "Add Context Banner" | "Approve Edit" | "Add Addendum" | "Dismiss"
  - When "Approve Edit" clicked: show side-by-side diff (original vs. suggested)
    User can modify the suggestion before approving
  - Approved edits queue: "3 edits approved, apply all to post"

Design rules (same as SkillSync and BZ):
  - bg-zinc-950 page, bg-zinc-900 cards, border-zinc-800
  - text-[13px] nav, text-sm content
  - No blues/purples/greens in chrome
  - Framer Motion for nav active pill and modal transitions
  - Keyboard: Cmd+S = save, Esc = close modals, / = focus search
```

---

### PHASE 5 — Real AI Review Personas (1 day)
**Who:** Codex (wiring AI to existing persona system) + Claude (system prompts)

**Codex:**
```
The 5 personas already exist as heuristics. Replace with real Claude calls.

File: src/ai/personas.ts

Each persona is a Claude call with a different system prompt + same draft content.
Run all 5 in parallel (Promise.all).

Function: runPersonaReview(persona: PersonaName, content: string,
                           intensity: 'gentle'|'balanced'|'rigorous',
                           styleProfile?: StyleProfile) → ReviewItem[]

All persona calls use:
  - Same user content
  - Different system prompt (see Claude tasks)
  - intensity passed as instruction modifier
  - styleProfile used to contextualize feedback ("this person prefers directness")

Aggregate results: sort by priority (now > soon > optional), then by persona weight.

Update route: POST /v1/posts/:postId/review-runs
  Now calls runPersonaReview for each persona
  Saves ReviewItems to DB (replacing in-memory heuristic results)

Tests:
  tests/personas.test.ts:
    - Each persona returns at least 1 ReviewItem
    - All 5 run in parallel (mock timing: total < max single persona time * 1.5)
    - gentle intensity: max 3 "now" items, max 5 total
    - rigorous intensity: more items returned
    - ReviewItems have valid priority and feedback fields
```

**Claude (write the 5 system prompts):**
```
File: src/ai/prompts/personas.ts

Write 5 distinct system prompts for these review personas:

1. EDITOR: Grammar, structure, clarity. Finds unclear sentences, passive voice, redundancy.
   Tone: professional, constructive. Never harsh. Focus: "This could be clearer."

2. SKEPTIC: Challenges claims, asks for evidence. Flags unsupported assertions.
   Tone: analytical, direct. "What's the evidence for this?" energy.
   Does NOT nitpick style — only logical/factual issues.

3. EMPATH: Audience perspective. "Will readers understand this?" focus.
   Tone: warm, reader-advocate. Flags jargon, assumes knowledge, loses the reader.

4. PHILOSOPHER: Deeper thinking. "Have you considered the opposite?" energy.
   Flags: contradictions, oversimplifications, missed nuance.
   Tone: thoughtful, non-judgmental. Asks questions rather than asserting.

5. COACH: Motivational, voice preservation. "This is good, make it better."
   Flags: great sentences to keep, voice moments that are uniquely them.
   Also: "This sounds like every other tech blog, not like you."

Each prompt must:
  - Define what the persona ONLY looks for (scope)
  - Specify output format: JSON array of { priority, feedback, suggestion, targetText }
  - Match intensity modifier: gentle (few items), balanced (moderate), rigorous (thorough)
  - Reference the style profile to calibrate expectations
```

---

### PHASE 6 — Deployment + Auth Hardening (1 day)
**Who:** Codex

```
Task 1: Production deployment config
  Option A: Railway (recommended for Node.js + SQLite → Turso cloud)
    - Add railway.json config
    - DATABASE_URL: turso cloud URL (libsql://)
    - Environment vars: ANTHROPIC_API_KEY, JWT_SECRET, DATABASE_URL

  Option B: Fly.io
    - fly.toml config
    - Persistent volume for SQLite (if not using Turso)

  File: .env.example — document all required vars

Task 2: Turso migration (if using Railway)
  Turso is LibSQL (SQLite-compatible) with cloud sync.
  Update src/db/index.ts to use Turso URL in production:
    url: process.env.DATABASE_URL || 'file:./data/syncblogs.db'
  This works identically in dev (file:) and prod (Turso URL).

Task 3: Auth hardening
  - JWT_SECRET: must be set via environment (min 32 chars)
  - Refresh tokens: implement 30-day refresh + 1-hour access token
  - Rate limiting: POST /auth/login → 5 attempts per 15 minutes per IP

Task 4: Full test run
  npm test → all passing
  npm run typecheck → 0 errors
  npm run build → no errors
```

---

## Agent Prompt Templates

### Starting a Claude session on Sync Blogs:
```
You are working on Sync Blogs — an AI co-editing tool for writers.
Working directory: /Users/christiantonny/Documents/sync-blogs

Read before writing:
1. CLAUDE.md (architecture, existing API routes)
2. SYNC-BLOGS-MASTER-PLAN.md (build plan + database schema)

Stack: Express 5, TypeScript, SQLite (Turso), React + Vite (client/), Anthropic Claude API
API contract: 14 existing routes must keep the same signatures
Auth: JWT middleware on all /v1/* routes (req.userId attached)

Core principle: Co-edit, not auto-write.
Every AI suggestion is marked. Every change needs user approval.
Never silently modify published content.

Run: npm run typecheck after every change.
```

### Starting a Codex session on Sync Blogs:
```
Working directory: /Users/christiantonny/Documents/sync-blogs
Read CLAUDE.md and SYNC-BLOGS-MASTER-PLAN.md before starting.

Only touch: src/, tests/ — not client/ (React frontend is Claude's)
Database: SQLite via @libsql/client (see src/db/schema.ts)
Write tests first, then implement.
Keep existing API route signatures — do not change method signatures.
Run npm test when done.
```

---

## Timeline Summary

| Phase | Owner | Est. Time | Gate |
|-------|-------|-----------|------|
| 0 — Foundation rebuild (SQLite + auth) | Codex | 2-3 days | all API tests pass |
| 1 — Style profile engine | Codex + Claude | 2 days | profile analyzes from posts |
| 2 — Thought-to-draft flow | Codex + Claude | 2-3 days | full pipeline works |
| 3 — Freshness engine upgrade | Codex + Claude | 2 days | AI detects and surfaces drift |
| 4 — React frontend | Claude | 2-3 days | all pages render, forms work |
| 5 — AI personas | Codex + Claude | 1 day | all 5 personas return feedback |
| 6 — Deployment | Codex | 1 day | live URL works |

**Total: ~12-14 days**

---

## What Makes This Different

The writing tool world has two problems: tools that replace your voice, and tools that just transcribe your words.

Sync Blogs does neither. It's a **co-editor** — it works with what you already have in your head, organizes it in your structure, writes in your vocabulary, and lets you edit every single line before it ships.

The freshness engine is the moat. Nobody else combines:
- Style-aware edits (changes in your voice, not generic AI)
- Full transparency (you see exactly what changed and why)
- Zero silent rewrites (published content only changes with your explicit approval)

**The pitch:** "You wrote 40 articles last year. 12 of them have outdated information. We found them. Here's exactly what changed. Approve 8 edits in 15 minutes — your archive stays accurate without you having to remember to check."
