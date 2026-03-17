# Sync Blogs — Full Migration Plan

> **Goal**: Migrate from vanilla JS + Express + JSON file storage to a modern, production-ready stack that never loses data on redeploy.

---

## New Stack

| Layer | Current | New | Why |
|-------|---------|-----|-----|
| Frontend | Vanilla JS SPA (`app.js`) | **Next.js 15 (App Router) + React** | SSR for SEO, component model, ecosystem |
| Styling | Raw CSS (`styles.css`) | **Tailwind CSS + shadcn/ui** | Rapid UI, consistent design tokens, accessible components |
| Backend | Express 5 + JSON files | **Convex** | Reactive database, real-time sync, zero data loss |
| Auth | Custom scrypt + JSON sessions | **Clerk** | Persistent auth, OAuth, production-grade |
| AI | Anthropic SDK in Express routes | **Convex Actions** | Same SDK, but results persist reactively |
| Hosting | Railway (ephemeral FS) | **Vercel (frontend) + Convex Cloud (backend)** | Free tier, zero-config deploys |

---

## Phase 1: Scaffold & Foundation

### 1.1 Create Next.js project
```bash
npx create-next-app@latest sync-blogs-v2 --typescript --tailwind --eslint --app --src-dir
```

### 1.2 Install Convex
```bash
cd sync-blogs-v2
npm install convex
npx convex init
```

### 1.3 Install Clerk
```bash
npm install @clerk/nextjs
```
- Create Clerk project at clerk.com
- Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`
- Add `NEXT_PUBLIC_CONVEX_URL` to `.env.local`

### 1.4 Install shadcn/ui
```bash
npx shadcn@latest init
```
- Choose "New York" style, slate base color
- Install needed components incrementally: `button`, `input`, `textarea`, `dialog`, `card`, `badge`, `tabs`, `select`, `toast`, `progress`, `skeleton`, `avatar`

### 1.5 Wire Convex + Clerk + Next.js
Create the provider wrapper:
```
src/app/layout.tsx        → ClerkProvider + ConvexProviderWithClerk
src/app/providers.tsx      → Client component with ConvexReactClient
```

Follow: https://docs.convex.dev/auth/clerk

---

## Phase 2: Convex Schema & Backend

### 2.1 Define Schema (`convex/schema.ts`)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    onboardingCompleted: v.boolean(),
    writingProfile: v.object({
      destination: v.optional(v.array(v.string())),
      tone: v.optional(v.array(v.string())),
      sentenceStyle: v.optional(v.array(v.string())),
      structure: v.optional(v.array(v.string())),
      lengthPreference: v.optional(v.array(v.string())),
      perspective: v.optional(v.array(v.string())),
      personalStories: v.optional(v.array(v.string())),
      hookPreference: v.optional(v.array(v.string())),
      formattingHabits: v.optional(v.array(v.string())),
      topicDomains: v.optional(v.array(v.string())),
    }),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  posts: defineTable({
    userId: v.id("users"),
    title: v.string(),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    visibility: v.union(v.literal("private"), v.literal("public")),
    tags: v.array(v.string()),
    monitorFreshness: v.boolean(),
    publishedAt: v.optional(v.number()),
    draftProgress: v.optional(v.object({
      roughInput: v.optional(v.string()),
      clarifyingQuestions: v.optional(v.any()),
      clarifyingAnswers: v.optional(v.any()),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  revisions: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    revisionNumber: v.number(),
    content: v.string(),
    contentHash: v.string(),
    source: v.union(v.literal("manual"), v.literal("generated"), v.literal("imported")),
    titleSuggestion: v.optional(v.string()),
  })
    .index("by_post", ["postId"])
    .index("by_post_number", ["postId", "revisionNumber"]),

  reviewRuns: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    revisionId: v.id("revisions"),
    intensity: v.union(v.literal("gentle"), v.literal("balanced"), v.literal("rigorous")),
    summary: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  })
    .index("by_post", ["postId"]),

  reviewItems: defineTable({
    runId: v.id("reviewRuns"),
    postId: v.id("posts"),
    persona: v.string(),
    priority: v.union(v.literal("now"), v.literal("soon"), v.literal("optional")),
    issue: v.string(),
    suggestion: v.string(),
    evidence: v.optional(v.string()),
    confidence: v.number(),
    actionStatus: v.union(v.literal("open"), v.literal("accepted"), v.literal("dismissed"), v.literal("pinned")),
  })
    .index("by_run", ["runId"]),

  freshnessUpdates: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    confidence: v.number(),
    suggestedAction: v.union(v.literal("notice"), v.literal("addendum"), v.literal("revision")),
    summary: v.string(),
    sourceLinks: v.array(v.string()),
    status: v.union(v.literal("needs_review"), v.literal("approved"), v.literal("dismissed"), v.literal("snoozed")),
    decidedAt: v.optional(v.number()),
    decisionNote: v.optional(v.string()),
  })
    .index("by_post", ["postId"])
    .index("by_status", ["status"]),

  settings: defineTable({
    userId: v.id("users"),
    versionWatchlist: v.any(),
  })
    .index("by_user", ["userId"]),
});
```

