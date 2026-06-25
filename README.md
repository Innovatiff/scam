# Scam or Safe

A public-safety website where people can check suspicious messages and browse
evergreen scam guides before they click, reply, or send money.

**One website, many pages** — built to scale from 25 guides today to 500+ without
hand-coding HTML. Pages are generated from data by a small static site generator,
so the deployed site is **pure static HTML/CSS/JS** (ideal for SEO, speed, and
AdSense). Firebase is wired in for optional analytics.

---

## How it works

```
data/categories.json   ← 11 scam categories (the 500-page roadmap lives here)
data/scams.json        ← every scam guide (add an entry = add a page)
site.config.json       ← site URL, AdSense publisher ID, Firebase config
src/assets/            ← CSS + client-side JS (design system + scam checker)
scripts/build.js       ← the generator: data + templates -> /dist (static HTML)
scripts/serve.js       ← zero-dependency local preview server
dist/                  ← generated output (deploy this; git-ignored)
```

### Build & preview

```bash
npm run build     # generate /dist
npm run serve     # preview at http://localhost:8080
npm run dev       # build + serve
```

No dependencies are required — everything uses the Node.js standard library.

---

## Add a new scam guide

1. Add one object to `data/scams.json` using the fields below.
2. Run `npm run build`. The guide, its category listing, sitemap, and internal
   links are all generated automatically.

```jsonc
{
  "title": "Example Scam",
  "slug": "example-scam",            // becomes /scams/example-scam/
  "category": "email-scams",         // must match a slug in categories.json
  "metaTitle": "…", "metaDescription": "…",
  "riskLevel": "High",               // High | Medium | Low
  "scamType": "…",
  "summary": "…",
  "quickVerdict": { "mainRedFlag": "…", "whatToDoFirst": "…" },
  "exampleMessage": "Example pattern: …",   // fictional / anonymised only
  "redFlags": ["…"],
  "whatToDo": ["…"],
  "ifYouClicked": ["…"],
  "whatNotToDo": ["…"],
  "faqs": [{ "question": "…", "answer": "…" }],
  "relatedScams": ["other-slug"],    // unknown slugs are skipped safely
  "lastReviewed": "2026-06"
}
```

## Add or adjust a category

Edit `data/categories.json`. Each category renders a page at `/<slug>/` and lists
its guides. The `plannedPages` field documents the roadmap to ~500 pages:

| Category | Planned |
|---|---|
| Text Message | 70 |
| Email | 60 |
| Marketplace | 60 |
| Social Media | 60 |
| Job | 50 |
| Bank & Payment | 50 |
| Online Shopping | 50 |
| Delivery & Postal | 40 |
| Rental & Housing | 30 |
| Crypto & Investment | 30 |
| Government, Tax & Legal | 30 |

---

## Pages generated

- `/` homepage · `/scam-checker/` · `/scam-types/` (all guides index)
- `/<category>/` for each of the 11 categories
- `/scams/<slug>/` for each guide
- `/about/` `/contact/` `/privacy-policy/` `/terms/` `/disclaimer/`
  `/report-a-scam/` `/how-we-review-scams/`
- `404.html`, `sitemap.xml`, `robots.txt`, `ads.txt`, `favicon.svg`

Every page has a unique title + meta description, one `<h1>`, breadcrumbs,
Open Graph tags, and JSON-LD (BreadcrumbList, FAQPage, Article).

---

## The scam checker

`src/assets/js/checker.js` runs **entirely in the browser**. Pasted text is never
sent to a server and is not stored. It matches common scam patterns (urgency,
threats, account-locked claims, payment/gift-card/crypto requests, suspicious or
shortened links, password/code requests, off-platform requests, and more),
produces a Low/Medium/High risk level, and shows red flags, next steps, and
related guides. It deliberately never says "definitely a scam."

---

## AdSense

The site is **AdSense-ready but ads are off by default**, in two stages:

**Stage 1 — apply / get verified.** Set your real publisher ID (keep `enabled`
false):
```json
"adsense": { "enabled": false, "publisherId": "ca-pub-XXXXXXXXXXXXXXXX" }
```
On the next build, the AdSense loader snippet appears in every page's `<head>`
(so Google can verify and review the site) and `ads.txt` updates automatically —
but **no ads render** yet.

**Stage 2 — after approval.** Flip the flag:
```json
"adsense": { "enabled": true, "publisherId": "ca-pub-XXXXXXXXXXXXXXXX" }
```
Now the reserved ad slots fill in across the policy-safe zones. Run `npm run build`.

While disabled, ad slots render only as reserved HTML comments (no layout shift,
no empty boxes). Ad slots are placed in policy-safe zones only — below the hero,
between content sections, after the FAQ, in the related-guides area, and in the
desktop sidebar. They are **never** placed inside the scam-checker result box or
next to action buttons.

## Analytics

Firebase Analytics is configured in `site.config.json`
(`analytics.firebaseEnabled`). It loads via the official Firebase ES modules and
never sees the content of checked messages.

---

## Deploy (Firebase Hosting)

```bash
npm run build
firebase deploy --only hosting   # firebase.json points "public" at /dist
```

`firebase.json` enables clean URLs, trailing slashes, and long-lived caching for
`/assets`.

---

## Principles

Trust first. Educational guidance only — no exaggerated claims, no fake
authority, no "100% scam" or "guaranteed safe." Examples are fictional and
labelled. We never ask for passwords, banking details, ID numbers, or full card
numbers, and we do not store the messages people check.
