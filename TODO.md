# Sync Blogs — Personalization System Implementation

## Phase 1: Authentication ✅
- [x] Create `src/services/authService.ts` — user registration, login, token management
- [x] Update `src/services/appService.ts` — add userId scoping to all data
- [x] Update `src/server.ts` — auth endpoints + middleware
- [x] Update `public/index.html` — login/register screen
- [x] Update `public/styles.css` — auth screen styles
- [x] Update `public/app.js` — auth flow, token management

## Phase 2: Conversational Onboarding (10 adaptive questions) ✅
- [x] Update `src/services/authService.ts` — writingProfile per user
- [x] Update `src/server.ts` — writing profile endpoints (POST /v1/auth/onboarding, PATCH /v1/auth/writing-profile)
- [x] Update `public/index.html` — onboarding flow UI (progress bar, step indicator, back button)
- [x] Update `public/styles.css` — onboarding styles (option cards, chips, animations, multi-select)
- [x] Update `public/app.js` — adaptive question engine (10 questions, options adapt based on prior answers)
- [x] Multi-select for destination question (writers can choose multiple platforms)

## Phase 3: Pre-Draft Clarifying Questions (Perplexity-style) ✅
- [x] Add `generateClarifyingQuestions()` to `src/services/anthropicService.ts`
- [x] Add clarify endpoint to `src/server.ts` (POST /v1/posts/:postId/clarify)
- [x] Update `public/index.html` — clarifying questions UI (cards with clickable options)
- [x] Update `public/styles.css` — clarifying styles (option chips, custom input)
- [x] Update `public/app.js` — clarifying flow (skip or answer, then generate)

## Phase 4: Enhanced Generation ✅
- [x] Update `composeWithAnthropic()` — full writing profile + clarifying answers in prompt
- [x] Update `composeDraft()` in appService — pass writingProfile + clarifyingAnswers through
- [x] Anti-AI-slop instructions in generation prompt

## Onboarding Refinements ✅
- [x] Convert ALL onboarding questions to multi-select (except name which stays text)
- [x] Split formatting habits into two questions: "Which feel like you?" + "Which do you avoid?"
- [x] Added new options: minimal capitalization, lowercase titles, ellipses, exclamation marks, rhetorical questions, sentence fragments
- [x] Added avoidance options: excessive caps, passive voice, hedging, filler words, clichés, bullet lists, long intros, formal transitions, emojis
- [x] Onboarding progress persists in localStorage — survives page refresh mid-flow
- [x] Progress saved on every step advance, back, option click, and text input
- [x] Progress restored on page load if onboarding incomplete
- [x] Progress cleared on successful onboarding submission
- [x] Redo onboarding clears old progress and saves fresh start with existing profile

## Full UI Redesign ✅
- [x] Premium writing tool aesthetic (off-white #fafaf8, dark text #1a1a1a, accent #2d6a4f)
- [x] Left sidebar: narrow, minimal, draft titles only, New Draft button
- [x] Center: distraction-free writing area with progressive disclosure
- [x] Right panel: slides in on demand (review/freshness), hidden by default
- [x] Five-persona feedback cards with distinct accent colors and collapsible design
- [x] Freshness scan UX with severity dots and one-click apply
- [x] All developer-facing UI removed from user surface (API status, model names, watchlist → settings)
- [x] Settings modal with gear icon (writing profile summary, redo onboarding, watchlist)
- [x] Publish modal with private/public options

## Backend Tests ✅
- [x] TypeScript compiles clean (0 errors)
- [x] Auth: register, login, logout, duplicate email, wrong password, invalid token, missing fields
- [x] Posts: create, list (user-scoped), get single, patch, revisions, publish
- [x] Settings: get, patch watchlist
- [x] Freshness: scan (returns severity/sources), get updates
- [x] Writing profile: onboarding POST, profile PATCH (supports array destinations)
- [x] appService.test.ts updated for userId parameter

## Future TODOs (not this sprint)
- [ ] Blog connection API — connect to user's blog, analyze content, suggest topics
- [ ] Style calibration — paste existing writing to auto-generate profile
- [ ] Multiple writing profiles per user (e.g., "LinkedIn voice" vs "Blog voice")
- [ ] "Does this sound like you?" feedback loop after generation
- [ ] Track which clarifying questions get skipped → remove low-value ones
- [ ] Review-item decision endpoint testing (accept/dismiss/pin)
- [ ] Freshness update decision endpoint testing (approve/dismiss/snooze)
