# Landing Page — Widget Interactivity + Fixes

## Widget — Interactive + Centered + Edge-to-edge
- [x] Expanded max-width from 1200px → 1400px
- [x] Padding 40px on sides for breathing room
- [x] Real `<textarea>` — users can type in it
- [x] Generate button clickable — shows "Generating…" then "✦ Draft ready"
- [x] Auto-typing animation on load, stops when user interacts
- [x] **Sidebar clickable** — 4 views: New Draft, My Drafts, Writing Profile, Freshness
- [x] My Drafts view — list of 5 drafts with Published/Draft/In Review statuses
- [x] Writing Profile view — tone, hook style, sentence length, formatting, 94% accuracy
- [x] Freshness view — 4 articles with green/yellow/red status dots
- [x] **Window dots interactive** — Red: minimize/restore, Yellow: bounce easter egg, Green: fullscreen toggle
- [x] Grid changed to `200px 1fr` (sidebar + content area), views use `grid-column: 2 / -1`
- [x] Responsive: sidebar hidden on mobile, views take full width

## Personalization Spacing
- [x] 32px spacer div between text and button

## Before/After Toggle
- [x] Pure `style.display` toggling — no class-based hiding
- [x] Inline `style="display:none"` on after panel in HTML

## Verification
- [x] JS syntax valid (`node -c`)
- [x] All files serve 200 OK
- [ ] Visual verification — user to test in browser
