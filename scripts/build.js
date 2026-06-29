/* Scam or Safe — static site generator.
   Reads JSON data + the templates in this file and emits a fully static
   HTML/CSS/JS site into /dist. Add a scam page by adding an entry to
   data/scams.json — no manual HTML required. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const SRC = path.join(ROOT, "src");

/* ------------------------------------------------------------------ data --- */
const config = readJSON("site.config.json");
const categories = readJSON("data/categories.json");
const scams = readJSON("data/scams.json");

const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
const scamBySlug = Object.fromEntries(scams.map((s) => [s.slug, s]));
const scamsByCategory = {};
for (const s of scams) (scamsByCategory[s.category] ||= []).push(s);

function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

/* --------------------------------------------------------------- helpers --- */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function riskClass(level) {
  return level === "High" ? "risk-high" : level === "Medium" ? "risk-medium" : "risk-low";
}
function riskBadge(level) {
  return `<span class="risk-badge ${riskClass(level)}">${esc(level)} risk</span>`;
}
function reviewedLabel(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

/* ----------------------------------------------------------------- icons --- */
const ICON = {
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  tag: '<path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  bank: '<path d="M3 21h18"/><path d="M5 21V10"/><path d="M19 21V10"/><path d="M9 21v-6h6v6"/><path d="m3 10 9-7 9 7"/>',
  package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.4-.1-.8 0-1.1.3l-.5.5c-.3.3-.4.8-.2 1.2L6 12l-2 3H1.5l-.5.5 3 2 2 3 .5-.5V20l3-2 3.3 2.9c.4.3.9.2 1.2-.1l.5-.5c.3-.3.4-.7.3-1.1z"/>',
  medical: '<path d="M11 2a1 1 0 0 0-1 1v6H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h6v6a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-6h6a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-6V3a1 1 0 0 0-1-1z"/>',
  id: '<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h4M15 12h4M6.5 16c.5-1.3 1.9-2 3.5-2s3 .7 3.5 2"/>',
  gamepad: '<rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4"/><circle cx="15" cy="11" r="1"/><circle cx="18" cy="13" r="1"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  bolt: '<path d="M13 2 3 14h7l-1 8 10-12h-7z"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>'
};
function icon(name, cls = "") {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ICON.shield}</svg>`;
}

/* ------------------------------------------------------------- nav config --- */
const NAV = [
  ["Scam Checker", "/scam-checker/"],
  ["Scam Types", "/scam-types/"],
  ["Popular Guides", "/#popular-guides"],
  ["Report Resources", "/report-a-scam/"],
  ["About", "/about/"]
];

const FOOTER_LINKS = {
  Resources: [
    ["Scam Checker", "/scam-checker/"],
    ["All Scam Types", "/scam-types/"],
    ["How We Review Scams", "/how-we-review-scams/"],
    ["Report a Scam", "/report-a-scam/"]
  ],
  Company: [
    ["About", "/about/"],
    ["Contact", "/contact/"]
  ],
  Legal: [
    ["Privacy Policy", "/privacy-policy/"],
    ["Terms", "/terms/"],
    ["Disclaimer", "/disclaimer/"]
  ]
};

/* ------------------------------------------------------------- components --- */
function header() {
  const links = NAV.map(([t, h]) => `<a href="${h}">${esc(t)}</a>`).join("");
  return `<header class="site-header">
  <div class="container header-inner">
    <a class="logo" href="/" aria-label="${esc(config.siteName)} home">
      <span class="logo-mark">${icon("shield")}</span>
      <span>Scam or <b>Safe</b></span>
    </a>
    <button class="nav-toggle" aria-label="Open menu" aria-controls="main-nav" aria-expanded="false">${icon("menu")}</button>
    <nav class="main-nav" id="main-nav" aria-label="Main navigation">
      ${links}
      <a class="btn btn-primary header-cta" href="/scam-checker/">Check a Message</a>
    </nav>
  </div>
</header>`;
}

function footer() {
  const cols = Object.entries(FOOTER_LINKS).map(([title, links]) =>
    `<div><h4>${esc(title)}</h4>${links.map(([t, h]) => `<a href="${h}">${esc(t)}</a>`).join("")}</div>`
  ).join("");
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <span class="logo"><span class="logo-mark">${icon("shield")}</span><span>Scam or <b style="color:#60A5FA">Safe</b></span></span>
        <p>A public safety resource to help you recognise scam patterns and red flags before you click, reply, or send money.</p>
      </div>
      ${cols}
    </div>
    <p class="footer-disclaimer">This website provides educational information to help people recognise scam patterns and red flags. It is not legal, financial, cybersecurity, or law enforcement advice. We do not verify individual messages, companies, or people, and we never claim that something is definitely safe or definitely a scam.</p>
    <div class="footer-bottom">
      <span>&copy; ${new Date().getFullYear()} ${esc(config.siteName)}. All rights reserved.</span>
      <span>Educational use only.</span>
    </div>
  </div>
</footer>`;
}

