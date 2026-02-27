# Agent Workstreams and Ship Plan

Last updated: February 27, 2026

## Goal

Ship quickly by assigning focused parallel workstreams ("agents") with clear deliverables and handoff contracts.

## Workstream agents

## Agent 1: Product Intelligence

Mission:

- Track competitor movements (Prism, Lex, Notion, Grammarly, Ghost/Substack).
- Publish weekly deltas and implications.

Deliverables:

- `weekly-competitor-brief.md`
- updated positioning recommendations

Success metric:

- Less than 7 days from competitor change to internal recommendation.

## Agent 2: Drafting and Voice Fidelity

Mission:

- Build idea-to-draft pipeline that preserves user style and removes AI-slop patterns.

Deliverables:

- style profile schema
- draft composer service
- anti-slop lint rules
- style eval harness

Success metric:

- User-rated "sounds like me" >= 4/5 in pilot cohort.

## Agent 3: Real-time Research and Fact Feedback

Mission:

- Add low-friction factual confidence checks during drafting and revision.

Deliverables:

- claim extraction
- confidence badges in editor
- source inspector drawer

Success metric:

- Reduction in post-publication factual corrections.

## Agent 4: Freshness and Update Approvals

Mission:

- Build post-publish drift detection and approval dashboard.

Deliverables:

- freshness scheduler
- update suggestion engine
- approval workflow UI

Success metric:

- >= 80% of high-impact drift items reviewed within 72 hours.

## Agent 5: Trust, Security, and Standards

Mission:

- Ensure privacy controls, secure architecture, and language-quality standards are enforced.

Deliverables:

- privacy model and retention policies
- security checklist implementation
- plain-language and accessibility rubric

Success metric:

- Security controls pass before public beta gate.

## 8-week suggested schedule

Week 1-2:

- finalize product spec
- implement core editor + private drafts + first idea-to-draft flow

Week 3-4:

- style profile + anti-slop pass
- initial fact-confidence feedback

Week 5-6:

- publish flow + freshness detection backend
- update queue dashboard v1

Week 7-8:

- hardening (security, observability, quality)
- pilot rollout with 20-50 users

## Execution rituals

- Daily: 15-minute cross-agent blocker review.
- Twice weekly: integration demos.
- Weekly: decision log update in `DOCS/`.
