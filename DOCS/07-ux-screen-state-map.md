# UX Screen and State Map

Last updated: February 27, 2026

## 1) Home / Drafts

Purpose:

- Fast entry into recent drafts and published posts.

Primary elements:

- Left rail: filters (Drafts, Published, Needs Update, Archived).
- Main list: title, last edited, status badge, update badge.
- Global CTA: New Draft.

States:

- Empty state: "Start from thoughts."
- Populated state.
- Search and filter active.

## 2) New Draft Composer

Purpose:

- Avoid blank-page friction and help users start from ideas.

Primary elements:

- Input panel: paste rough thoughts.
- Optional actions: import transcript, paste existing article, upload notes.
- Draft mode selector: Argument, Narrative, Brief.
- Generate button.

States:

- Idle.
- Generating.
- Generated with version selector.

## 3) Editor

Purpose:

- Core writing and revision experience.

Primary elements:

- Center writing canvas.
- Right AI panel (collapsed by default).
- Top status bar (private lock, save state, review button).

States:

- Focus mode on.
- Feedback panel open.
- Inline suggestion highlighted.
- Conflict suggestion tradeoff card shown.

## 4) AI Feedback Panel

Purpose:

- Show non-overwhelming, high-signal collaboration.

Primary elements:

- Summary digest card.
- Persona tabs.
- Actionable feedback list with:
  - Accept
  - Dismiss
  - Pin
  - Ask why

States:

- First load skeleton.
- Partial stream from personas.
- Completed run.

## 5) Publish Flow

Purpose:

- Safe publish confirmation and metadata review.

Primary elements:

- Visibility selector (default private).
- Publication settings.
- Confirm publish.

States:

- Preflight warning for unresolved high-confidence factual flags.
- Publish success confirmation.

## 6) Freshness Dashboard

Purpose:

- Manage post-publish update approvals.

Primary elements:

- Queue tabs: Needs Review, Approved, Dismissed, Snoozed.
- Update cards with severity, confidence, source links, diff.
- Action bar: Approve Notice, Add Addendum, Revise, Dismiss, Snooze.

States:

- No pending items.
- Mixed severity pending items.
- Action completed with audit record.

## 7) Settings

Purpose:

- Control privacy, persona behavior, and compliance transparency.

Primary elements:

- Privacy controls.
- Persona intensity and weights.
- Data retention and export/delete.
- Fact-check strictness.

States:

- Default.
- Edited with unsaved changes.
- Saved with timestamp.