function breadcrumbs(trail) {
  const items = trail.map((t, i) =>
    i < trail.length - 1
      ? `<li><a href="${t.url}">${esc(t.name)}</a></li>`
      : `<li aria-current="page">${esc(t.name)}</li>`
  ).join("");
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><div class="container"><ol>${items}</ol></div></nav>`;
}

function trustStrip() {
  const items = [
    ["check", "Educational guidance"],
    ["users", "No account required"],
    ["lock", "Privacy-first checking"],
    ["flag", "Clear red flags"]
  ];
  return `<div class="trust-strip"><div class="container"><div class="trust-grid">
    ${items.map(([ic, t]) => `<div class="trust-item">${icon(ic)}<span>${esc(t)}</span></div>`).join("")}
  </div></div></div>`;
}

function categoryCard(cat) {
  const count = (scamsByCategory[cat.slug] || []).length;
  const countLabel = count ? `${count} guide${count === 1 ? "" : "s"}` : "Guides coming soon";
  return `<a class="card" href="/${cat.slug}/">
    <div class="card-icon">${icon(cat.icon)}</div>
    <h3>${esc(cat.name)}</h3>
    <p>${esc(cat.summary)}</p>
    <p class="card-cat" style="margin-top:10px">${esc(countLabel)}</p>
  </a>`;
}

function scamCard(scam) {
  const cat = categoryBySlug[scam.category];
  return `<a class="card" href="/scams/${scam.slug}/">
    <div class="card-meta">
      ${riskBadge(scam.riskLevel)}
      <span class="card-cat">${esc(cat ? cat.shortName : "")}</span>
    </div>
    <h3>${esc(scam.title)}</h3>
    <p>${esc(scam.summary)}</p>
  </a>`;
}

function faqAccordion(faqs) {
  return `<div class="faq">${faqs.map((f) => `
    <details>
      <summary>${esc(f.question)}</summary>
      <div class="faq-answer">${esc(f.answer)}</div>
    </details>`).join("")}</div>`;
}

function flagList(flags) {
  return `<ul class="flag-list">${flags.map((f) => `<li>${icon("alert")}<span>${esc(f)}</span></li>`).join("")}</ul>`;
}

// Ad slot — disabled by default. Renders nothing visible until AdSense is enabled
// in site.config.json after approval. Never placed inside result boxes or near CTAs.
function adSlot(id) {
  const enabled = !!(config.adsense && config.adsense.enabled);
  if (!enabled) return `<!-- ad slot "${id}" reserved; disabled until AdSense approval -->`;
  return `<div class="ad-slot" data-ad-enabled="true" data-ad-slot="${esc(id)}">
    <div class="ad-label">Advertisement</div>
    <ins class="adsbygoogle" style="display:block" data-ad-client="${esc(config.adsense.publisherId)}" data-ad-slot="${esc(id)}" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>`;
}

function disclaimerBox() {
  return `<div class="disclaimer-box"><strong>Disclaimer:</strong> This page provides educational information only to help you recognise common scam patterns. It is not legal, financial, cybersecurity, or law enforcement advice, and it does not confirm whether any specific message, company, or person is genuine or fraudulent. When in doubt, contact the official organisation directly and report concerns to your local authorities.</div>`;
}

/* ---------------------------------------------------------------- layout --- */
function hasRealAdsenseId() {
  return !!(config.adsense && config.adsense.publisherId &&
    /^ca-pub-\d{16}$/.test(config.adsense.publisherId) &&
    !config.adsense.publisherId.includes("0000000000000000"));
}
function adsenseHead() {
  // The loader snippet goes into <head> as soon as a REAL publisher ID is set.
  // This is what AdSense needs to verify/review the site. It does NOT display
  // ads by itself — ad units stay hidden until adsense.enabled = true (post-approval).
  if (!hasRealAdsenseId()) {
    return `<!-- AdSense head snippet appears here once a real ca-pub-… publisherId is set in site.config.json (needed for AdSense site verification). -->`;
  }
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.adsense.publisherId)}" crossorigin="anonymous"></script>`;
}

function analyticsScript() {
  if (!(config.analytics && config.analytics.firebaseEnabled)) return "";
  const fc = JSON.stringify(config.analytics.firebaseConfig);
  return `<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-analytics.js";
  try { getAnalytics(initializeApp(${fc})); } catch (e) {}
</script>`;
}

function layout({ title, description, canonical, bodyClass = "", main, jsonld = [], extraScripts = "", ogType = "website" }) {
  const url = config.url.replace(/\/$/, "") + canonical;
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n");
  return `<!DOCTYPE html>
<html lang="${esc(config.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#0F172A">
<meta name="robots" content="index, follow, max-image-preview:large">${config.googleSiteVerification ? `
<meta name="google-site-verification" content="${esc(config.googleSiteVerification)}">` : ""}
<meta property="og:type" content="${esc(ogType)}">
<meta property="og:site_name" content="${esc(config.siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="${esc(config.locale)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/css/styles.css" as="style">
<link rel="stylesheet" href="/assets/css/styles.css">
${ld}
${adsenseHead()}
</head>
<body class="${esc(bodyClass)}">
<a class="skip-link" href="#main">Skip to content</a>
${header()}
<main id="main">
${main}
</main>
${footer()}
<script src="/assets/js/main.js" defer></script>
${extraScripts}
${analyticsScript()}
</body>
</html>`;
}

/* ------------------------------------------------------------- JSON-LD ----- */
function breadcrumbLD(trail) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem", position: i + 1, name: t.name,
      item: config.url.replace(/\/$/, "") + t.url
    }))
  };
}
function faqLD(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question", name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer }
    }))
  };
}

/* ================================================================ PAGES === */

