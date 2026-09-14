# Claims in the new copy that need a source before publishing

Everything written in this pass was taken from the product pages, `products.js` or
`research/RESEARCH.md`. These are the sentences a reader could still challenge, with where each came
from, so you can confirm them before the deploy goes live.

## Hub page `/products` (`seo/hub.json`)
| Claim | Source | Check |
|---|---|---|
| "nine interview formats" | nine format pages exist under `/products/` | Confirm all nine are products you sell separately, or reword to "nine ways to run an interview round". |
| "candidates take their round in a browser or on the phone they already have" | video page: "Runs in the browser. Nothing for the candidate to install."; voice page: "on the phone they already have" | Confirm this holds for every format, not only video and voice. |
| "It never rejects anyone; a named person makes every decision." | `products.js` (Mimic): "Mimic never rejects anyone"; recruitment page: "actions a named person takes" | — |
| "each score linked to the transcript or moment it came from" | video / avatar / voice pages | Confirm for MCQ (auto-marked) and two-way (human-scored) — the sentence says "the scored formats". |
| "Pricing is quote-based. There is no public price list." | product pages' `Offer` schema: "Quote-based. Book a demo." | Replace the moment a price list exists. |
| "scrubbing personal data before anything reaches a model" | `products.js` AI Engine: "scrubs PII before anything reaches a model" | — |
| "Mimic runs interview pipelines… advanced by drag or by score threshold" | `research/RESEARCH.md` §01 [V] | — |
| Vawlt "lists, task by task, which run on our own hardware" | vawlt page: "27 of 33 AI tasks… the catalogue says exactly which" | — |

## Hub page `/solutions`
| Claim | Source | Check |
|---|---|---|
| "four engagements… and a fifth being written up" | `home.js` SOLUTIONS (AI Governance & Security has no page) | — |
| "built by the team that builds the products, on the same private AI engine" | positioning; not stated on a solution page | **Confirm or soften** — the solution pages do not say the engagements use the engine. |
| "our engineers come back with a roadmap" | contact page lede | — |

## Titles and descriptions (`seo/meta.json`)
| Claim | Source | Check |
|---|---|---|
| "for SMEs" (homepage title, ERP title) | ERP page: "An ERP built around how an SME actually runs" | Fine for ERP; for the homepage confirm SMEs are the stated market. |
| "for Teams & Agencies" (ATS title) | recruitment page: Hire Mode / Agency Mode | — |
| "reply within one business day" (contact description) | contact page's existing description | Confirm this is still the promise. |
| "27 of 33 AI tasks… on our own hardware" (Vawlt description) | vawlt page hero | Confirm the count is current. |

## Product-page FAQs (`seo/faq/*.json`)
Each answer carries an `evidence` field: the verbatim sentence from the page it was written from. A
second, independent pass checked every answer against the page and dropped anything unsupported
(one per page, recorded in the workflow journal). Spot-check any page you know has changed since
7–9 September 2026, then run `npm run seo` to regenerate the blocks.

## Organization schema (`build.js`)
| Field | Source | Check |
|---|---|---|
| founder: Akhil Gupta, Group CEO and Founder | about page | — |
| full postal address, phone | `products.js` COMPANY.address / phone | — |
| `sameAs` | **empty** — add LinkedIn company page, Crunchbase, G2, Capterra URLs to `site.config.json` | Until then the field is omitted. |
| `memberOf: PIKOM` (about page schema, pre-existing) | ~~about page schema~~ | **Removed** 2026-09-09, by request, along with the visible "Member of · Trusted by" strip (PIKOM, AISLING, ADASTRA, POMODORO, NAMASTE INDIA) and its CSS. `api/knowledge.json` regenerated so the assistant does not still claim it. |

## Standing exception: "All products, one login" (hero aside)

**Status: shipped, known to be unsupported, awaiting either SSO or removal.**

The homepage hero carries a pencilled aside reading **"All products / one login"**, out to the right
of the two buttons with an arrow back at them. It is the one claim on the site that does not trace
to `products.js` or `research/RESEARCH.md`, and it is here because it was asked for explicitly and
then again after the objection had been put in writing.

What the research actually says:

- `research/RESEARCH.md:168` — SSO is **explicitly not claimed**.
- There are eight applications across six hosts. `GO.signin` in `build.js` still explains why the
  header's "Sign in" points at the product grid rather than at a login screen: there is no single
  login to point it at.

An earlier version of the same aside read "8 products. 1 login." and was **removed** for this
reason. The count is not coming back — that part was simply false and is not worth being wrong
about twice — but the "one login" half is now live in the requester's own wording.

**Resolution, one of two:** single sign-on ships and the line becomes true, or the line goes. It
should not sit indefinitely as the only sentence on the homepage the product cannot back. The
standing note beside `COPY.hero.aside` in `home.js` says the same thing at the point of edit.

Added 2026-09-09.

## Dates
"Published" is the first git commit that added the file; "Updated" is the last commit or today if
the file has uncommitted changes. If a page's real publication date differs, the stamp is honest to
the repo, not to the calendar — say so or backdate the commit history knowingly.