### 2.2 Convex Functions

#### Queries (`convex/queries/`)
```
users.ts
  - getUser(clerkId)              → user record or null
  - getWritingProfile(clerkId)    → writing profile

posts.ts
  - listPosts(userId, status?)    → posts array (reactive)
  - getPost(postId)               → post + latest revision
  - getDraftProgress(postId)      → draft progress state

reviews.ts
  - getReviewRun(runId)           → run + items
  - getReviewItems(runId)         → items array

freshness.ts
  - listFreshnessUpdates(userId, status?) → updates array

settings.ts
  - getSettings(userId)           → version watchlist
```

#### Mutations (`convex/mutations/`)
```
users.ts
  - createOrUpdateUser(clerkId, email, name)
  - completeOnboarding(userId, writingProfile)
  - updateWritingProfile(userId, profile)

posts.ts
  - createPost(userId, title)
  - updatePost(postId, updates)
  - saveDraftProgress(postId, progress)
  - publishPost(postId, visibility)

revisions.ts
  - saveRevision(postId, content, source)
  - saveDraftOptions(postId, drafts[])      → bulk insert generated revisions

reviews.ts
  - createReviewRun(postId, revisionId, intensity)
  - saveReviewResults(runId, items[])
  - applyReviewDecision(itemId, decision)

freshness.ts
  - saveFreshnessResults(postId, updates[])
  - applyFreshnessDecision(updateId, decision, note?)

settings.ts
  - updateWatchlist(userId, watchlist)
```

#### Actions (`convex/actions/`) — External API calls
```
ai.ts
  - generateClarifyingQuestions(roughInput, writingProfile)
    → calls Anthropic → returns questions (no DB write, returned to client)

  - composeDrafts(postId, roughInput, mode?, writingProfile?, answers?)
    → calls Anthropic → schedules saveDraftOptions mutation → returns drafts

  - runReview(runId, postId, title, content, intensity)
    → calls Anthropic (5 personas in parallel) → schedules saveReviewResults mutation

  - scanFreshness(postId, title, content, publishedAt?)
    → calls Anthropic with web search → schedules saveFreshnessResults mutation
```