function homePage() {
  const popularGuideSlugs = [
    "canada-post-text-scam", "paypal-payment-pending-scam",
    "facebook-marketplace-buyer-email-scam", "fake-job-offer-scam",
    "instagram-verification-scam", "fake-bank-alert-text-scam"
  ];
  const popular = popularGuideSlugs.map((s) => scamBySlug[s]).filter(Boolean);

  const main = `
<section class="hero">
  <div class="container">
    <h1>Check if a message, link, email, or offer looks like a scam.</h1>
    <p class="sub">Paste suspicious text or browse common scam guides before you click, reply, or send money.</p>
    <form class="checker-box" id="hero-check-form" action="/scam-checker/" method="get">
      <div class="privacy-note">${icon("lock")}<span>Do not paste passwords, banking details, ID numbers, credit card numbers, or any private information. Your text is checked in your browser and is not stored.</span></div>
      <label for="hero-check-input" class="sr-only" style="font-weight:600">Paste a suspicious message</label>
      <textarea id="hero-check-input" name="q" placeholder="Paste the suspicious text message, email, or DM here…"></textarea>
      <div class="checker-actions">
        <button type="submit" class="btn btn-primary btn-lg">Check for Red Flags</button>
        <a href="/scam-types/" class="btn btn-secondary btn-lg">Browse Scam Guides</a>
      </div>
    </form>
  </div>
</section>

${trustStrip()}

${adSlot("home-top")}

<section class="section">
  <div class="container">
    <div class="section-head">
      <h2>Popular scam categories</h2>
      <p>Browse common scam types and learn the red flags that give them away.</p>
    </div>
    <div class="card-grid">
      ${categories.map(categoryCard).join("")}
    </div>
  </div>
</section>

<section class="section section-alt" id="popular-guides">
  <div class="container">
    <div class="section-head">
      <h2>Popular guides</h2>
      <p>Detailed walk-throughs of scams people ask about most.</p>
    </div>
    <div class="card-grid">
      ${popular.map(scamCard).join("")}
    </div>
    <p class="mt-2"><a class="btn btn-secondary" href="/scam-types/">See all scam guides</a></p>
  </div>
</section>

${adSlot("home-mid")}

<section class="section">
  <div class="container narrow">
    <div class="section-head"><h2>How it works</h2></div>
    <div class="card-grid">
      <div class="card"><div class="card-icon">${icon("message")}</div><h3>1. Paste the message</h3><p>Copy the suspicious text, email, or DM into the checker. Nothing is stored.</p></div>
      <div class="card"><div class="card-icon">${icon("flag")}</div><h3>2. Review the red flags</h3><p>See which common scam patterns appear and why they are a concern.</p></div>
      <div class="card"><div class="card-icon">${icon("check")}</div><h3>3. Learn what to do next</h3><p>Get clear, careful steps and related guides so you can act safely.</p></div>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container narrow">
    <div class="box box-info">
      <h3>${icon("lock")} Safety &amp; privacy</h3>
      <p style="margin:0">This website provides educational guidance only. Do not paste passwords, banking details, identity numbers, credit card numbers, or private information. We do not store the messages you check.</p>
    </div>
  </div>
</section>`;

  const jsonld = [
    {
      "@context": "https://schema.org", "@type": "WebSite",
      name: config.siteName, url: config.url,
      potentialAction: {
        "@type": "SearchAction",
        target: `${config.url}/scam-checker/?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org", "@type": "Organization",
      name: config.siteName, url: config.url,
      description: config.shortDescription
    }
  ];

  return layout({
    title: `${config.siteName} — Check if a Message or Offer Looks Like a Scam`,
    description: config.shortDescription,
    canonical: "/",
    main, jsonld,
    extraScripts: `<script src="/assets/js/checker.js" defer></script><script src="/assets/js/home.js" defer></script>`
  });
}

function scamCheckerPage() {
  const trail = [{ name: "Home", url: "/" }, { name: "Scam Checker", url: "/scam-checker/" }];
  const main = `
${breadcrumbs(trail)}
<section class="page-intro">
  <div class="container narrow">
    <h1>Scam Checker</h1>
    <p class="lead">Paste a suspicious message to see common scam red flags and what to do next. This tool offers educational guidance only — it cannot confirm whether something is or is not a scam.</p>
  </div>
</section>
<section class="prose">
  <div class="container narrow">
    <form class="checker-box" id="checker-form">
      <div class="privacy-note">${icon("lock")}<span><strong>Privacy warning:</strong> Do not paste passwords, banking details, ID numbers, credit card numbers, or private information. Your message is analysed in your browser and is not sent to a server or stored.</span></div>
      <label for="checker-input" style="font-weight:600;display:block;margin-bottom:6px">Paste the suspicious message</label>
      <textarea id="checker-input" placeholder="Paste the suspicious text message, email, or DM here…"></textarea>
      <div class="checker-actions">
        <button type="submit" class="btn btn-primary btn-lg">Check for Red Flags</button>
      </div>
    </form>
    <div id="checker-result" class="checker-result hidden" aria-live="polite"></div>

    <div class="box box-info mt-2">
      <h3>How this checker works</h3>
      <p style="margin:0">The checker looks for wording and patterns that often appear in scams — such as urgency, threats, requests for payment, gift cards, codes, or suspicious links. A higher risk level means more of these patterns were found. It is a starting point for caution, not a verdict. Always verify unexpected requests through official channels. <a href="/how-we-review-scams/">Read how we review scams</a>.</p>
    </div>
    ${disclaimerBox()}
  </div>
</section>`;
  return layout({
    title: `Scam Checker — Paste a Message to Spot Red Flags | ${config.siteName}`,
    description: "Paste a suspicious message into our free scam checker to see common red flags and what to do next. Educational guidance only — nothing is stored.",
    canonical: "/scam-checker/",
    main,
    jsonld: [breadcrumbLD(trail)],
    extraScripts: `<script src="/assets/js/checker.js" defer></script><script src="/assets/js/checker-page.js" defer></script>`
  });
}

function scamTypesIndexPage() {
  const trail = [{ name: "Home", url: "/" }, { name: "Scam Types", url: "/scam-types/" }];
  const total = scams.length;
  const main = `
${breadcrumbs(trail)}
<section class="page-intro">
  <div class="container">
    <h1>Scam Types &amp; Guides</h1>
    <p class="lead">Browse scams by category. Each guide explains what the scam looks like, the red flags to watch for, and exactly what to do. We currently have ${total} detailed guides, with more added regularly.</p>
  </div>
</section>
<section class="prose">
  <div class="container">
    ${categories.map((cat) => {
      const list = (scamsByCategory[cat.slug] || []);
      return `<div style="margin-bottom:36px">
        <div class="card-meta" style="margin-bottom:10px">
          <h2 style="margin:0"><a href="/${cat.slug}/">${esc(cat.name)}</a></h2>
        </div>
        <p class="muted" style="margin-top:0">${esc(cat.summary)}</p>
        ${list.length
          ? `<div class="card-grid">${list.map(scamCard).join("")}</div>`
          : `<p class="muted"><em>Guides for this category are coming soon.</em></p>`}
      </div>`;
    }).join("")}
  </div>
</section>`;
  return layout({
    title: `All Scam Types & Guides | ${config.siteName}`,
    description: "Browse scam guides by category: text message, email, marketplace, job, bank, delivery, social media, shopping, rental, crypto, and government scams.",
    canonical: "/scam-types/",
    main,
    jsonld: [breadcrumbLD(trail)]
  });
}

function categoryPage(cat) {
  const trail = [
    { name: "Home", url: "/" },
    { name: "Scam Types", url: "/scam-types/" },
    { name: cat.name, url: `/${cat.slug}/` }
  ];
  const list = scamsByCategory[cat.slug] || [];
  const related = (cat.related || []).map((slug) => categoryBySlug[slug]).filter(Boolean);

  const main = `
${breadcrumbs(trail)}
<section class="page-intro">
  <div class="container">
    <div class="card-meta"><div class="card-icon">${icon(cat.icon)}</div></div>
    <h1>${esc(cat.name)}</h1>
    <p class="lead">${esc(cat.intro)}</p>
  </div>
</section>
<section class="prose">
  <div class="container with-sidebar">
    <div>
      <h2>Common red flags</h2>
      ${flagList(cat.redFlags)}

      ${adSlot(`cat-${cat.slug}-mid`)}

      <h2>${esc(cat.shortName)} scam guides</h2>
      ${list.length
        ? `<div class="card-grid">${list.map(scamCard).join("")}</div>`
        : `<p class="muted"><em>Detailed guides for this category are coming soon. In the meantime, use the <a href="/scam-checker/">scam checker</a> to review a suspicious message.</em></p>`}

      <h2>Frequently asked questions</h2>
      ${faqAccordion(cat.faqs)}

      ${related.length ? `<h2>Related scam categories</h2>
      <div class="card-grid">${related.map(categoryCard).join("")}</div>` : ""}

      ${disclaimerBox()}
    </div>
    <aside class="sidebar">
      <div class="box box-info">
        <h3>Check a message</h3>
        <p>Not sure about a message you received? Paste it into the checker to spot red flags.</p>
        <a class="btn btn-primary btn-block" href="/scam-checker/">Open Scam Checker</a>
      </div>
      <div class="box">
        <h3>All scam types</h3>
        <ul style="padding-left:1.1rem;margin:0">
          ${categories.map((c) => `<li><a href="/${c.slug}/">${esc(c.shortName)}</a></li>`).join("")}
        </ul>
      </div>
      ${adSlot(`cat-${cat.slug}-side`)}
    </aside>
  </div>
</section>`;

  return layout({
    title: cat.metaTitle + ` | ${config.siteName}`,
    description: cat.metaDescription,
    canonical: `/${cat.slug}/`,
    main,
    jsonld: [breadcrumbLD(trail), faqLD(cat.faqs)]
  });
}

function guidePage(scam) {
  const cat = categoryBySlug[scam.category];
  const trail = [
    { name: "Home", url: "/" },
    { name: "Scam Types", url: "/scam-types/" },
    { name: cat ? cat.name : "Scams", url: cat ? `/${cat.slug}/` : "/scam-types/" },
    { name: scam.title, url: `/scams/${scam.slug}/` }
  ];

  const related = (scam.relatedScams || []).map((s) => scamBySlug[s]).filter(Boolean);

  const sections = [
    ["what-it-looks-like", "What this scam usually looks like"],
    ["example", "Example message pattern"],
    ["red-flags", "Red flags to watch for"],
    ["what-to-do", "What to do"],
    ["if-you-clicked", "If you already clicked or replied"],
    ["what-not-to-do", "What not to do"],
    ["similar", "Similar scams"],
    ["faq", "Frequently asked questions"]
  ];

  const toc = `<div class="box"><h3>On this page</h3><nav class="toc">${
    sections.map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`).join("")
  }</nav></div>`;

  const main = `
${breadcrumbs(trail)}
<article class="guide">
  <div class="container with-sidebar">
    <div class="guide-content">
      <header class="guide-header">
        <div class="meta">${riskBadge(scam.riskLevel)}<span class="card-cat">${esc(cat ? cat.name : "")}</span></div>
        <h1>${esc(scam.title)}</h1>
        <p class="lead muted">${esc(scam.summary)}</p>
      </header>

      <div class="verdict-box">
        <h2 style="margin-top:0">Quick verdict</h2>
        <div class="verdict-grid">
          <div class="verdict-item"><div class="label">Risk level</div><div class="value">${riskBadge(scam.riskLevel)}</div></div>
          <div class="verdict-item"><div class="label">Scam type</div><div class="value">${esc(scam.scamType)}</div></div>
          <div class="verdict-item"><div class="label">Main red flag</div><div class="value">${esc(scam.quickVerdict.mainRedFlag)}</div></div>
          <div class="verdict-item"><div class="label">What to do first</div><div class="value">${esc(scam.quickVerdict.whatToDoFirst)}</div></div>
        </div>
      </div>

      ${adSlot(`guide-${scam.slug}-top`)}

      <h2 id="what-it-looks-like">What this scam usually looks like</h2>
      <p>${esc(scam.summary)}</p>

      <h2 id="example">Example message pattern</h2>
      <div class="example-msg"><span class="example-tag">Example pattern — not a real report</span><div>${esc(scam.exampleMessage)}</div></div>
      <p class="muted" style="font-size:.9rem">This is a fictional, anonymised example used to illustrate the pattern. It is not a verified real message, and any names are used only to show how the scam typically reads.</p>

      <h2 id="red-flags">Red flags to watch for</h2>
      ${flagList(scam.redFlags)}

      ${adSlot(`guide-${scam.slug}-mid`)}

      <h2 id="what-to-do">What to do</h2>
      <div class="box box-do"><ul>${scam.whatToDo.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>

      <h2 id="if-you-clicked">If you already clicked or replied</h2>
      <div class="box box-clicked"><ul>${scam.ifYouClicked.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>

      <h2 id="what-not-to-do">What not to do</h2>
      <div class="box box-warning"><ul>${scam.whatNotToDo.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>

      ${related.length ? `<h2 id="similar">Similar scams</h2>
      <div class="card-grid">${related.map(scamCard).join("")}</div>` : ""}

      <h2 id="faq">Frequently asked questions</h2>
      ${faqAccordion(scam.faqs)}

      ${adSlot(`guide-${scam.slug}-faq`)}

      <p class="last-reviewed">${icon("calendar")} Last reviewed: ${esc(reviewedLabel(scam.lastReviewed))}</p>
      ${disclaimerBox()}
    </div>

    <aside class="sidebar">
      ${toc}
      <div class="box box-info">
        <h3>Check a message</h3>
        <p>Received something similar? Paste it into the checker to spot red flags.</p>
        <a class="btn btn-primary btn-block" href="/scam-checker/">Open Scam Checker</a>
      </div>
      ${cat ? `<div class="box"><h3>More ${esc(cat.shortName.toLowerCase())} scams</h3>
        <ul style="padding-left:1.1rem;margin:0">${(scamsByCategory[cat.slug] || []).filter((s) => s.slug !== scam.slug).slice(0, 6).map((s) => `<li><a href="/scams/${s.slug}/">${esc(s.title)}</a></li>`).join("")}</ul>
        <p style="margin:.6rem 0 0"><a href="/${cat.slug}/">All ${esc(cat.shortName.toLowerCase())} scams →</a></p></div>` : ""}
      ${adSlot(`guide-${scam.slug}-side`)}
    </aside>
  </div>
</article>`;

  const articleLD = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: scam.metaTitle || scam.title,
    description: scam.metaDescription,
    about: scam.scamType,
    inLanguage: config.lang,
    isAccessibleForFree: true,
    publisher: { "@type": "Organization", name: config.siteName, url: config.url },
    mainEntityOfPage: config.url.replace(/\/$/, "") + `/scams/${scam.slug}/`
  };

  return layout({
    title: (scam.metaTitle || scam.title) + ` | ${config.siteName}`,
    description: scam.metaDescription,
    canonical: `/scams/${scam.slug}/`,
    ogType: "article",
    main,
    jsonld: [breadcrumbLD(trail), faqLD(scam.faqs), articleLD]
  });
}

/* ------------------------------------------------------------- legal pages --- */
function simplePage({ slug, name, title, description, body }) {
  const trail = [{ name: "Home", url: "/" }, { name, url: `/${slug}/` }];
  const main = `
${breadcrumbs(trail)}
<section class="page-intro"><div class="container narrow"><h1>${esc(name)}</h1></div></section>
<section class="prose"><div class="container narrow">${body}</div></section>`;
  return layout({
    title: `${title} | ${config.siteName}`,
    description, canonical: `/${slug}/`, main,
    jsonld: [breadcrumbLD(trail)]
  });
}

const DISCLAIMER_TEXT = `This website provides educational information to help people recognise scam patterns and red flags. It is not legal, financial, cybersecurity, or law enforcement advice.`;

function legalPages() {
  const pages = [];

  pages.push(simplePage({
    slug: "about", name: "About Scam or Safe",
    title: "About Us", description: "Learn about Scam or Safe, a public safety resource that helps people recognise scam patterns and red flags.",
    body: `
<p class="lead muted">${esc(config.siteName)} is a public safety resource that helps everyday people recognise the patterns and red flags common to online and message-based scams.</p>
<h2>Why we built this</h2>
<p>Scams are getting more convincing, and they reach us through texts, emails, marketplaces, job offers, and social media. Most people do not need a security expert — they need a calm, clear explanation of what a suspicious message looks like and what to do next. That is what we try to provide.</p>
<h2>What we do</h2>
<ul>
  <li>Maintain plain-language guides to common scams, including red flags and safe next steps.</li>
  <li>Offer a free <a href="/scam-checker/">scam checker</a> that highlights patterns commonly seen in scams.</li>
  <li>Point you toward official reporting resources so you can take action.</li>
</ul>
<h2>What we do not do</h2>
<p>We do not verify individual messages, companies, or people. We never claim that something is "definitely a scam" or "guaranteed safe," and we are not affiliated with any government agency, bank, or police force. Our guidance is educational and should be combined with checks through official channels.</p>
<h2>How we keep content accurate</h2>
<p>Each guide is written for clarity and reviewed and dated. Read more about our process on the <a href="/how-we-review-scams/">how we review scams</a> page.</p>
<div class="disclaimer-box"><strong>Disclaimer:</strong> ${esc(DISCLAIMER_TEXT)}</div>`
  }));

  pages.push(simplePage({
    slug: "contact", name: "Contact",
    title: "Contact Us", description: "Get in touch with Scam or Safe to suggest a scam guide, report a correction, or ask a question.",
    body: `
<p class="lead muted">We welcome suggestions for new scam guides, corrections to existing pages, and general questions.</p>
<h2>Email us</h2>
<p>You can reach us at <a href="mailto:${esc(config.contactEmail)}">${esc(config.contactEmail)}</a>. We read every message, though we may not be able to reply to all of them individually.</p>
<h2>Please note</h2>
<ul>
  <li>We cannot provide legal, financial, or cybersecurity advice, or confirm whether a specific message is genuine.</li>
  <li>Do not send us passwords, banking details, ID numbers, or full card numbers.</li>
  <li>If you have lost money or your accounts are at risk, contact your bank and report to your local authorities right away. See our <a href="/report-a-scam/">report a scam</a> page.</li>
</ul>
<div class="disclaimer-box"><strong>Disclaimer:</strong> ${esc(DISCLAIMER_TEXT)}</div>`
  }));

  pages.push(simplePage({
    slug: "privacy-policy", name: "Privacy Policy",
    title: "Privacy Policy", description: "How Scam or Safe handles your privacy. We do not store the messages you check, and we follow a privacy-first approach.",
    body: `
<p class="muted">Last updated: ${reviewedLabel("2026-06")}</p>
<p>Your privacy matters to us. This policy explains what information is and is not collected when you use ${esc(config.siteName)}.</p>
<h2>Messages you check</h2>
<p>The scam checker runs entirely in your web browser. The text you paste is analysed on your own device and is <strong>not sent to our servers and not stored by us</strong>. If you move from the homepage to the checker page, your text may be held briefly in your browser's temporary session storage to carry it across, and it is cleared immediately after.</p>
<h2>Information we do not ask for</h2>
<ul>
  <li>We do not ask for your passwords.</li>
  <li>We do not ask for your banking information.</li>
  <li>We do not ask for your SIN, SSN, or other identity numbers.</li>
  <li>We do not ask for full credit card numbers.</li>
</ul>
<p>Please never enter this kind of information into the checker or send it to us.</p>
<h2>Analytics</h2>
<p>We may use privacy-respecting analytics to understand which pages are useful, in aggregate. This helps us improve our guides. Analytics data does not include the content of messages you check.</p>
<h2>Advertising</h2>
<p>We may display advertising to support the site. If we use Google AdSense, third-party vendors including Google may use cookies to serve ads based on your prior visits, in line with their policies. Advertising is never placed inside the scam checker result area, and we do not allow ads that imitate warnings, buttons, or navigation. You can review Google's advertising practices in your account settings and ad preferences.</p>
<h2>Cookies</h2>
<p>Essential functionality does not require advertising cookies. Where advertising or analytics cookies are used, they follow the relevant providers' policies.</p>
<h2>Changes</h2>
<p>We may update this policy from time to time. Material changes will be reflected by the "last updated" date above.</p>
<h2>Contact</h2>
<p>Questions about privacy? Email <a href="mailto:${esc(config.contactEmail)}">${esc(config.contactEmail)}</a>.</p>`
  }));

  pages.push(simplePage({
    slug: "terms", name: "Terms of Use",
    title: "Terms of Use", description: "The terms that govern your use of the Scam or Safe website and its educational content.",
    body: `
<p class="muted">Last updated: ${reviewedLabel("2026-06")}</p>
<p>By using ${esc(config.siteName)}, you agree to these terms. Please read them carefully.</p>
<h2>Educational use only</h2>
<p>All content on this site is provided for general educational purposes. It is not legal, financial, cybersecurity, or law enforcement advice, and it must not be relied upon as a definitive judgement about any specific message, person, company, or transaction.</p>
<h2>No guarantees</h2>
<p>We work to keep our guides accurate and current, but we make no warranties about completeness or accuracy. Scams change constantly. The scam checker identifies common patterns only and can produce both false alarms and missed signals. A "Low risk" result is never a guarantee that something is safe.</p>
<h2>Your responsibilities</h2>
<ul>
  <li>Verify important matters through official channels before acting.</li>
  <li>Do not paste passwords, banking details, ID numbers, or full card numbers into the site.</li>
  <li>Use the site lawfully and do not attempt to disrupt or misuse it.</li>
</ul>
<h2>Limitation of liability</h2>
<p>To the maximum extent permitted by law, ${esc(config.siteName)} and its contributors are not liable for any loss or damage arising from your use of, or reliance on, the information provided here.</p>
<h2>Third-party links</h2>
<p>We may link to external resources for your convenience. We are not responsible for the content or practices of third-party websites.</p>
<h2>Changes</h2>
<p>We may revise these terms at any time. Continued use of the site means you accept the current version.</p>`
  }));

  pages.push(simplePage({
    slug: "disclaimer", name: "Disclaimer",
    title: "Disclaimer", description: "Scam or Safe provides educational information only and does not verify individual messages, companies, or people.",
    body: `
<div class="box box-info"><p style="margin:0">${esc(DISCLAIMER_TEXT)}</p></div>
<h2>We do not verify specific cases</h2>
<p>We do not and cannot confirm whether any particular message, link, email, phone number, company, listing, or person is genuine or fraudulent. Our guides describe <em>patterns</em> commonly seen in scams so that you can make a more informed decision.</p>
<h2>No definitive judgements</h2>
<p>We deliberately avoid claims like "100% scam," "guaranteed safe," "officially verified," "government approved," or "police verified." Instead we use careful language such as "this has common scam red flags" or "this looks suspicious."</p>
<h2>Not professional advice</h2>
<p>Nothing on this site is legal, financial, cybersecurity, or law enforcement advice. For specific concerns, consult an appropriate professional or your local authorities.</p>
<h2>Examples are illustrative</h2>
<p>Example messages on this site are fictional and anonymised. They are written to illustrate typical patterns and are not verified reports of real messages.</p>
<h2>Act through official channels</h2>
<p>If you are worried about an account or a payment, contact the company directly using details you find independently, and report scams to your local authorities. See our <a href="/report-a-scam/">report a scam</a> page.</p>`
  }));

  pages.push(simplePage({
    slug: "report-a-scam", name: "Report a Scam",
    title: "Report a Scam — Official Resources", description: "Where to report scams and get help. Official reporting resources for fraud, phishing, and online scams.",
    body: `
<p class="lead muted">If you have encountered a scam, reporting it helps protect others and may help you recover. Use official channels for your country.</p>
<div class="box box-warning"><h3>If you may have lost money or shared details</h3><ul>
  <li>Contact your bank or card provider immediately to stop or dispute payments.</li>
  <li>Change passwords for any affected accounts and turn on two-factor authentication.</li>
  <li>Report to your national fraud or consumer protection authority (see below).</li>
</ul></div>
<h2>Where to report</h2>
<ul>
  <li><strong>United States:</strong> Report fraud to the Federal Trade Commission at reportfraud.ftc.gov, and phishing emails to reportphishing@apwg.org.</li>
  <li><strong>Canada:</strong> Report to the Canadian Anti-Fraud Centre at antifraudcentre-centreantifraude.ca.</li>
  <li><strong>United Kingdom:</strong> Report to Action Fraud at actionfraud.police.uk, and suspicious texts by forwarding to 7726.</li>
  <li><strong>Australia:</strong> Report to Scamwatch at scamwatch.gov.au.</li>
  <li><strong>European Union:</strong> Contact your national consumer protection or police cybercrime unit.</li>
</ul>
<p class="muted">Always look up these organisations directly through a search engine or official government portal rather than following links from a suspicious message.</p>
<h2>Report to the platform or company</h2>
<p>Most banks, email providers, marketplaces, and social platforms have their own fraud or phishing reporting tools. Reporting through the official app or website helps them take down scam accounts and pages.</p>
<h2>Forward suspicious texts</h2>
<p>In many countries you can forward scam SMS messages to a short spam-reporting number provided by your mobile carrier. Check your carrier's official guidance.</p>
<div class="disclaimer-box"><strong>Disclaimer:</strong> ${esc(DISCLAIMER_TEXT)} Reporting destinations may change; verify current contact details through official government websites.</div>`
  }));

  pages.push(simplePage({
    slug: "how-we-review-scams", name: "How We Review Scams",
    title: "How We Review & Write Our Scam Guides", description: "Our editorial process for researching, writing, and reviewing scam guides at Scam or Safe.",
    body: `
<p class="lead muted">We aim to be a calm, accurate, and genuinely useful public-safety resource. Here is how our guides are made.</p>
<h2>Research</h2>
<p>Each guide is based on widely documented scam patterns reported by consumers, banks, couriers, platforms, and fraud-prevention agencies. We focus on how a scam typically works and the signals that give it away.</p>
<h2>Careful, non-sensational language</h2>
<p>We describe red flags and likelihoods, not certainties. We avoid exaggerated claims and never tell you something is "definitely a scam" or "guaranteed safe." Our goal is to help you pause and verify, not to frighten you.</p>
<h2>Anonymised examples</h2>
<p>Example messages are fictional and clearly labelled as illustrative patterns. We do not publish real personal data or claim that an example is a verified report.</p>
<h2>Safe, responsible guidance</h2>
<p>Our "what to do" steps emphasise contacting official organisations directly, protecting your accounts, and reporting through proper channels. We do not provide instructions that could cause harm.</p>
<h2>Review and dating</h2>
<p>Each guide shows a "last reviewed" date. We revisit guides as scams evolve and update them when patterns change.</p>
<h2>Corrections</h2>
<p>If you spot something inaccurate or out of date, please <a href="/contact/">contact us</a>. We value corrections and act on them.</p>
<div class="disclaimer-box"><strong>Disclaimer:</strong> ${esc(DISCLAIMER_TEXT)}</div>`
  }));

  return pages; // already full HTML strings, in legalSlugs order
}

function notFoundPage() {
  const main = `
<section class="page-intro"><div class="container narrow center">
  <h1>Page not found</h1>
  <p class="lead muted">Sorry, we couldn't find that page. It may have moved, or the link may be incorrect.</p>
  <p><a class="btn btn-primary" href="/">Go to homepage</a> <a class="btn btn-secondary" href="/scam-types/">Browse scam guides</a></p>
</div></section>`;
  return layout({
    title: `Page Not Found | ${config.siteName}`,
    description: "The page you were looking for could not be found.",
    canonical: "/404.html", main
  });
}

/* ------------------------------------------------------------- non-HTML ----- */
function sitemapXML() {
  const base = config.url.replace(/\/$/, "");
  const urls = [
    "/", "/scam-checker/", "/scam-types/",
    ...categories.map((c) => `/${c.slug}/`),
    ...scams.map((s) => `/scams/${s.slug}/`),
    "/about/", "/contact/", "/privacy-policy/", "/terms/", "/disclaimer/",
    "/report-a-scam/", "/how-we-review-scams/"
  ];
  const today = new Date().toISOString().slice(0, 10);
  const body = urls.map((u) => {
    const priority = u === "/" ? "1.0" : u.startsWith("/scams/") ? "0.8" : "0.7";
    return `  <url><loc>${base}${u}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${priority}</priority></url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

function robotsTxt() {
  const base = config.url.replace(/\/$/, "");
  return `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
}

function adsTxt() {
  // ads.txt — authorised digital sellers. Publisher ID comes from site.config.json.
  const pub = (config.adsense && config.adsense.publisherId) || "ca-pub-0000000000000000";
  const id = pub.replace(/^ca-/, "");
  return `google.com, ${id}, DIRECT, f08c47fec0942fa0
`;
}

function faviconSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="5" fill="#2563EB"/><path d="M12 21s7-3.5 7-8.7V5.5L12 3 5 5.5v6.8C5 17.5 12 21 12 21z" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 12.2l2 2 4-4.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* ----------------------------------------------------------------- write --- */
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function writePage(routePath, html) {
  // routePath like "/scams/foo/" -> dist/scams/foo/index.html ; "/" -> dist/index.html
  let out;
  if (routePath.endsWith(".html")) {
    out = path.join(DIST, routePath.replace(/^\//, ""));
  } else {
    out = path.join(DIST, routePath.replace(/^\//, ""), "index.html");
  }
  ensureDir(path.dirname(out));
  fs.writeFileSync(out, html);
}
function writeFileRaw(rel, content) {
  const out = path.join(DIST, rel);
  ensureDir(path.dirname(out));
  fs.writeFileSync(out, content);
}
function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function build() {
  // clean
  fs.rmSync(DIST, { recursive: true, force: true });
  ensureDir(DIST);

  // pages
  writePage("/", homePage());
  writePage("/scam-checker/", scamCheckerPage());
  writePage("/scam-types/", scamTypesIndexPage());
  for (const cat of categories) writePage(`/${cat.slug}/`, categoryPage(cat));
  for (const scam of scams) writePage(`/scams/${scam.slug}/`, guidePage(scam));

  // legal/trust pages
  const legalSlugs = ["about", "contact", "privacy-policy", "terms", "disclaimer", "report-a-scam", "how-we-review-scams"];
  const legalHtml = legalPages();
  legalSlugs.forEach((slug, i) => writePage(`/${slug}/`, legalHtml[i]));

  writePage("/404.html", notFoundPage());

  // assets
  copyDir(path.join(SRC, "assets"), path.join(DIST, "assets"));

  // root files
  writeFileRaw("sitemap.xml", sitemapXML());
  writeFileRaw("robots.txt", robotsTxt());
  writeFileRaw("ads.txt", adsTxt());
  writeFileRaw("favicon.svg", faviconSVG());

  const pageCount = 3 + categories.length + scams.length + legalSlugs.length + 1;
  console.log(`✓ Built ${pageCount} pages into /dist`);
  console.log(`  • ${scams.length} scam guides across ${categories.length} categories`);
  console.log(`  • AdSense: ${config.adsense.enabled ? "ENABLED" : "disabled (placeholders reserved)"}`);
}

build();
