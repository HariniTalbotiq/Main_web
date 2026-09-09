# Moving the site to talbotiq.com

Everything in the repo is already written for `https://talbotiq.com` — canonical
tags, Open Graph, JSON-LD, the sitemap. The code half of the migration is done.
This file is the other half, and it is dashboard and DNS work.

## Read this first

**talbotiq.com is not empty.** It currently serves a WordPress site
(`<title>Home - Talbotiq</title>`). Pointing DNS at Vercel does not claim a free
domain, it **replaces a running production site**. Nothing below should be
started until somebody who owns that site has agreed it is being retired.

A consequence that is easy to miss: `products.js` and `home.js` link *out* to
that WordPress site in ten places —

```
https://talbotiq.com/ecosystem/
https://talbotiq.com/contact-us/
https://talbotiq.com/inquiry-now/
https://talbotiq.com/privacy-policy/
https://talbotiq.com/services/ai-strategy-consulting/
https://talbotiq.com/products/sales-crm/
https://talbotiq.com/products/task-management-system/
```

The moment DNS moves, every one of those 404s **on your own domain, from links
inside the new site**. Step 7 deals with it. Do not skip it.

---

## 1 · Add the domain in Vercel

Project → Settings → Domains → add both:

- `talbotiq.com`
- `www.talbotiq.com`

Vercel shows a card per domain with the exact DNS values for *this* project.
Use the values on your own cards, not the ones in any tutorial — Vercel issues
per-project targets now.

## 2 · DNS at the registrar

| Record | Host | Value |
|---|---|---|
| A | `@` (apex) | the IP on your Vercel domain card (the general-purpose one is `76.76.21.21`, but prefer the card) |
| CNAME | `www` | the target on your card, e.g. `d1d4fc829fe7bc7c.vercel-dns-017.com` (the older `cname.vercel-dns.com` still resolves) |

The apex must be an **A record**, never a CNAME. RFC 1034 forbids a CNAME
sitting alongside the NS and SOA records every zone apex carries.

Before you add anything:

- **Delete stale apex A records** pointing at the old WordPress host. They block
  verification.
- **Delete any AAAA records on the apex.** Vercel does not serve IPv6 for domains
  on third-party DNS; a leftover AAAA splits traffic and can stall SSL.
- **Do not touch MX or TXT.** If talbotiq.com sends or receives mail, deleting MX
  records takes the mail down. Only add or change A, CNAME and CAA.

## 3 · Choose the canonical host — apex

The decision is `https://talbotiq.com`, no `www`. In Vercel's Domains section set
`www.talbotiq.com` to **redirect to** `talbotiq.com`.

Worth knowing you are going against the grain: Vercel's own guidance leans toward
`www` as canonical, because a `www` CNAME resolves faster than an apex A record
and because cookies set on an apex are visible to every subdomain. Apex is the
nicer URL and it is what every canonical tag in this repo already says. It is a
one-time decision — flipping it later means redirecting a domain Google has
already indexed.

## 4 · Set the production domain

Project → Settings → Domains → set `talbotiq.com` as the **Production Domain**.

## 5 · SSL

Provisions automatically once DNS verifies. **Confirm the certificate is issued
before telling anyone the domain is live.** A half-provisioned domain serves a
browser warning, which is worse than serving nothing.

## 6 · Retire the vercel.app host

Only after `https://talbotiq.com` serves the site correctly. Add this as the
**first** entry in the `redirects` array in `vercel.json`:

```json
{
  "source": "/:path*",
  "has": [{ "type": "host", "value": "talbotiq-site.vercel.app" }],
  "destination": "https://talbotiq.com/:path*",
  "permanent": true
}
```

It is deliberately **not** in `vercel.json` today. The site currently lives on
`talbotiq-site.vercel.app`; adding it now would redirect every visitor to the
WordPress site instead.

Name the exact alias. A wildcard like `*.vercel.app` would also swallow every
preview deployment (`talbotiq-site-git-branch-team.vercel.app`) and you would
lose the ability to review a branch before merging. Requests already on
`talbotiq.com` do not match the `has` condition, so there is no loop.

## 7 · Redirect the WordPress URLs you are replacing

The seven paths at the top of this file are live and possibly indexed. Add a
redirect for each so they land somewhere real instead of 404ing:

```json
{ "source": "/ecosystem",       "destination": "/#products",                          "permanent": true },
{ "source": "/contact-us",      "destination": "/contact",                            "permanent": true },
{ "source": "/inquiry-now",     "destination": "/demo",                               "permanent": true },
{ "source": "/privacy-policy",  "destination": "/",                                   "permanent": true },
{ "source": "/services/ai-strategy-consulting", "destination": "/solutions/ai-strategy-consulting", "permanent": true },
{ "source": "/products/sales-crm",              "destination": "/products/sales-crm",              "permanent": true },
{ "source": "/products/task-management-system", "destination": "/products/task-manager",           "permanent": true }
```

`/privacy-policy` is the uncomfortable one — the new site has no privacy policy
to send it to, and pointing a privacy policy at a homepage is not a great answer
for anyone who followed that link on purpose. Write the page, or accept the 404
knowingly.

Before shipping these, crawl the WordPress site for its full URL list. Seven is
what *this repo* links to, not what that site publishes.

## 8 · Search Console

Verify `https://talbotiq.com` only, and submit `https://talbotiq.com/sitemap.xml`.

Never add the vercel.app property. After step 6 it should never be indexed, and
adding it invites Google to crawl a host whose only job is to 308 away.

---

## Verify after DNS resolves

Everything above the line has been tested locally against `vercel dev`. These
are the ones that can only be checked once DNS is live:

- [ ] `https://talbotiq.com` serves the site over HTTPS with a valid certificate
- [ ] `https://www.talbotiq.com` → 308 → `https://talbotiq.com`
- [ ] `http://talbotiq.com` → HTTPS
- [ ] `https://talbotiq-site.vercel.app/products/video-interview` → 308 →
      `https://talbotiq.com/products/video-interview` — **path preserved**, not
      dumped at the root
- [ ] A preview deployment URL still loads normally and is **not** redirected
- [ ] Each of the seven WordPress paths in step 7 lands on a real page
- [ ] A link preview (Slack, WhatsApp, LinkedIn) renders the share card

## Where the domain is written down

`https://talbotiq.com` appears in exactly three kinds of place. A future domain
change is these, and nothing else:

| Where | What | How many |
|---|---|---|
| `site.config.json` | `siteUrl` — the generated pages (`/`, `/demo`, `/404`) read canonical, og:url and og:image from here | 1 |
| `robots.txt` | the `Sitemap:` line | 1 |
| the 24 hand-written pages | canonical, `og:url`, `og:image`, `twitter:image`, JSON-LD `url`/`@id` | ~7 per page |
| `sitemap.xml` | generated — `npm run sitemap` rewrites it from `site.config.json` | never edit by hand |

The hand-written pages are the awkward set, and the honest reason they are
awkward is that they are hand-written. `tools/clean-urls.js` already knows how to
sweep all 24 for URL shapes; a domain change is one more rule in it.
