# Phase 1 — page map

One page per intent. "cheap / affordable / budget" are one intent and live in body copy once pricing
exists — never as three URLs. Every URL below exists today and is in `sitemap.xml`.

## Core cluster — interview and hiring software

| URL | Primary query | Intent | Why its own URL |
|---|---|---|---|
| `/products` | interview software formats compared | commercial research | The only page that compares all nine formats in one table and lists every product page; it was a 404 named by every breadcrumb. |
| `/products/video-interview` | video interview software | commercial | Umbrella for the three video modes; the page the homepage tile lands on. |
| `/products/recorded-video-interview` | asynchronous / one-way / recorded video interview software | commercial | Distinct format with its own scheduling argument. |
| `/products/ai-avatar-interview` | conversational AI avatar interview | commercial | Distinct format (avatar assessor, disclosed to the candidate). |
| `/products/two-way-interview` | two-way live interview software | commercial | Distinct format: live, human-scored, AI beside. |
| `/products/voice-interview` | voice interview software | commercial | Distinct format; the "no camera" answer. |
| `/products/chat-interview` | chat / chatbot interview software, blind assessment | commercial | Distinct format; AI-answer detection. |
| `/products/conversational-chat-interview` | conversational chatbot interview | commercial | Distinct: no clock, adaptive follow-ups. |
| `/products/mcq-rounds` | MCQ interview software | commercial | Distinct: auto-marked, no model. |
| `/products/timed-qa` | timed Q&A interview software | commercial | Distinct: per-question timer. |
| `/products/mimic` | AI interview platform | commercial | The platform the nine formats run on; kept as the overview page. |
| `/products/recruitment-software` | recruitment software / ATS for teams and agencies | commercial | The applicant tracking system; Hire Mode and Agency Mode. |

## Other product lines — one page each, no clusters

| URL | Primary query |
|---|---|
| `/products/sales-crm` | sales CRM with quote-to-cash and approvals |
| `/products/business-management-system` | business management system / ERP for SMEs |
| `/products/task-manager` | task and productivity manager with AI triage |
| `/products/document-management` | document management / receipt and card parsing |
| `/products/note-taker` | AI meeting notes / minute taker |
| `/products/vawlt` | private AI engine / secure local LLM and SLM |

## Services

| URL | Primary query |
|---|---|
| `/solutions` | AI consulting and development services (hub; was a 404 named by every solution breadcrumb) |
| `/solutions/ai-strategy-consulting` | AI strategy consulting |
| `/solutions/ai-agent-bot-development` | AI agent development company / bespoke AI agents |
| `/solutions/embedded-edge-ai` | embedded edge AI development |
| `/solutions/full-stack-ai-integration` | full stack development and AI integration |

## Company

`/` (brand), `/about`, `/contact`, `/demo`. `/signin` and `/404` are `noindex` / excluded.

## Deliberately not built, and what unblocks each

| Proposed in the strategy | Status | Unblocks it |
|---|---|---|
| `/pricing` | **Brief only** (02-content-briefs §1). The strategy's #1 lever, and the one thing the repo has no facts for. | Real tier prices, limits, seats, trial/setup/cancellation terms. |
| `/compare/talbotiq-vs-*`, `/alternatives/*` | **Brief only** (§2). Strategy says: confirm the competitor list first. | A confirmed list; a dated capture of each competitor's public pricing and feature pages. |
| `/affordable-interview-software` | **Not built.** Without a price the page would be the doorway pattern the strategy warns about. | The pricing page; then this becomes one section of it or one page with the cost calculator. |
| `/solutions/ats-for-small-business`, `/solutions/interview-software-for-startups` | **Not built.** `/solutions` is the services hub here; a persona page with no unique facts is thin. | Customer evidence per segment (quotes, anonymised numbers). |
| `/products/coding-interview` | **Not built.** No such product exists; the nearest is MCQ rounds. | A coding-assessment product. |
| `/blog/`, `/glossary/` | **Not built.** The "Blog" nav item points at `/#insights`, which republishes The Edge Malaysia columns. | Original articles; original data (Part C §5). |
| `/security`, `/integrations`, `/privacy-policy`, `/terms` | **Not built.** Legal and security pages need the company's own text. | Drafts from the company; the privacy page is the urgent one (the demo form collects PII). |

## Internal linking after this pass

Hubs are linked from the Products/Solutions nav panels, both footer columns, the mobile drawer and the
homepage product band. Product pages carry a visible breadcrumb to `/products`; solution pages to
`/solutions`. Deepest page: 2 clicks. Orphans: none. Anchor text is always the page's name or its
subject, never "click here".
