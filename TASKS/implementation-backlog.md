# Implementation Backlog

Last updated: February 27, 2026

## Epic A: Idea-to-draft composer

Ticket A1:

- Build endpoint `POST /v1/posts/{postId}/compose`.
- Input: rough thoughts.
- Output: three draft structures.
- Owner: Agent 2.

Ticket A2:

- Implement anti-slop lint pass.
- Include configurable punctuation and phrase repetition limits.
- Owner: Agent 2.

Ticket A3:

- Persist style profile and per-user defaults.
- Owner: Agent 2.

## Epic B: Persona review engine

Ticket B1:

- Implement review-run orchestration queue.
- Owner: Agent 2.

Ticket B2:

- Add normalized persona output schema validation.
- Owner: Agent 5.

Ticket B3:

- Build conflict tradeoff card generation.
- Owner: Agent 2.

## Epic C: Fact confidence support

Ticket C1:

- Claim extraction pipeline for drafts and published posts.
- Owner: Agent 3.

Ticket C2:

- Inline confidence badges and source drawer UI.
- Owner: Agent 3.

Ticket C3:

- Add hard block warning for high-risk unresolved claims at publish.
- Owner: Agent 3.

## Epic D: Freshness monitoring and approvals

Ticket D1:

- Create freshness scheduler by claim volatility tier.
- Owner: Agent 4.

Ticket D2:

- Implement `GET /v1/freshness/updates`.
- Owner: Agent 4.

Ticket D3:

- Implement decision endpoint and audit logging.
- Owner: Agent 4.

## Epic E: Privacy, security, and governance

Ticket E1:

- Configure row-level security and tenant isolation tests.
- Owner: Agent 5.

Ticket E2:

- Add data retention settings and deletion jobs.
- Owner: Agent 5.

Ticket E3:

- Add event audit log for all AI suggestion decisions.
- Owner: Agent 5.

## Sprint 1 (start now)

- A1, B1, D2, E1 as initial build slice.
- Exit criteria:
  - create post
  - save revision
  - trigger review run
  - list update queue