### 2.3 Environment Variables (Convex Dashboard)
```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

---

## Phase 3: Frontend — Pages & Layouts

### 3.1 Route Structure
```
src/app/
  layout.tsx                    → Root layout (Clerk + Convex providers, fonts)
  page.tsx                      → Landing page (public, SSR)
  sign-in/[[...sign-in]]/
    page.tsx                    → Clerk sign-in page
  sign-up/[[...sign-up]]/
    page.tsx                    → Clerk sign-up page
  onboarding/
    page.tsx                    → Writing profile setup (11 steps)
  app/
    layout.tsx                  → App shell (sidebar + main + right panel)
    page.tsx                    → Post list / empty state
    new/
      page.tsx                  → New draft → thoughts input
    [postId]/
      page.tsx                  → Post view (thoughts → clarify → drafts → editor)
      review/
        page.tsx                → Review results panel view
    settings/
      page.tsx                  → Settings modal/page
  middleware.ts                 → Clerk auth middleware (protect /app/*)
```

### 3.2 Key Components
```
src/components/
  layout/
    sidebar.tsx                 → Post list sidebar (reactive via Convex useQuery)
    right-panel.tsx             → Slide-in panel for reviews/freshness
    app-shell.tsx               → Three-column layout wrapper

  auth/
    user-button.tsx             → Clerk UserButton (replaces custom logout)

  onboarding/
    onboarding-wizard.tsx       → Multi-step form (11 steps)
    step-card.tsx               → Single onboarding step
    option-chip.tsx             → Selectable option pill

  posts/
    post-list-item.tsx          → Sidebar post entry with status badge
    empty-state.tsx             → "What are you trying to say?" hero

  compose/
    thoughts-input.tsx          → Messy notes textarea with auto-save
    clarify-questions.tsx       → Question cards with multi-select options
    draft-options.tsx           → 3 draft approach cards
    generate-button.tsx         → Button with real-time progress from Convex

  editor/
    post-editor.tsx             → Title + content textareas with debounced save
    save-status.tsx             → "Saved" / "Saving..." indicator

  review/
    persona-card.tsx            → Persona feedback card (colored header)
    review-item.tsx             → Single feedback item with accept/dismiss
    review-skeleton.tsx         → Loading skeleton

  freshness/
    freshness-card.tsx          → Severity badge + summary + actions
    freshness-skeleton.tsx      → Loading skeleton

  publish/
    publish-dialog.tsx          → shadcn Dialog with visibility options

  settings/
    writing-profile-summary.tsx → Display profile as readable summary
    watchlist-editor.tsx        → Version watchlist textarea
    runtime-status.tsx          → AI connection status

  landing/
    hero-section.tsx            → Hero with interactive mockup widget
    mockup-widget.tsx           → The app preview widget (sidebar + views + dots)
    how-it-works.tsx            → 3-step section
    personalization-section.tsx → Dark section with profile card
    before-after.tsx            → Toggle comparison
    testimonials.tsx            → Quote cards
    pricing.tsx                 → Free vs Pro tiers
    footer.tsx                  → Site footer
    nav.tsx                     → Landing nav with mobile toggle

  ui/                           → shadcn/ui components (auto-generated)
    button.tsx, card.tsx, dialog.tsx, input.tsx, textarea.tsx,
    badge.tsx, tabs.tsx, skeleton.tsx, toast.tsx, progress.tsx, ...
```

---

## Phase 4: Design System Migration

### 4.1 Tailwind Config (`tailwind.config.ts`)

Preserve the current color palette as custom Tailwind colors:

```typescript
const config = {
  theme: {
    extend: {
      colors: {
        bg: "#fafaf8",
        paper: "#ffffff",
        ink: { DEFAULT: "#1a1a1a", light: "#4a4a48", faint: "#c0c0b8" },
        muted: "#8a8a85",
        line: { DEFAULT: "#e5e5e0", light: "#f0f0eb" },
        accent: { DEFAULT: "#2d6a4f", hover: "#245a42", soft: "#e8f0ec", muted: "#b8d4c8" },
        danger: { DEFAULT: "#8f3b2e", soft: "#fdf0ed" },
        warn: { DEFAULT: "#996c1d", soft: "#fdf6e8" },
        persona: {
          editor: "#2d6a4f",
          skeptic: "#b8860b",
          empath: "#c2556e",
          philosopher: "#5b5ea6",
          coach: "#2e8b57",
        },
        // Landing page
        lp: {
          bg: "#f4f2ed",
          paper: "#fbfaf7",
          ink: "#161614",
          muted: "#6b6962",
          accent: "#1d6f5f",
          "accent-hover": "#165a4c",
          dark: "#0d1a16",
          "teal-bright": "#7dd4bc",
        },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        serif: ["Newsreader", "Georgia", "serif"],
      },
      maxWidth: {
        prose: "680px",
      },
    },
  },
};
```

### 4.2 Key Style Mappings

| Current CSS | Tailwind Equivalent |
|-------------|-------------------|
| `.auth-container` | `max-w-sm mx-auto p-8 rounded-2xl border border-line` |
| `.btn-primary` | shadcn `<Button>` with accent colors |
| `.btn-primary-action` | shadcn `<Button size="lg">` with spinner |
| `.clarify-option` | `px-4 py-2 rounded-full border text-sm font-medium cursor-pointer` |
| `.clarify-option.selected` | `border-accent bg-accent-soft text-accent` |
| `.post-list .post-item` | `p-3 rounded-lg hover:bg-line-light cursor-pointer` |
| `.right-panel` | `w-[380px] border-l transition-transform` |
| `.persona-card` | `<Card>` with colored top border |
| `.badge` | shadcn `<Badge>` variant |
| `.modal-overlay` | shadcn `<Dialog>` |
| `.toast` | shadcn `<Toaster>` (sonner) |
| `.skeleton-*` | shadcn `<Skeleton>` |

### 4.3 Landing Page Styles
- Port `landing.css` to Tailwind utility classes
- The interactive mockup widget stays as a self-contained component with scoped Tailwind
- Preserve all animations (reveal, typing, view switching, dot interactions) in the component

---

## Phase 5: Feature Parity Checklist

Every feature from the current app must work in the new version. Check each off during implementation.

### Auth & Onboarding
- [ ] Sign up (Clerk handles UI)
- [ ] Sign in (Clerk handles UI)
- [ ] Session persistence across deploys (Clerk — this is the whole point)
- [ ] 11-step onboarding wizard
- [ ] Adaptive questions (tone options change based on destination)
- [ ] Writing profile saved to Convex `users` table
- [ ] Redo onboarding from settings
- [ ] Logout (Clerk UserButton)

### Post Management
- [ ] Create new post
- [ ] List posts in sidebar (filtered by status)
- [ ] Select post from sidebar, restore state
- [ ] Update post title/status
- [ ] Delete/archive post

### Compose Flow
- [ ] Thoughts textarea with auto-save (debounced)
- [ ] "Turn this into a draft" → calls Convex action for clarifying questions
- [ ] Clarifying questions UI (2-4 cards, multi-select options, custom input)
- [ ] "Skip — just generate" option
- [ ] "Generate with these answers" with real-time progress
- [ ] Draft options display (3 cards: argument/narrative/brief)
- [ ] Select draft → load into editor
- [ ] "See other approaches" button

### Editor
- [ ] Auto-growing title textarea
- [ ] Content textarea with debounced auto-save (revisions)
- [ ] Save status indicator (Saved/Saving/Failed)
- [ ] "Review this draft" button

### Review (AI Personas)
- [ ] Trigger review run (gentle/balanced/rigorous)
- [ ] Loading skeleton while AI processes
- [ ] 5 persona cards (Editor, Skeptic, Empath, Philosopher, Coach)
- [ ] Colored persona headers
- [ ] Feedback items with accept/dismiss buttons
- [ ] Decision persistence

### Publish
- [ ] Publish modal (private/public visibility)
- [ ] Status update to "published"
- [ ] Editor button changes to "Check freshness" after publish

### Freshness Monitoring
- [ ] Trigger freshness scan on published posts
- [ ] Loading skeleton
- [ ] Severity badges (low/medium/high)
- [ ] Suggested actions (notice/addendum/revision)
- [ ] Apply/dismiss decisions
- [ ] Version watchlist in settings

### Settings
- [ ] Writing profile summary display
- [ ] Version watchlist editor
- [ ] Runtime/AI connection status
- [ ] Redo onboarding link

### Cross-Device
- [ ] Draft progress syncs across devices (Convex reactive — automatic)
- [ ] Rough input, clarifying questions, answers all persist in real-time

### Landing Page
- [ ] Navigation (sticky, mobile toggle, smooth scroll)
- [ ] Hero with interactive mockup widget
- [ ] Auto-typing animation
- [ ] Sidebar view switching (4 views)
- [ ] Window dot interactions (minimize/bounce/fullscreen)
- [ ] Social proof logos
- [ ] How it works (3 steps)
- [ ] Personalization section (dark bg)
- [ ] Before/after toggle
- [ ] Testimonials
- [ ] Pricing (Free/Pro tiers)
- [ ] Final CTA
- [ ] Footer

### Real-Time Progress (NEW — previously deferred)
- [ ] Convex actions emit progress via mutation updates to a `taskProgress` table
- [ ] Frontend subscribes to progress query — button text updates in real-time
- [ ] Works for compose, review, and freshness flows
- [ ] No more timed guesses — actual backend status

---

## Phase 6: Implementation Order

Execute in this exact order to always have a working app:

### Step 1: Scaffold (30 min)
- `create-next-app` with TypeScript + Tailwind
- Install Convex, Clerk, shadcn/ui
- Wire providers in layout.tsx
- Verify dev server starts

### Step 2: Auth (1 hr)
- Clerk sign-in/sign-up pages
- Middleware protecting `/app/*`
- Convex webhook to sync Clerk users → `users` table
- Create user on first sign-in

### Step 3: Onboarding (1 hr)
- Port 11-step wizard as React component
- Save writing profile to Convex
- Redirect to app after completion
- Guard: redirect to onboarding if `!onboardingCompleted`

### Step 4: App Shell + Post List (1 hr)
- Sidebar with reactive post list (`useQuery`)
- Empty state
- Create new post (mutation)
- Select post from list

### Step 5: Compose Flow (2 hr)
- Thoughts textarea with auto-save to Convex
- Clarifying questions (Convex action → Anthropic)
- Draft generation (Convex action → Anthropic → mutation saves revisions)
- Draft options display
- Select draft → editor

### Step 6: Editor (1 hr)
- Title + content textareas
- Debounced save as revisions
- Save status indicator

### Step 7: Review (1.5 hr)
- Review run trigger → Convex action (5 parallel Anthropic calls)
- Results saved via mutation
- Persona cards with feedback
- Accept/dismiss decisions

### Step 8: Publish + Freshness (1 hr)
- Publish dialog
- Freshness scan action
- Results display with decisions
- Version watchlist in settings

### Step 9: Settings (30 min)
- Writing profile summary
- Watchlist editor
- Runtime status
- Redo onboarding

### Step 10: Landing Page (2 hr)
- Port all sections as React components
- Interactive mockup widget (most complex — port JS interactions)
- Animations (intersection observer, typing, view switching)
- Responsive layout

### Step 11: Real-Time Progress (1 hr)
- `taskProgress` table in Convex
- Actions update progress via scheduled mutations
- Frontend subscribes and shows live status on buttons

### Step 12: Deploy (30 min)
- `npx convex deploy` (production backend)
- `vercel deploy` (production frontend)
- Set env vars in both dashboards
- Verify end-to-end

---

## Phase 7: What NOT to Migrate

- `src/server.ts` — replaced by Convex functions
- `src/services/appService.ts` — replaced by Convex queries/mutations
- `src/services/authService.ts` — replaced by Clerk
- `src/lib/env.ts` — Convex handles env vars
- `src/orchestrator/` — logic moves into Convex action
- `src/freshness/` — logic moves into Convex action
- `data/store.json` — Convex database
- `data/auth.json` — Clerk
- `public/app.js` — React components
- `public/styles.css` — Tailwind
- Express, tsx, dotenv dependencies

## What to Preserve Exactly

- **AI prompts** from `src/services/anthropicService.ts` — copy prompt strings into Convex actions
- **Persona definitions** (names, roles, tones, colors) — into a shared constants file
- **Onboarding questions** (all 11 steps with adaptive logic) — into onboarding component
- **Color palette** — into Tailwind config (listed above)
- **Landing page content** (all copy, testimonials, pricing) — into landing components
- **Mockup widget interactions** (typing, view switching, dots) — into mockup component

---

## APPENDIX A: Implementation Details NOT to Miss

These are specific business logic, UI behaviors, and algorithms from the current codebase that MUST be ported. The implementation agent should reference the original files for exact code.

### A.1 Review Scoring & Aggregation (`src/orchestrator/aggregate.ts`)

Port this exact scoring logic into a Convex helper/utility:

```
Priority multipliers:
  now      → 1.0
  soon     → 0.65
  optional → 0.4

Score formula: confidence × priorityMultiplier

Deduplication: normalize issue text (lowercase, trim whitespace), skip duplicates

Intensity limits (max items returned):
  gentle   → 3
  balanced → 5
  rigorous → 8

Sort: descending by score, return top N
```

### A.2 Freshness Severity Classification (`src/freshness/severity.ts`)

Port this exact classification into a Convex helper:

```
Base score: confidence × 0.6

Claim type bonuses:
  version, policy → +0.2
  stat, price     → +0.15
  date, other     → +0.0

Traffic tier bonuses:
  high   → +0.15
  medium → +0.08
  low    → +0.0

Thresholds:
  score >= 0.8 → "high"
  score >= 0.5 → "medium"
  else         → "low"

Claim types: "version" | "date" | "stat" | "policy" | "price" | "other"
Traffic tiers: "low" | "medium" | "high"
```

### A.3 Freshness Regex Fallback (`src/services/appService.ts` lines 504-531)

If the Anthropic freshness scan fails, fall back to regex-based version detection:

```
Pattern: /\b([A-Za-z][A-Za-z0-9+\-]*)\s+(\d+\.\d+)\b/g

Compare found versions against user's watchlist using semantic version comparison:
  versionCmp(a, b): split by ".", compare each part numerically
  If found version < watchlist version → flag as outdated
```

### A.4 Freshness Decision Types

The plan's schema must support all 5 decision types (not just 3):
```
"approve_notice"   → Add footnote/notice to post
"approve_addendum" → Add paragraph at end
"open_revision"    → Rewrite section
"dismiss"          → Ignore this finding
"snooze"           → Revisit later
```

### A.5 Onboarding Adaptive Logic (`public/app.js` lines 54-322)

The tone options in Step 2 CHANGE based on destination selected in Step 1:

```
If destination includes ONLY "linkedin":
  Tones: "Executive-sharp", "Thought-leader", "Data-backed professional", "Warm mentor"

If destination includes ONLY "twitter":
  Tones: "Punchy hot-take", "Thread-teacher", "Dry wit", "Hype curator"

If destination includes "newsletter" (any combo):
  Tones: "Conversational friend", "Deep-dive analyst", "Opinionated curator", "Behind-the-scenes"

Default (multi-destination or blog):
  Tones: "Conversational & warm", "Sharp & opinionated", "Measured & analytical", "Playful & irreverent", "Minimal & direct"
```

Each step has `allowMultiple: true/false` controlling single vs multi-select behavior.

### A.6 Clarifying Questions UI Details

Each question card supports:
- Multi-select options (pill buttons, can select multiple)
- Optional custom text input below options (`allowCustom: true`)
- Both selections AND custom input can coexist for the same question
- Answers saved as: `{ questionId: [selectedOption1, selectedOption2, "custom: user typed text"] }`

### A.7 Anthropic Service Details to Port

**Web search tool configuration:**
```typescript
{ type: "web_search_20250305", max_uses: 3 }
```
Only used in freshness scanning.

**Continuation handling:**
The Anthropic SDK may return `stop_reason: "pause_turn"` for multi-turn responses. The code loops, accumulating text blocks, and re-sends with the accumulated context until `stop_reason: "end_turn"`. Port this loop logic.

**Logging/observability:**
Current code logs with prefixes: `[clarify]`, `[compose]`, `[review]`, `[freshness]` with elapsed time measurements. Port as `console.log` in Convex actions for debugging.

### A.8 Landing Page — All 4 Mockup Views

The interactive widget has 4 sidebar views that must all work:

1. **New Draft** (default): Textarea with auto-typing demo + "Generate draft" button
2. **My Drafts**: List of 5 posts with status badges (Published/Draft/In Review)
   - "Using AI the Right Way" — Published
   - "The New API Deep Dive" — Draft
   - "Stop Switching Apps" — In Review
   - "Why I Stopped Using Templates" — Published
   - "Draft: Thread on Tooling" — Draft
3. **Writing Profile**: Displays tone, hook style, sentence length, formatting preferences, 94% accuracy badge
4. **Freshness**: 4 articles with green/yellow/red status dots and "last checked" timestamps

### A.9 Landing Page Animations & Responsive

**Animation timings (port to Tailwind/CSS):**
```css
Scroll reveal:       0.75s cubic-bezier(0.16, 1, 0.3, 1), translate Y 40px→0
View fade:           0.25s cubic-bezier(0.16, 1, 0.3, 1)
Generate shimmer:    1.8s linear infinite (green gradient sweep)
CTA shimmer:         1.5s linear infinite
Cursor blink:        0.85s step-end infinite
Panel slide-in:      0.3s cubic-bezier(0.16, 1, 0.3, 1)
Dot bounce (yellow): scale(0.8) → scale(1) with 0.15s transition
```

**5 responsive breakpoints:**
```
940px  → Testimonials: 3 columns → 2 columns
768px  → Hero mockup: 2-column grid → 1-column, sidebar hidden
700px  → Nav: inline links → hamburger toggle
600px  → Typography scales down, testimonials → 1 column
Fluid  → clamp() for hero heading, section titles
```

**Grid layouts:**
```
Personalization section: 1fr 1fr, 88px gap, items alternate with CSS order property
Testimonials: repeat(3, 1fr) → repeat(2, 1fr) → 1fr
How-it-works steps: alternating left/right with grid
```

### A.10 Publish Flow Details

- Publish modal has TWO separate buttons: "Publish Private" and "Publish Public"
- Publishing sets `status: "published"`, `publishedAt: timestamp`, clears draft progress
- After publish, the editor's action button changes from "Review this draft" → "Check freshness"
- Post visibility stored as `"private" | "public"` enum

### A.11 Post State Transitions

```
new post     → status: "draft", visibility: "private"
publish      → status: "published", visibility: chosen, publishedAt: now
archive      → status: "archived"

Editor button label logic:
  if status === "draft"     → "Review this draft"
  if status === "published" → "Check freshness"
```

### A.12 Draft Progress Persistence (Cross-Device)

With Convex this becomes automatic (reactive queries), but ensure:
- `draftProgress` field on posts table stores: `roughInput`, `clarifyingQuestions`, `clarifyingAnswers`
- When selecting a post, restore the correct UI state based on what progress exists:
  - Has roughInput only → show thoughts-state
  - Has clarifyingQuestions → show clarify-state
  - Has revisions → show editor-state
- Auto-save rough input on every keystroke (debounced 800ms) via Convex mutation

---

## Environment Setup Checklist

```bash
# .env.local
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Convex Dashboard → Settings → Environment Variables
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

---

## Branch Strategy

- Current work stays on `main` (current Express app preserved)
- New implementation on branch `v2/convex-nextjs`
- Once feature-complete, merge `v2/convex-nextjs` → `main`
- Old Express code removed in the merge

---

## Success Criteria

1. Sign up/sign in works — no data loss on redeploy (Clerk persistent auth)
2. Onboarding wizard with all 11 steps, adaptive tone logic
3. Full compose flow: thoughts → clarify (with multi-select + custom input) → 3 draft options → editor
4. AI review with 5 personas, correct scoring/aggregation, intensity-based limits
5. Freshness scanning with regex fallback, all 5 decision types
6. Real-time progress on generate/review buttons (Convex reactive, not fake timers)
7. Cross-device draft persistence (automatic with Convex)
8. Landing page with ALL interactive features (4 mockup views, dot animations, typing, responsive at 5 breakpoints)
9. Mobile responsive on all app screens (especially clarify questions page)
10. Publish flow with private/public visibility, post state transitions
11. Settings: writing profile summary, version watchlist, runtime status, redo onboarding
12. Deployed on Vercel + Convex cloud
