# Freshness Engine and Approval Dashboard

Last updated: February 27, 2026

## Product principle

Published writing should remain historically accurate and contextually useful, but author intent must stay intact.

Rule:

- Never silently rewrite published articles.
- Surface contextual updates with clear dates and sources.
- Require explicit author approval for content edits.

## System overview

## A) Detect potential drift

For each published article:

1. Extract tracked claims/entities:
   - Product versions
   - Dates/deadlines
   - Statistics
   - Regulatory/policy references
   - Price and benchmark claims
2. Schedule background checks based on volatility:
   - High-volatility claims: daily
   - Medium: weekly
   - Low: monthly
3. Query trusted sources and compare against stored claim snapshots.

## B) Classify update necessity

Each detected change receives:

- Drift type: factual, version, timeline, interpretation.
- Confidence score.
- Reader impact estimate.
- Suggested action:
  - context notice only
  - addendum suggestion
  - full revision proposal

## C) Surface to readers and authors

Reader-facing:

- Subtle top-of-article context banner:
  - "Context update: newer information may exist (checked Feb 27, 2026)."
- Expandable details:
  - what changed
  - source links
  - original publish/update dates

Author-facing:

- Central "Updates" dashboard with queue and approval states.

## Approval dashboard specification

Primary views:

1. Needs review
2. Approved and published
3. Dismissed
4. Snoozed

Per-item card fields:

- Article title
- Original publish date
- Last checked date
- Drift severity (low/medium/high)
- Suggested action type
- Diff preview
- Source evidence links

Actions:

- Approve context notice
- Approve addendum
- Open guided revision
- Dismiss with reason
- Snooze

## UX details

- Keep visual treatment premium and quiet (no warning-red by default).
- Use neutral tones and subtle motion.
- Include clear date stamps to avoid ambiguity.
- Show provenance for every claim update.

## Data model sketch

- `published_posts`
- `tracked_claims`
- `claim_snapshots`
- `freshness_checks`
- `update_suggestions`
- `update_approvals`
- `reader_notices`

## Safety and trust constraints

- Every automated suggestion is reversible.
- Keep immutable log of what changed and when.
- Allow users to disable monitoring per article.
- Provide export of update history for legal/editorial needs.
