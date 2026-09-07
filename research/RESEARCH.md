# TalbotIQ product research — evidence log

Every claim on the landing page traces to a line in this file.
Method: real browser (Playwright) against each live URL, 2026-09-07.
Where an app is auth-gated, structure was read from the **shipped public
source/bundle** (route tables, nav manifests) — never guessed from the name.

Legend: **[V]** verified in the running app · **[O]** official talbotiq.com copy · **[?]** unverified, NOT used in copy

---

## Company (talbotiq.com)

| Fact | Source |
|---|---|
| Talbotiq Technologies Sdn Bhd [1313215-V] | footer **[O]** |
| Based in Malaysia · +603 20 111 320 | about-us **[O]** |
| "Architecting the Intelligence Layer of Modern Businesses" | homepage H1 **[O]** |
| "Bridging the Gap Between Speculative Hype and Operational Excellence" | homepage sub **[O]** |
| "Intelligent AI Automation" | logo lockup **[O]** |
| "Technology is a tool. Intelligence is the edge." | about-us **[O]** |
| Values: Innovation at Speed · Integrity in Data · Collaborative Intelligence | about-us **[O]** |
| "No 'AI hype.' We build tools that solve actual business bottlenecks." | homepage **[O]** |
| Industries: Healthcare, Retail & Commerce, Finance, Supply Chain & Logistics, F&B | homepage **[O]** |
| Brand mark colours #30B484 / #249054 / #F0D860 | pixel-sampled from official logo PNG |

**Editorial voice** (from Mimic + Recapr, both TalbotIQ-built): plain, concrete,
anti-hype, admits limits in public. Mimic literally ships the line *"We do not
display certification badges we cannot evidence."* The landing page copy matches
this register — it is the house voice, not a style I chose.

---

## 01 Mimic — https://talbotiq-9cc4e.web.app/ · **fully public marketing site**

- Title: *"Mimic by TalbotIQ, AI Interviews for Every Candidate"* **[V]**
- Positioning: "Screening intelligence, decided by humans." **[V]**
- **Six interview formats** **[V]**: AI video avatar · Voice screening · Assessments ·
  Conversational chat · Timed Q&A · Live two-way call. "Five of the six score
  against the same rubric."
- Flow **[V]**: Configure once → Invite in bulk → Interview on their schedule →
  Score every answer → Decide with a shortlist
- Workspace **[V]**: bulk invites (spreadsheet / ATS export / shareable link),
  interview pipelines with drag-to-advance + score thresholds, one rubric across
  formats, analytics by role/template/format/recruiter, an assistant that operates
  the product with confirmation
- Scoring **[V]**: six default weighted criteria, weights rescale to 100%, each
  criterion links to the passage it came from; "The platform does the arithmetic,
  not the model"; flags when unsure
- Governance **[V]**: "Mimic never rejects anyone" · one rubric applied identically
  · every decision written to audit history
- Marketing name on talbotiq.com: **Chat & Video Interview Tool** **[O]**

## 02 Recapr — https://recapr-web-...run.app/ · **fully public marketing site**
*(the user calls this "Minute Taker"; the product brands itself Recapr — © 2026 Talbotiq)*

- Title: *"Recapr: the meeting, on the record"* **[V]**
- Pipeline **[V]**: Capture → Understand → Decipher → Act
- **[V]** Live transcription w/ speaker attribution + timestamps; decisions, action
  items, risks; "Vibe Check" score out of 100; Commitment Tracker (KEPT/OPEN/SLIPPED);
  cross-meeting memory with **contradiction detection quoting both sides**;
  "Ask the record" Q&A with jump-to-timestamp; mark-the-moment hotkey (⌘⇧K)
- **[V]** Capture surfaces: in-person room, browser tab, upload, Chrome extension
  inside Meet/Zoom/Teams. "No bot to invite."
- **[V]** Desktop Copilot hidden from screen share (Windows 10 2004+ capture exclusion)
- **[V]** Privacy: scoped to your account (404 to others), delete means delete,
  nothing is published
- **[V]** Platforms: macOS, Windows, Android shipping; iPhone "waiting on App Store";
  builds not yet code-signed (stated by the product itself)

## 03 NousCRM — https://salescrm-next-...run.app · **auth-gated**

- UI name **NousCRM**; meta description "Sales CRM" **[V]**
- Routes returning 200 (existence probe) **[V]**: `/dashboard` `/opportunities`
  `/customers` `/contacts` `/invoices` `/approvals` `/settings`
- Routes returning 404 — **explicitly NOT claimed**: `/leads` `/deals` `/pipeline`
  `/quotes` `/campaigns` `/forecast` `/reports`
- Dashboard API endpoints in the shipped bundle **[V]**: `stats`, `approvals`,
  `approvals-count`, `opportunity-by-stage`, `opportunity-source`, `rep-target`,
  `sales-team-performance`, `salesrep-performance-chart`, `salesreps`
- Marketing name: **AI Sales CRM** — "The Intelligent Hub for high-growth sales teams" **[O]**

## 04 lexerai (Document Parser) — https://docparser-...run.app/ · **auth-gated, login page is descriptive**

