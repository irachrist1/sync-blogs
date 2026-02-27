# Product Spec V1

Last updated: February 27, 2026

## Product name (working)

Sync Blogs

## V1 objective

Help users turn rough thoughts into clear private writing, receive high-signal AI collaboration, and publish with confidence while preserving long-term contextual relevance.

## Success metrics (first 90 days)

- Draft start rate from empty state >= 65%.
- First-publish conversion from first draft >= 35%.
- User-rated "sounds like me" >= 4.0/5.
- High-severity freshness alerts reviewed within 72 hours >= 80%.

## Primary users

- Independent thinkers writing to clarify ideas.
- Professionals publishing explainers and essays.
- Builders who need quality writing without public drafting pressure.

## V1 scope

## In scope

- Private editor with autosave and revisions.
- Idea-to-draft generation from messy input.
- Five AI collaborator personas with configurable intensity.
- Inline and summary feedback with accept/reject/pin actions.
- Publish flow with privacy-safe defaults.
- Freshness engine that flags likely outdated published content.
- Update approval dashboard for post-publish maintenance.

## Out of scope

- Team collaboration and permissions hierarchy.
- Full mobile-native apps.
- Marketplace for third-party personas.
- Full analytics suite for writing growth.

## Core UX flows

## Flow A: Start writing without blank-page friction

1. User opens new draft.
2. User enters rough notes, fragmented points, or optional transcript.
3. System generates structured draft options:
   - argument-led
   - narrative-led
   - concise brief
4. User selects a base draft and edits directly.

## Flow B: Collaborate with AI personas

1. User clicks "Review Draft."
2. Persona runs execute in parallel.
3. Aggregator returns prioritized feedback in three buckets:
   - Now
   - Soon
   - Optional
4. User accepts, dismisses, or pins suggestions.

## Flow C: Publish and maintain relevance

1. User publishes article.
2. Freshness engine monitors tracked claims.
3. Drift event creates update task in dashboard.
4. User approves context banner, addendum, or revision.

## Functional requirements

## FR-1 Drafting

- System must support raw input pasted from any source.
- System must generate at least three draft structures from rough input.
- System must allow user to preserve their style preference profile.

## FR-2 Feedback

- System must run five personas in parallel with consistent output schema.
- System must cap default feedback volume to prevent overwhelm.
- System must expose source-linked evidence for factual challenges.

## FR-3 Publishing

- Posts must be private by default.
- Public visibility must require explicit publish confirmation.
- Published content must retain immutable publish timestamp and revision log.

## FR-4 Freshness

- System must extract and track claims from published posts.
- System must classify drift severity and confidence.
- System must not silently rewrite published text.

## FR-5 Trust and safety

- User must be able to export and delete data.
- System must log AI suggestions and user actions for auditability.
- User must be able to disable freshness monitoring per post.

## Non-functional requirements

- P95 draft load time under 400ms.
- P95 initial feedback digest under 4s.
- Persona completion stream begins under 2s.
- Core actions are keyboard accessible.
- WCAG 2.2 AA contrast and focus states.
