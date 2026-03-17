# Sync Blogs v2 — Open Tasks

Each task below is scoped for a single Claude Code session. They can be worked independently and in parallel.

---

## Task 1: Add Markdown Rendering + Fix Em-Dash Prompts

**Problem**: The editor outputs raw markdown (## headers, **bold**, etc.) but there's no markdown renderer — the user sees literal `##` and `**` in the UI. The AI compose prompt at `convex/ai.ts:225` explicitly tells the model to "Use markdown formatting: headers with ##, bold for key terms, em-dashes where appropriate." This produces unrendered markup in the plain textarea editor.

**What to fix**:
1. Install `react-markdown` (or similar lightweight renderer) as a dependency. Preferably something much faster and performant while looking beauitful 
2. In the **editor** (`src/components/editor/post-editor.tsx`), add a preview/render mode so the user can toggle between raw editing and rendered markdown. Or better: use a proper markdown-aware editor like `@uiw/react-md-editor` or a minimal custom solution that renders inline markdown while editing. The user should feel like he's using a word document without the need for using word.
3. In the **draft options cards** (`src/components/compose/draft-options.tsx`), the preview text (`draft.content.slice(0, 250)`) should render markdown, not show raw `##` and `**`.
4. In the **review page** (`src/app/app/[postId]/review/page.tsx`), the `item.issue` and `item.suggestion` fields may contain markdown — render them properly.
5. In `convex/ai.ts` line 225, keep the markdown instruction but remove the em-dash instruction: change `"Use markdown formatting: headers with ##, bold for key terms, em-dashes where appropriate based on profile."` to `"Use markdown formatting: headers with ##, bold for key terms. Do not use em-dashes (—) unless the writer's profile explicitly mentions them."` 
6. — remove the em-dash reference unless said otherwise by user.

**Files to modify**:
- `package.json` (add markdown renderer dep)
- `convex/ai.ts` (fix prompt lines 176, 225)
- `src/components/editor/post-editor.tsx` (add markdown preview)
- `src/components/compose/draft-options.tsx` (render preview as markdown)
- `src/app/app/[postId]/review/page.tsx` (render feedback as markdown)

They could more i'm might be forgeting some of the files check the whole codebase

**Acceptance criteria**: Generated drafts render with proper headings, bold, lists. No raw `##` or `**` visible. No em-dashes in new AI output unless the user's writing profile explicitly requests them. Make sure that the onboarding profile is being used accross the AI propmt and each profile is actually personalized to user. speaking of which i haven't implemented a way for one user profile to not see other user profile which means i might sign in with one account and then that previews to a different user account.

implement proper user profile in db and all. 

---

## Task 2: Remove Custom Scrollbar, Keep UI Minimal

**Problem**: There's a visible scrollbar/scroll indicator on the left side of the main content area. The user finds it unnecessary and wants a completely clean, minimal look — just the content, no scroll UI chrome.

**What to fix**:
1. In `src/components/layout/app-shell.tsx` line 42, the main content area has `overflow-y-auto` which shows the browser's default scrollbar.
2. Hide the scrollbar using CSS while keeping scroll functionality. Add to `src/app/globals.css`:
   ```css
   main::-webkit-scrollbar { display: none; }
   main { -ms-overflow-style: none; scrollbar-width: none; }
   ```
3. Also check the sidebar (`src/components/layout/sidebar.tsx` line 92) — the post list has `overflow-y-auto` which may show a scrollbar too. Apply the same treatment.
4. Check any other scrollable containers (editor textarea, review page, settings page) and suppress visible scrollbars.

**Files to modify**:
- `src/app/globals.css` (add scrollbar-hiding rules)

**Acceptance criteria**: No visible scrollbar anywhere in the app. User can still scroll with trackpad/mouse wheel/touch. Ultra-minimal.

---

## Task 3: Redesign Draft Option Cards (Linear-Style) + Fix Back Navigation

**Problem**: The three draft option cards (Argument, Narrative, Brief) at `src/components/compose/draft-options.tsx` look bad. The user can't distinguish between them, the preview text is too short and unreadable, and clicking one loses all context — there's no way to go back and pick a different draft.

**What to fix**:
1. **Redesign the cards** to look like Linear.app issue cards:
   - Clean white card with subtle left border color (different per mode: green for Argument, blue for Narrative, amber for Brief)
   - Mode label as a small colored chip/tag at top-left (not the current tiny all-caps text)
   - Title suggestion prominently displayed as the card heading
   - Longer preview (400-500 chars), with proper text truncation and a "Read more" expand toggle
   - Word count shown at bottom-right in muted text
   - On hover: subtle elevation + left border thickens (Linear-style)

2. **Fix the layout**: Currently uses a CSS grid that can make cards uneven sizes. Switch to a vertical stack (one card per row, full width) so each card has room to breathe and show enough preview text. This matches Linear's list view better than a cramped 3-column grid.

ORRR As a senior UX designer suggest what to do to redesign the UI

3. **Fix back navigation**: After selecting a draft and entering the editor, the user currently cannot go back to see the other two drafts. Fix this:
   - In the editor (`src/components/editor/post-editor.tsx`), add a "Switch draft" or "Back to options" link that sets `draftChosen` back to false and navigates to the compose view.
   - In `src/app/app/[postId]/page.tsx`, the logic already supports this — when `draftChosen` is false, it shows ThoughtsInput which will show DraftOptions if generated drafts exist.
   - Store all 3 drafts so the user can compare. Currently `saveDraftOptions` in `convex/revisions.ts` saves all 3 as revisions, and `getGeneratedDrafts` retrieves them, so this should work.

4. **Add a selected state**: When the user hovers or clicks a draft card, show a clear visual selection (checkmark, highlighted border) before navigating away, so they feel in control.

**Files to modify**:
- `src/components/compose/draft-options.tsx` (complete redesign)
- `src/app/globals.css` (new card styles)
- `src/components/editor/post-editor.tsx` (add "Switch draft" link)

**Acceptance criteria**: Cards look polished and distinct like Linear issues. User can read enough of each draft to decide. User can go back to pick a different draft from the editor. Clean transitions, no jarring navigation.

---

## Task 4: Redesign Settings Page — Remove Version Watchlist, Add Model Selector

**Problem**: The settings page (`src/app/app/settings/page.tsx`) has a "Version Watchlist" card that the user finds useless and UI-cluttering — version tracking should happen automatically in the background. Additionally, the default AI model is hardcoded to `claude-sonnet-4-6` in `convex/ai.ts:13` via `process.env.ANTHROPIC_MODEL`, and there's no way for the user to change it from the UI.

**What to fix**:
1. **Remove the Version Watchlist card** entirely from the settings page. The watchlist concept can stay in the backend for future use, but remove it from the UI.

2. **Add a Model Selector** to the settings page:
   - Add a `preferredModel` field to the `users` table in `convex/schema.ts` (string, optional).
   - Create a dropdown/select in the settings page with these options:
     - `claude-sonnet-4-6` (Fast, recommended) — default
     - `claude-opus-4-6` (Most capable, slower)
     - `claude-haiku-4-5-20251001` (Fastest, cheapest)
   - Save the selection to the user's record via a new mutation.
   - In `convex/ai.ts`, change `getModel()` to accept a userId parameter and read the user's preferred model from the database, falling back to `process.env.ANTHROPIC_MODEL` or `claude-sonnet-4-6`.
   - All AI actions (`generateClarifyingQuestions`, `composeDrafts`, `runReview`, `scanFreshness`) already call `getModel()` — update them to pass the userId so the right model is used.

3. **Clean up the settings UI**: Keep the Writing Profile card and Runtime Status card. Remove the Version Watchlist card. Add the new Model card. Style consistently with the rest of the app (use the v1 CSS classes, not raw shadcn Cards).

**Files to modify**:
- `convex/schema.ts` (add `preferredModel` to users table)
- `convex/users.ts` (add mutation to update preferred model)
- `convex/ai.ts` (update `getModel()` to read from user record)
- `src/app/app/settings/page.tsx` (remove watchlist, add model selector)

**Acceptance criteria**: No version watchlist visible. User can select their preferred AI model from settings. AI calls use the selected model. Clean, minimal settings page.

---

## Task 5: Make Review Feedback Actually Apply Changes to the Article

**Problem**: When the user clicks "Got it" on a review feedback item, it just marks the item as accepted in the database — it doesn't actually apply the suggested change to the article. The user expects "Got it" to mean "yes, apply this fix." When all items are resolved and "Done reviewing" is clicked, there's no indication that anything was applied. The review page is also a separate route (`/app/[postId]/review`) which breaks context — the user loses sight of their article.

**What to fix**:
1. **Make "Got it" apply the suggestion**: When the user clicks "Got it" on a review item:
   - Call an AI action that takes the current article content + the issue + the suggestion, and returns the modified content with that specific fix applied.
   - Save the result as a new revision.
   - Show a visual diff or highlight of what changed (even a simple "Applied" with a green checkmark is better than nothing).

2. **Add inline comments instead of a separate page** (this is the bigger UX rethink from point #8):
   - Instead of navigating to `/app/[postId]/review`, show review feedback as **inline margin comments** alongside the editor content — like Google Docs comments or GitHub PR review comments.
   - Each comment appears next to the relevant section of text (use the `evidence` field to match location).
   - User can "Got it" (apply) or "Skip" (dismiss) each comment inline without leaving the editor.
   - This eliminates the separate review page entirely and keeps the user in their writing flow.

   **If the inline approach is too complex for one session**, do this simpler version instead:
   - Keep the review as a **slide-in panel** on the right side of the editor (like a chat sidebar), not a separate page.
   - Editor stays visible on the left, review comments on the right.
   - "Got it" applies the change and the user sees their article update in real-time on the left.

3. **After all items are resolved**: Show a brief "All feedback addressed" message with a count of changes applied vs skipped. Then auto-close the panel/return to clean editor view.

**Files to modify**:
- `convex/ai.ts` (add `applyReviewFix` action that rewrites a section based on feedback)
- `convex/reviews.ts` (update `applyReviewDecision` to optionally save new content)
- `src/components/editor/post-editor.tsx` (add review panel or inline comments)
- `src/app/app/[postId]/review/page.tsx` (may be removed or converted to panel component)
- `src/app/globals.css` (styles for inline comments or side panel)

**Acceptance criteria**: "Got it" actually modifies the article. User can see what changed. Review feedback appears alongside the editor (panel or inline), not on a separate page. When done, user is back in the clean editor with all fixes applied.

---

## Task 6: Add Web Search to Freshness Scan (Grounding with Real Data)

**Problem**: The freshness scan (`convex/ai.ts:scanFreshness`) asks the AI to detect outdated content, but the AI has no access to the internet — it's guessing based on training data. The user noticed it's flagging versions as outdated incorrectly because it can't verify current versions.

**What to fix**:
1. **Add web search capability** to the freshness scan action using the Anthropic tool_use API:
   - Use Anthropic's built-in web search tool (if available in the SDK version), or integrate a search API (e.g., Tavily, Brave Search, or SerpAPI) as a tool the AI can call.
   - Before making claims about outdated versions, the AI should search for the current version of the technology mentioned.
   - The scan prompt should instruct the AI: "Use the search tool to verify current versions before claiming something is outdated. Do not guess."

2. **Implementation approach**:
   - Add a `SEARCH_API_KEY` environment variable to Convex (via `npx convex env set`).
   - In `scanFreshness`, define a tool schema for web search and use Anthropic's tool_use flow:
     ```typescript
     tools: [{
       name: "web_search",
       description: "Search the web for current information",
       input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
     }]
     ```
   - When the AI returns a `tool_use` block, execute the search, feed results back, and let the AI continue.
   - This gives the freshness scan grounded, real-time data instead of hallucinated version numbers.

3. **Fallback**: If no search API key is configured, the scan should still work but include a disclaimer: "Note: These suggestions are based on AI knowledge and may not reflect the latest versions. Configure web search in settings for real-time verification."

**Files to modify**:
- `convex/ai.ts` (`scanFreshness` action — add tool_use flow)
- `.env.local` or Convex env vars (add search API key)

**Acceptance criteria**: Freshness scan verifies claims against live web data when a search API is configured. No more false positives about outdated versions. Graceful fallback when search is unavailable.

---

## Summary / Priority Order

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Markdown rendering + fix em-dashes | Medium | High — content looks broken without it |
| 2 | Remove scrollbar | Small | Medium — quick polish win |
| 3 | Redesign draft cards + back navigation | Medium | High — core UX flow |
| 4 | Settings: remove watchlist, add model selector | Medium | Medium — user control |
| 5 | Review feedback applies changes + inline UI | Large | High — the biggest UX improvement |
| 6 | Web search for freshness scan | Medium | Medium — correctness improvement |

Recommended order: 2 → 1 → 3 → 4 → 5 → 6
(Start with the quick win, then fix content rendering, then the core flows, then the bigger rethink.)