- Brands itself **lexerai** · *"Contact & Receipt Intelligence Platform"* **[V]**
- Headline: "Turn documents into structured data." **[V]**
- **[V]** "AI-powered extraction reads business cards and receipts in any language,
  pulls out every field, converts currencies, and flags tampering — with local OCR
  as an automatic offline fallback."
- Sidebar (shipped markup) **[V]** — Overview: Dashboard · Contacts · Receipts ·
  Analytics · Reports · Bank Statements · Reconcile / Capture: Upload cards ·
  Upload receipts / Manage: Settings · Admin
- **[V]** "Slip", the document copilot (Ask AI) · ⌘K palette · mobile Scan tab

## 05 TalbotIQ AI Engine — https://coe.talxone.com/dashboard/ · **internal admin console, password-gated**

Read from the shipped bundle. This is an **internal control plane**, not a
self-serve product — positioned as the layer beneath the suite, not a SKU.

- Title: "TalbotIQ — AI Engine Admin"; "Internal admin console · Sessions are
  server-side and expire automatically." **[V]**
- Sections **[V]**: Overview · Usage · Models · Knowledge Base · Logs · API Keys · Console
- **Per-product metering [V]** — *"Volume, token consumption, and how close each
  product is running to its rate limit."* Registered product keys found: **PMS,
  MIMIC, Recapr**. ← this is the ecosystem proof, from the engine itself
- Model routing **[V]**: `gemini-2.5-flash` and an SLM `qwen3-4b`; labels
  "Routed to Gemini" / "Served by Gemini" / "SLM comparable" / "SLM acceptable"
- Privacy **[V]**: "PII-redacted before the model", "Scrub PII", "PII scrubbing is
  on by default", "Redacted before the model"
- Knowledge Base **[V]**: documents indexed, total chunks, embeddings; PDF/DOCX/TXT
- Telemetry **[V]**: requests over time, input/output tokens, latency, accuracy,
  errors, request ID, served-by, task, product; rate-limit states
  (Comfortable / Approaching / At ceiling)
- **NOT claimed** — the console states *"The comparison pipeline is not built yet."*
  so the SLM-vs-Gemini shadow evaluation is described as planned, or omitted.

## 06 Talbotiq HRMS — https://hrms-app-production-...railway.app/ · **auth-gated**

Served **unbundled**, so `src/config/routes.js` — the annotated real route table —
is readable. Strongest evidence of any product here.

- "Sign in to your people workspace" · v1.0.0 **[V]**
- Source comment **[V]**: *"Five modules exist there: Dashboard, Employees,
  Attendance, Leave, Claim"* (mapped from the live Django product)
- Verified routes **[V]**: My Space (`/me`, profile) · Approvals inbox (attendance /
  leave / claims) · Employees (directory + detail) · Attendance (requests, mark,
  shift schedule) · Leave (requests, apply, balances, calendar, settings) ·
  Claims (requests, submit, settings)
- **Payroll [V]** — a full suite: runs, run detail, calendar, processing, approvals,
  employee payroll, salary structures, salary components, allowances, deductions,
  overtime, bonuses, payroll claims, payroll inputs, payslips, payslip distribution,
  reports, bank payments, audit trail, settings
- **Malaysian statutory [V]**: EPF · SOCSO · EIS · PCB/MTD — real, and a genuine
  regional differentiator
- **NOT claimed**: recruitment, performance reviews, employee *creation* — the source
  says the "Add employee" route was removed because no form exists behind it.

## 07 Task & Project Management System — **no app URL supplied**

Official product page exists, so copy is **[O]**, not invented:
- "All-in-one Platform for Team Collaboration — Plan, Track and Execute" **[O]**
- Centralized Task Control — boards, calendars, Gantt, automated reminders **[O]**
- Seamless Team Collaboration — shared workspaces, in-task comments, file sharing **[O]**
- Frictionless Productivity — timers, recurring automation, Slack/email/calendar **[O]**
- AI User Triage — turns incoming requests into structured briefs, scores priority,
  assigns by availability **[O]**
- Status on page: **live product, app URL pending** (not "coming soon")

## 08 PMS — **no URL, and the name is genuinely ambiguous**

- The AI Engine registers a product key literally named **`PMS` [V]** — so a real
  system by that name is in production and consuming the engine.
- What PMS expands to is **not verifiable**: Project Management System? Property?
  Payroll? It is *not* the same as the Task & Project Management System, which the
  user listed separately.
- Handled as a genuine placeholder. **No features claimed.** One flag in the data
  model flips it to a full card.

---

## Cross-product ecosystem claims — what is actually defensible

1. **The AI Engine meters usage per product, and PMS / MIMIC / Recapr are registered
   in it.** **[V]** Direct evidence of a shared intelligence layer.
2. **"AI User Triage" is a named capability on every talbotiq.com product page** —
   CRM, ERP, Task, Recruitment, Interview. **[O]** TalbotIQ's own shared thread.
3. **The product pages cross-list each other as "Integrated Modules."** **[O]**
4. Anything beyond this (data sync, SSO, shared records) is **NOT claimed** — no
   evidence was found and it is not on the page.

## Deliberately excluded
Customer logos · testimonials · counts of users/companies · uptime or accuracy
numbers · security certifications · funding · awards. None were verifiable, and
Mimic's own site refuses to show unevidenced badges — so the ecosystem page does too.
