# Agentic AI Compliance, Security, and Language Standards

Last updated: February 27, 2026

## Why this exists

This document turns "build fast" into "build fast without trust debt."

## Agentic AI build references

- OpenAI practical guide to building agents: https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf
- OpenAI Responses API updates (background mode, reasoning summaries, tool integrations): https://openai.com/index/new-tools-and-features-in-the-responses-api/
- OpenAI data controls: https://developers.openai.com/api/docs/guides/your-data
- OpenAI Model Spec: https://model-spec.openai.com/
- Model Context Protocol specification: https://modelcontextprotocol.io/specification/2025-06-18

## Core architectural compliance requirements

## 1) Human control and reversibility

- No autonomous publishing without explicit user approval.
- Every AI change suggestion must be diffable and reversible.
- Keep immutable audit log of approvals/rejections.

## 2) Privacy by default

- Private drafts by default.
- Explicit user action required for public exposure.
- Per-workspace retention settings with clear defaults.

## 3) Data minimization

- Store only required metadata for monitoring and quality.
- Avoid retaining raw prompt content where not required.
- Separate analytic telemetry from user content.

## 4) Tool and agent boundaries

- Define allowed tool scopes per agent role.
- Enforce strict schema validation for tool outputs.
- Require confidence and evidence objects for factual claims.

## Security baseline references

- OWASP Top 10 (A02 Cryptographic Failures): https://owasp.org/Top10/2021/A02_2021-Cryptographic_Failures/
- NIST SP 800-63B-4 (authentication): https://www.nist.gov/publications/nist-sp-800-63b-4digital-identity-guidelines-authentication-and-authenticator
- CISA secure by design guidance: https://www.cisa.gov/resources-tools/resources/secure-design-alert-eliminating-cross-site-scripting-vulnerabilities

## Security controls checklist (minimum)

- TLS 1.2+ in transit, AES-256 at rest.
- Strong session management and MFA support.
- Row-level authorization for multi-tenant isolation.
- Secrets management with rotation.
- Signed, append-only audit logs.
- Dependency and container scanning in CI.
- Backups with tested restore procedures.

## Natural language quality standards

References:

- Plain Writing Act resources: https://www.plainlanguage.gov/
- U.S. web plain language standards summary: https://digital.gov/resources/plain-language-summary/
- ISO 24495-1 plain language standard overview: https://www.iso.org/standard/78907.html
- WCAG 2.2 (readable, understandable content): https://www.w3.org/TR/WCAG22/

Product requirements:

- Default to clear, plain language output.
- Avoid unexplained jargon unless user explicitly requests technical depth.
- Cite sources for non-trivial factual claims.
- Mark uncertainty and potential staleness clearly.
- Provide readable structure (headings, short paragraphs, lists).

## Governance model

- Weekly safety and quality review across agents.
- Monthly retention and privacy policy audit.
- Release gates:
  - security checklist pass
  - factuality benchmark pass
  - readability and accessibility checks pass

## Open implementation decisions

- Choose retention defaults by plan tier.
- Choose a citation-provider policy (first-party + trusted third-party).
- Define acceptable factual confidence thresholds by content category.
