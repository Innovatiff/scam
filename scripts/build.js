/* Scam or Safe — static site generator.
   Reads JSON data + the templates in this file and emits a fully static
   HTML/CSS/JS site into /dist. Add a scam page by adding an entry to
   data/scams.json — no manual HTML required. */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const SRC = path.join(ROOT, "src");

/* ------------------------------------------------------------------ data --- */
const config = readJSON("site.config.json");
const categories = readJSON("data/categories.json");
const scams = readJSON("data/scams.json");
const deepDives = readJSONSafe("data/deepdives.json", {});
const reporting = readJSONSafe("data/reporting.json", null);
const statsData = readJSONSafe("data/stats.json", null);
const updates = readJSONSafe("data/updates.json", []);
const quizData = readJSONSafe("data/quiz.json", []);

const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
const scamBySlug = Object.fromEntries(scams.map((s) => [s.slug, s]));
const scamsByCategory = {};
for (const s of scams) (scamsByCategory[s.category] ||= []).push(s);

function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}
function readJSONSafe(rel, fallback) {
  try { return readJSON(rel); } catch (e) { return fallback; }
}

/* Asset cache-busting: /assets/* is served with a 1-year immutable cache, so
   every reference carries a content hash — when CSS/JS change, the URL changes
   and browsers fetch the new file instead of a year-old cached one. */
const ASSET_VER = (() => {
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p); else files.push(p);
    }
  })(path.join(SRC, "assets"));
  const h = crypto.createHash("md5");
  for (const f of files.sort()) h.update(fs.readFileSync(f));
  return h.digest("hex").slice(0, 10);
})();
function asset(p) { return `${p}?v=${ASSET_VER}`; }

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
  ["Quiz", "/quiz/"],
  ["Scam Types", "/scam-types/"],
  ["Scam of the Week", "/scam-of-the-week/"],
  ["Report Resources", "/report-a-scam/"]
];

const FOOTER_LINKS = {
  Resources: [
    ["Scam Checker", "/scam-checker/"],
    ["Spot-the-Scam Quiz", "/quiz/"],
    ["Scam of the Week", "/scam-of-the-week/"],
    ["All Scam Types", "/scam-types/"],
    ["Report a Scam", "/report-a-scam/"],
    ["Updates feed (RSS)", "/feed.xml"]
  ],
  Company: [
    ["About", "/about/"],
    ["How We Review Scams", "/how-we-review-scams/"],
    ["Contact", "/contact/"]
  ],
  Legal: [
    ["Privacy Policy", "/privacy-policy/"],
    ["Terms", "/terms/"],
    ["Disclaimer", "/disclaimer/"]
  ]
};

/* ------------------------------------------------ category accents (brand) --- */
const ACCENTS = ["#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#D97706", "#059669",
  "#0D9488", "#0284C7", "#4F46E5", "#DC2626", "#65A30D", "#9333EA"];
const accentByCat = {};
categories.forEach((c, i) => {
  const hex = ACCENTS[i % ACCENTS.length];
  accentByCat[c.slug] = `--cat-accent:${hex};--cat-accent-soft:${hex}1F`;
});
function catStyle(slug) {
  return accentByCat[slug] ? ` style="${accentByCat[slug]}"` : "";
}

/* --------------------------------------------------- scam of the week pick --- */
const SOTW_ROTATION = [
  "fake-bank-alert-text-scam", "crypto-investment-scam", "fake-delivery-text-scam",
  "romance-scam-dm", "fake-job-offer-scam", "amazon-call-scam", "remote-access-scam",
  "paypal-payment-pending-scam", "instagram-verification-scam",
  "facebook-marketplace-buyer-email-scam", "deepfake-celebrity-scam", "voice-cloning-scam"
];
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y) / 86400000 + 1) / 7);
}
function sotwPick() {
  const list = SOTW_ROTATION.map((s) => scamBySlug[s]).filter(Boolean);
  return { list, idx: list.length ? isoWeek(new Date()) % list.length : 0 };
}

/* ------------------------------------------------------------- components --- */
function header() {
  const links = NAV.map(([t, h]) => `<a href="${h}">${esc(t)}</a>`).join("");
  const themeToggle = `<button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode" title="Toggle dark mode">
      <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
    </button>`;
  return `<header class="site-header">
  <div class="container header-inner">
    <a class="logo" href="/" aria-label="${esc(config.siteName)} home">
      <span class="logo-mark">${icon("shield")}</span>
      <span>Scam or <b>Safe</b></span>
    </a>
    <nav class="main-nav" id="main-nav" aria-label="Main navigation">
      ${links}
      <a class="btn btn-primary header-cta" href="/scam-checker/">Check a Message</a>
    </nav>
    <div class="header-actions">
      ${themeToggle}
      <button class="nav-toggle" aria-label="Open menu" aria-controls="main-nav" aria-expanded="false">${icon("menu")}</button>
    </div>
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
    <div class="card-icon"${catStyle(cat.slug)}>${icon(cat.icon)}</div>
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

function layout({ title, description, canonical, bodyClass = "", main, jsonld = [], extraScripts = "", ogType = "website", robots = "index, follow, max-image-preview:large" }) {
  const url = config.url.replace(/\/$/, "") + canonical;
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n");
  return `<!DOCTYPE html>
<html lang="${esc(config.lang)}">
<head>
<meta charset="utf-8">
<script>(function(){try{var t=localStorage.getItem("sos-theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})();</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#F8FAFC">
<meta name="robots" content="${esc(robots)}">${config.googleSiteVerification ? `
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
<link rel="alternate" type="application/rss+xml" title="${esc(config.siteName)} — Updates" href="/feed.xml">
<link rel="preload" href="${asset("/assets/css/styles.css")}" as="style">
<link rel="stylesheet" href="${asset("/assets/css/styles.css")}">
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
<script src="${asset("/assets/js/main.js")}" defer></script>
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

  const { list: sotwList, idx: sotwIdx } = sotwPick();
  const sotw = sotwList[sotwIdx];
  const newest = scams.slice(-6).reverse();
  const statCitations = 2 * scams.length;

  const main = `
<section class="hero">
  <div class="container">
    <h1>Check if a message, link, email, or offer looks like a scam.</h1>
    <p class="sub">Paste suspicious text or browse ${scams.length}+ plain-language scam guides before you click, reply, or send money.</p>
    <form class="checker-box" id="hero-check-form" action="/scam-checker/" method="get">
      <div class="privacy-note">${icon("lock")}<span>Do not paste passwords, banking details, ID numbers, credit card numbers, or any private information. Your text is checked in your browser and is not stored.</span></div>
      <label for="hero-check-input" class="sr-only" style="font-weight:600">Paste a suspicious message</label>
      <textarea id="hero-check-input" name="q" placeholder="Paste the suspicious text message, email, or DM here…"></textarea>
      <div class="checker-actions">
        <button type="submit" class="btn btn-primary btn-lg">Check for Red Flags</button>
        <a href="/quiz/" class="btn btn-secondary btn-lg">Try the Scam Quiz</a>
      </div>
    </form>
    <div class="source-strip">${icon("check")}<span>Guidance built on published data from the FTC, FBI IC3, UK Finance and other fraud-prevention authorities — <a href="/how-we-review-scams/">how we review scams</a>.</span></div>
  </div>
</section>

<div class="stats-bar"><div class="container"><div class="stats-grid">
  <div class="stat-tile"><div class="num">${scams.length}+</div><div class="lbl">scam guides</div></div>
  <div class="stat-tile"><div class="num">${categories.length}</div><div class="lbl">scam categories</div></div>
  <div class="stat-tile"><div class="num">${statCitations.toLocaleString("en-US")}+</div><div class="lbl">cited statistics</div></div>
  <div class="stat-tile"><div class="num">100%</div><div class="lbl">free — no sign-up</div></div>
</div></div></div>

${adSlot("home-top")}

<section class="section">
  <div class="container">
    <div class="section-head">
      <h2>Fresh this week</h2>
      <p>What's new on Scam or Safe, and the scam we think deserves your attention right now.</p>
    </div>
    <div class="fresh-grid">
      <div>
        <ul class="updates-list">
          ${updates.slice(0, 5).map((u) => `<li><span class="update-date">${esc(u.date)}</span><span class="update-body"><strong><a href="${esc(u.url)}">${esc(u.title)}</a></strong><span>${esc(u.summary)}</span></span></li>`).join("")}
        </ul>
        <p style="margin-top:10px"><a href="/feed.xml">Subscribe to updates (RSS)</a></p>
      </div>
      <div>
        ${sotw ? `<div class="sotw-card">
          <div class="sotw-kicker">${icon("flag")} Scam of the week</div>
          <h3><a href="/scams/${sotw.slug}/">${esc(sotw.title)}</a></h3>
          <div class="card-meta">${riskBadge(sotw.riskLevel)}</div>
          <p>${esc(sotw.summary)}</p>
          <a class="btn btn-secondary" href="/scam-of-the-week/">Why we picked it →</a>
        </div>` : ""}
        <div class="tag-row" style="margin-top:16px">
          ${newest.map((s) => `<a class="tag" href="/scams/${s.slug}/">${esc(s.title)}</a>`).join("")}
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section-alt">
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

<section class="section" id="popular-guides">
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

<section class="section section-alt">
  <div class="container narrow">
    <div class="sotw-card" style="border-left-color:var(--blue)">
      <div class="sotw-kicker" style="color:var(--blue)">${icon("eye")} Test yourself</div>
      <h3>Can you spot the scam?</h3>
      <p>Ten realistic messages — some fraudulent, some genuine. Most people miss at least two. Learn the tell that gives each one away.</p>
      <a class="btn btn-primary" href="/quiz/">Take the 2-minute quiz</a>
    </div>
  </div>
</section>

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
    extraScripts: `<script src="${asset("/assets/js/checker.js")}" defer></script><script src="${asset("/assets/js/home.js")}" defer></script>`
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

    <div class="bookmark-tip">${icon("flag")}<span><strong>Make this your habit:</strong> bookmark this page (<kbd>Ctrl</kbd>+<kbd>D</kbd> / <kbd>⌘</kbd><kbd>D</kbd>) so the checker is one tap away whenever a suspicious message arrives.</span></div>

    <div id="recent-checks" class="box recent-checks hidden">
      <h3>Your recent checks</h3>
      <p class="muted" style="font-size:.85rem;margin-bottom:8px">Saved only in this browser — never sent to us. <a href="#" id="clear-checks">Clear history</a></p>
      <ul id="recent-checks-list" style="padding-left:1.1rem;margin:0"></ul>
    </div>

    <h2>How the scam checker works</h2>
    <p>The checker runs entirely in your web browser. When you paste a message, it scans the text for wording and patterns that appear frequently in scams, then shows you which ones it found, why each is a concern, and a suggested risk level. Nothing you paste is sent to a server, logged, or stored — the analysis happens on your own device and disappears the moment you leave the page. That is why you can use it without an account and without giving up any personal data.</p>
    <p>It is important to understand what the result means. A <strong>High</strong> or <strong>Medium</strong> level tells you that the message contains language commonly used to pressure or deceive people — it is a reason to slow down and verify, not a definitive judgement that the message is fraudulent. A <strong>Low</strong> level means few of those patterns were detected, but that is never a guarantee of safety: a well-written scam can avoid obvious triggers, and a legitimate message can occasionally use urgent language.</p>

    <h2>What the checker looks for</h2>
    <p>The tool weighs a range of signals that fraud-prevention agencies repeatedly associate with scams. The most important include:</p>
    <ul>
      <li><strong>Urgency and pressure</strong> — words like "immediately", "act now", or countdowns designed to stop you thinking.</li>
      <li><strong>Threats and consequences</strong> — claims of arrest, fines, account closure, or legal action to create fear.</li>
      <li><strong>Account or security alerts</strong> — "your account is locked", "unusual activity", or requests to "verify your identity" via a link.</li>
      <li><strong>Requests for payment or unusual methods</strong> — fees, fines, gift cards, cryptocurrency, or bank transfers.</li>
      <li><strong>Requests for passwords or one-time codes</strong> — details that no legitimate organisation should ever ask you to share.</li>
      <li><strong>Suspicious or shortened links</strong> — addresses that hide their true destination.</li>
      <li><strong>Prizes, refunds, and money promises</strong> — "you've won", guaranteed returns, or unexpected refunds.</li>
      <li><strong>Moving off-platform or keeping secrets</strong> — pushing you to another app, or asking you to tell no one.</li>
    </ul>

    <h2>How to read your result</h2>
    <p>Treat the checker as a second opinion, not the final word. Whatever level it returns, the safest response to any unexpected message is the same: do not click links or open attachments, do not share codes, passwords, or card details, and contact the company or person directly using official details you find yourself — never the contact information in the message. If a message claims to be from your bank, call the number printed on the back of your card.</p>

    <h2>Limitations you should know</h2>
    <p>This is an automated, pattern-based tool. It can produce <strong>false alarms</strong> (flagging a genuine message that happens to sound urgent) and <strong>missed signals</strong> (a sophisticated scam that reads calmly). It cannot open links, inspect websites, verify senders, or confirm identities, and it does not know your personal circumstances. For anything involving money, accounts, or identity, always verify through official channels and, when in doubt, treat the message as suspicious.</p>

    <h2>Recently added guides</h2>
    <p class="muted">Scams evolve constantly — these are the newest additions to our library of ${scams.length}+ guides.</p>
    <div class="card-grid">
      ${scams.slice(-6).reverse().map(scamCard).join("")}
    </div>

    <h2>Frequently asked questions</h2>
    ${faqAccordion(checkerFaqs)}

    <div class="box box-info mt-2">
      <h3>${icon("lock")} Your privacy</h3>
      <p style="margin:0">Your message is analysed in your browser and is never sent to us or stored. Please still avoid pasting passwords, banking details, ID numbers, or full card numbers. Learn more in our <a href="/privacy-policy/">privacy policy</a> and read <a href="/how-we-review-scams/">how we review scams</a>.</p>
    </div>
    ${disclaimerBox()}
  </div>
</section>`;
  return layout({
    title: `Scam Checker — Paste a Message to Spot Red Flags | ${config.siteName}`,
    description: "Paste a suspicious message into our free scam checker to see common red flags and what to do next. Educational guidance only — nothing is stored.",
    canonical: "/scam-checker/",
    main,
    jsonld: [breadcrumbLD(trail), faqLD(checkerFaqs)],
    extraScripts: `<script src="${asset("/assets/js/checker.js")}" defer></script><script src="${asset("/assets/js/checker-page.js")}" defer></script>`
  });
}
const checkerFaqs = [
  { question: "Is the scam checker free to use?", answer: "Yes. The checker is completely free, needs no account, and works in your browser. You can check as many messages as you like." },
  { question: "Do you store the messages I check?", answer: "No. The analysis runs entirely on your device. The text you paste is not sent to our servers and is not stored. It is cleared as soon as you leave the page." },
  { question: "Does a 'Low risk' result mean the message is safe?", answer: "Not necessarily. A low result means few common scam patterns were detected, but a carefully written scam can avoid obvious triggers. Always verify unexpected requests through official channels." },
  { question: "Can the checker tell me for certain if something is a scam?", answer: "No. It identifies language patterns commonly used in scams to help you decide whether to be cautious. It cannot open links, verify senders, or confirm identities, so it never gives a definitive verdict." },
  { question: "What should I do if a message is flagged as high risk?", answer: "Do not click links, reply, or share any codes, passwords, or payment details. Contact the organisation directly using official contact details you find yourself, and consider reporting it. See our report a scam page." }
];

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
    <div class="card-meta"><div class="card-icon"${catStyle(cat.slug)}>${icon(cat.icon)}</div></div>
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

/* Flagship deep-dive rendering. When data/deepdives.json has an entry for a
   guide slug, the page gains richly-structured, original sections (analysis,
   cited statistics, step-by-step, a case study, variations, verification, and
   sources) and a distinct visual treatment, so it does not read as templated. */
function statGrid(stats) {
  return `<div class="stat-grid">${stats.map((s) => `
    <div class="stat-card">
      <div class="stat-figure">${esc(s.figure)}</div>
      <div class="stat-label">${esc(s.label)}</div>
      <div class="stat-source">Source: ${s.url ? `<a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.source)}</a>` : esc(s.source)}</div>
    </div>`).join("")}</div>`;
}
function stepsList(steps) {
  return `<ol class="steps-list">${steps.map((s) => `
    <li><span class="step-title">${esc(s.title)}</span><span class="step-detail">${esc(s.detail)}</span></li>`).join("")}</ol>`;
}
function variationList(items) {
  return `<div class="variation-list">${items.map((v) => `
    <div class="variation-item"><h4>${esc(v.name)}</h4><p>${esc(v.detail)}</p></div>`).join("")}</div>`;
}
function sourcesList(sources) {
  return `<ul class="sources-list">${sources.map((s) => `
    <li>${s.url ? `<a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.title)}</a>` : esc(s.title)} — <span class="muted">${esc(s.publisher)}</span></li>`).join("")}</ul>`;
}
function caseStudyBox(cs) {
  return `<div class="case-study"><div class="case-tag">${icon("eye")} Anonymised, illustrative scenario</div>
    <h3>${esc(cs.title)}</h3>${cs.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div>`;
}

function guidePage(scam) {
  const cat = categoryBySlug[scam.category];
  const dd = deepDives[scam.slug] || null;
  const trail = [
    { name: "Home", url: "/" },
    { name: "Scam Types", url: "/scam-types/" },
    { name: cat ? cat.name : "Scams", url: cat ? `/${cat.slug}/` : "/scam-types/" },
    { name: scam.title, url: `/scams/${scam.slug}/` }
  ];

  const related = (scam.relatedScams || []).map((s) => scamBySlug[s]).filter(Boolean);

  // Deterministic layout variant (0-3) from the slug, so pages differ in
  // section order and heading wording with no randomness (stable per build).
  let vh = 0;
  for (let i = 0; i < scam.slug.length; i++) vh = (vh * 31 + scam.slug.charCodeAt(i)) >>> 0;
  const variant = vh % 4;
  const pick = (arr) => arr[variant % arr.length];

  // Statistics + category context. Flagship pages use their own hand-written
  // figures; every other page gets accurate, sourced category-level stats so
  // all guides carry real numbers.
  const catStats = statsData && cat && statsData.categories[cat.slug];
  const pageStats = (dd && dd.stats) ? dd.stats
    : (catStats && catStats.stats) || (statsData && statsData.global && statsData.global.stats) || null;
  const pageContext = catStats ? catStats.context : null;

  // Intro paragraphs. Flagship: hand-written. Others: composed from the page's
  // own unique data plus accurate category context, with a varied lead-in.
  const leadIns = [
    "The single clearest warning sign to remember is this:",
    "In short, the giveaway is usually simple:",
    "If you take one thing from this guide, make it this:",
    "The core pattern to watch for is clear:"
  ];
  const introParas = (dd && dd.intro) ? dd.intro : [
    scam.summary,
    ...(pageContext ? [pageContext] : []),
    `${pick(leadIns)} ${scam.quickVerdict.mainRedFlag} ${scam.quickVerdict.whatToDoFirst}`
  ];

  // Contextual internal links with intent-rich anchor text (SEO mesh): two
  // related guides, the category hub, and the checker tool, phrased per variant.
  let seeAlso = "";
  {
    const sa = related.slice(0, 2).map((r) => `<a href="/scams/${r.slug}/">${esc(r.title)}</a>`);
    if (sa.length) {
      const catLink = cat ? `<a href="/${cat.slug}/">${esc(cat.name)} guides</a>` : `<a href="/scam-types/">all scam guides</a>`;
      const checkerLink = `<a href="/scam-checker/">scam checker</a>`;
      const pair = sa.length > 1 ? `${sa[0]} or the ${sa[1]}` : sa[0];
      const pairAnd = sa.length > 1 ? `${sa[0]} and the ${sa[1]}` : sa[0];
      seeAlso = `<p class="see-also">${pick([
        `Not sure this matches what you received? Compare it with the ${pair}, browse the ${catLink}, or paste the exact message into our free ${checkerLink}.`,
        `Scammers rotate tactics constantly — the same operation may also run the ${pairAnd}. See the full ${catLink} hub, or test a suspicious message with the ${checkerLink}.`,
        `If your message looks slightly different, check the ${pair} — both are close cousins of this pattern. Every related guide lives in the ${catLink}, and the ${checkerLink} can scan the text you received.`,
        `Related tricks worth knowing: the ${pairAnd}. For the wider picture, browse the ${catLink} or run the message through our ${checkerLink}.`
      ])}</p>`;
    }
  }

  // Section blocks — rendered only when they have content. Labels vary per
  // variant so the same section reads differently across pages.
  const blocks = {};
  blocks.intro = { id: "what-it-looks-like",
    label: dd ? "How this scam works" : pick(["What this scam usually looks like", "How this scam works", "Understanding this scam", "What to know first"]),
    html: introParas.map((p) => `<p>${esc(p)}</p>`).join("\n      ") + seeAlso };

  if (pageStats) blocks.stats = { id: "by-the-numbers",
    label: dd ? "By the numbers" : pick(["By the numbers", "The scale of it", "What the data shows", "Scam statistics"]),
    html: statGrid(pageStats) };

  if (dd && dd.howItWorks) blocks.steps = { id: "step-by-step",
    label: "Step by step: how the scam unfolds", html: stepsList(dd.howItWorks) };

  blocks.example = { id: "example",
    label: pick(["Example message pattern", "What the message looks like", "A typical example", "How it usually reads"]),
    html: `<div class="example-msg"><span class="example-tag">Example pattern — not a real report</span><div>${esc(scam.exampleMessage)}</div></div>
      <p class="muted" style="font-size:.9rem">This is a fictional, anonymised example used to illustrate the pattern. It is not a verified real message, and any names are used only to show how the scam typically reads.</p>
      <p><strong>${pick(["Why this is a red flag:", "What gives it away:", "The tell here:", "What to notice:"])}</strong> ${esc(scam.quickVerdict.mainRedFlag)}</p>` };

  if (dd && dd.caseStudy) blocks.casestudy = { id: "case-study",
    label: "A real-world scenario", html: caseStudyBox(dd.caseStudy) };

  blocks.redflags = { id: "red-flags",
    label: pick(["Red flags to watch for", "How to spot this scam", "Warning signs", "Tell-tale red flags"]),
    html: flagList(scam.redFlags) };

  if (dd && dd.variations) blocks.variations = { id: "variations",
    label: "Variations to watch for", html: variationList(dd.variations) };

  blocks.whattodo = { id: "what-to-do",
    label: pick(["What to do", "How to protect yourself", "Your safest response", "Staying safe"]),
    html: `<div class="box box-do"><ul>${scam.whatToDo.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` };

  if (dd && dd.verify) blocks.verify = { id: "verify",
    label: "How to verify safely",
    html: `<div class="box box-info"><ul>${dd.verify.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` };

  blocks.ifclicked = { id: "if-you-clicked",
    label: pick(["If you already clicked or replied", "Already responded? Do this now", "If you have already engaged", "Steps if you already acted"]),
    html: `<div class="box box-clicked"><ul>${scam.ifYouClicked.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` };

  blocks.whatnottodo = { id: "what-not-to-do",
    label: pick(["What not to do", "Mistakes to avoid", "What to avoid", "Common mistakes"]),
    html: `<div class="box box-warning"><ul>${scam.whatNotToDo.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` };

  if (related.length) blocks.similar = { id: "similar",
    label: pick(["Similar scams", "Related scams to know", "You might also see", "Scams like this one"]),
    html: `<div class="card-grid">${related.map(scamCard).join("")}</div>` };

  blocks.faq = { id: "faq",
    label: pick(["Frequently asked questions", "Common questions", "Questions people ask", "Your questions answered"]),
    html: `${faqAccordion(scam.faqs)}\n\n      ${adSlot(`guide-${scam.slug}-faq`)}` };

  if (dd && dd.sources) blocks.sources = { id: "sources",
    label: "Sources & further reading",
    html: `<p class="muted">The figures and guidance above draw on publicly available data and advice from fraud-prevention authorities. Always confirm current reporting details through official government sites.</p>
      ${sourcesList(dd.sources)}` };

  // Four readable orderings. Missing (non-flagship) blocks are simply skipped.
  const ORDERINGS = [
    ["intro","stats","steps","example","casestudy","redflags","variations","whattodo","verify","ifclicked","whatnottodo","similar","faq","sources"],
    ["intro","redflags","example","stats","steps","casestudy","variations","whattodo","verify","ifclicked","whatnottodo","similar","faq","sources"],
    ["intro","example","casestudy","stats","steps","redflags","variations","whattodo","verify","ifclicked","whatnottodo","similar","faq","sources"],
    ["intro","stats","redflags","whattodo","verify","example","steps","casestudy","variations","ifclicked","whatnottodo","similar","faq","sources"]
  ];
  const order = ORDERINGS[variant].filter((k) => blocks[k]);

  const toc = `<div class="box"><h3>On this page</h3><nav class="toc">${
    order.map((k) => `<a href="#${blocks[k].id}">${esc(blocks[k].label)}</a>`).join("")
  }</nav></div>`;

  // Render ordered blocks; inject the mid ad slot after the third section.
  const bodyHtml = order.map((k, i) => {
    const sec = `<h2 id="${blocks[k].id}">${esc(blocks[k].label)}</h2>\n      ${blocks[k].html}`;
    return (i === 2) ? `${sec}\n\n      ${adSlot(`guide-${scam.slug}-mid`)}` : sec;
  }).join("\n\n      ");

  const main = `
${breadcrumbs(trail)}
<article class="guide">
  <div class="container with-sidebar">
    <div class="guide-content">
      <header class="guide-header">
        <div class="meta">${riskBadge(scam.riskLevel)}${cat ? `<a class="cat-chip" href="/${cat.slug}/"${catStyle(cat.slug)}>${esc(cat.shortName)}</a>` : ""}${dd ? `<span class="flagship-badge">${icon("check")} In-depth guide</span>${dd.readTime ? `<span class="read-time">${icon("calendar")} ${esc(dd.readTime)}</span>` : ""}` : ""}</div>
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

      ${bodyHtml}

      <p class="last-reviewed">${icon("calendar")} Last reviewed: ${esc(reviewedLabel(dd && dd.updated ? dd.updated : scam.lastReviewed))}${dd && dd.author ? ` &middot; Written and reviewed by the ${esc(dd.author)}` : ""}</p>
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

  const ymToISO = (ym) => (ym && /^\d{4}-\d{2}$/.test(ym)) ? `${ym}-01` : undefined;
  const articleLD = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: scam.metaTitle || scam.title,
    description: scam.metaDescription,
    about: scam.scamType,
    inLanguage: config.lang,
    isAccessibleForFree: true,
    author: { "@type": "Organization", name: (dd && dd.author) ? dd.author : config.siteName, url: config.url },
    publisher: { "@type": "Organization", name: config.siteName, url: config.url },
    dateModified: ymToISO((dd && dd.updated) || scam.lastReviewed),
    mainEntityOfPage: config.url.replace(/\/$/, "") + `/scams/${scam.slug}/`
  };
  if (dd) {
    const words = [
      ...(dd.intro || []),
      ...(dd.howItWorks || []).map((s) => `${s.title} ${s.detail}`),
      ...(dd.caseStudy ? dd.caseStudy.body : []),
      ...(dd.variations || []).map((v) => `${v.name} ${v.detail}`),
      ...(dd.verify || [])
    ].join(" ").split(/\s+/).filter(Boolean).length;
    articleLD.wordCount = words;
    if (dd.sources) {
      articleLD.citation = dd.sources.map((s) => `${s.title} — ${s.publisher}`);
    }
  }

  // Voice-assistant hint for the headline and summary.
  articleLD.speakable = {
    "@type": "SpeakableSpecification",
    cssSelector: [".guide-header h1", ".guide-header .lead"]
  };

  // HowTo structured data built from the guide's "what to do" steps.
  const howToLD = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `What to do about the ${scam.title}`,
    description: scam.quickVerdict.whatToDoFirst,
    step: scam.whatToDo.map((t, i) => ({ "@type": "HowToStep", position: i + 1, text: t }))
  };

  return layout({
    title: (scam.metaTitle || scam.title) + ` | ${config.siteName}`,
    description: scam.metaDescription,
    canonical: `/scams/${scam.slug}/`,
    ogType: "article",
    main,
    jsonld: [breadcrumbLD(trail), faqLD(scam.faqs), articleLD, howToLD]
  });
}

/* ------------------------------------------------------------- legal pages --- */
function simplePage({ slug, name, title, description, body, wide = false }) {
  const trail = [{ name: "Home", url: "/" }, { name, url: `/${slug}/` }];
  const cc = wide ? "container" : "container narrow";
  const main = `
${breadcrumbs(trail)}
<section class="page-intro"><div class="${cc}"><h1>${esc(name)}</h1></div></section>
<section class="prose"><div class="${cc}">${body}</div></section>`;
  return layout({
    title: `${title} | ${config.siteName}`,
    description, canonical: `/${slug}/`, main,
    jsonld: [breadcrumbLD(trail)]
  });
}

const DISCLAIMER_TEXT = `This website provides educational information to help people recognise scam patterns and red flags. It is not legal, financial, cybersecurity, or law enforcement advice.`;

/* Region-specific "how to report" hub, built from data/reporting.json. Falls
   back to a concise static version if the data file is unavailable. */
function reportBody() {
  const meta = {
    slug: "report-a-scam", name: "Report a Scam",
    title: "Report a Scam — Official Resources by Country",
    description: "Where and how to report scams and get help. Official fraud, phishing, and cybercrime reporting bodies for the US, UK, Canada, Australia, NZ, Ireland and the EU."
  };

  if (!reporting) {
    return simplePage({ ...meta, body: `
<p class="lead muted">If you have encountered a scam, reporting it helps protect others and may help you recover. Use official channels for your country.</p>
<h2>Where to report</h2>
<ul>
  <li><strong>United States:</strong> Federal Trade Commission — reportfraud.ftc.gov</li>
  <li><strong>United Kingdom:</strong> Action Fraud — actionfraud.police.uk (forward scam texts to 7726)</li>
  <li><strong>Canada:</strong> Canadian Anti-Fraud Centre — antifraudcentre-centreantifraude.ca</li>
  <li><strong>Australia:</strong> Scamwatch — scamwatch.gov.au</li>
</ul>
<div class="disclaimer-box"><strong>Disclaimer:</strong> ${esc(DISCLAIMER_TEXT)} Reporting destinations may change; verify current contact details through official government websites.</div>` });
  }

  const immediate = `<div class="checklist-card"><h2 style="margin-top:0">First, take these steps</h2>
    <ol class="steps-list">${reporting.immediate.map((s) => `
      <li><span class="step-title">${esc(s.title)}</span><span class="step-detail">${esc(s.detail)}</span></li>`).join("")}</ol></div>`;

  const regions = `<h2 id="by-country">Where to report, by country</h2>
    <p class="muted">Reporting details can change. Where possible, open these organisations directly from your government's official portal rather than following links from a suspicious message.</p>
    <div class="region-grid">${reporting.regions.map((r) => `
      <div class="region-card">
        <h3><span class="region-flag" aria-hidden="true">${esc(r.flag)}</span> ${esc(r.country)}</h3>
        <p class="muted">${esc(r.intro)}</p>
        <ul class="region-bodies">${r.bodies.map((b) => `
          <li><strong>${b.url ? `<a href="${esc(b.url)}" rel="nofollow noopener" target="_blank">${esc(b.name)}</a>` : esc(b.name)}</strong>
          <span class="region-handles">${esc(b.handles)}</span>
          <span class="region-how">${esc(b.how)}</span></li>`).join("")}</ul>
      </div>`).join("")}</div>`;

  const platforms = `<h2 id="platforms">Report to the platform or company</h2>
    <p>Alongside the authorities above, report the scam where it happened. This helps platforms remove scam accounts, listings, and messages quickly.</p>
    <div class="platform-grid">${reporting.platforms.map((p) => `
      <div class="platform-item"><h4>${esc(p.name)}</h4><p>${esc(p.detail)}</p></div>`).join("")}</div>`;

  const after = `<h2 id="after">What happens after you report</h2>
    <div class="variation-list">${reporting.afterReport.map((a) => `
      <div class="variation-item"><h4>${esc(a.title)}</h4><p>${esc(a.detail)}</p></div>`).join("")}</div>`;

  const body = `
<p class="lead">If you have encountered a scam — whether or not you lost money — reporting it helps investigators disrupt fraud and warns others. This guide covers what to do first, the official body to contact in your country, and how to report to the platform involved.</p>
${immediate}
${regions}
${platforms}
${after}
<div class="disclaimer-box"><strong>Disclaimer:</strong> ${esc(DISCLAIMER_TEXT)} We are not affiliated with any organisation listed here. Reporting destinations and contact details may change; always verify them through official government websites.</div>`;

  return simplePage({ ...meta, wide: true, body });
}

function legalPages() {
  const pages = [];

  pages.push(simplePage({
    slug: "about", name: "About Scam or Safe",
    title: "About Us", description: "Learn about Scam or Safe, a public safety resource that helps people recognise scam patterns and red flags before they click, reply, or send money.",
    body: `
<p class="lead">${esc(config.siteName)} is a free public-safety resource that helps everyday people recognise the patterns and red flags common to online and message-based scams — before they click a link, reply to a stranger, or send money.</p>
<h2>Why we built this</h2>
<p>Scams have become more convincing and more constant. They reach us through text messages, emails, marketplaces, job offers, dating apps, phone calls, and social media, and they are designed to trigger a fast, emotional reaction rather than careful thought. Most people do not need a cybersecurity degree to stay safe — they need a calm, clear explanation of what a suspicious message looks like, why it works, and exactly what to do next. That gap is what we set out to fill.</p>
<p>Our belief is simple: the single most powerful defence against a scam is a moment of informed hesitation. When you can recognise the tell-tale signs — the artificial urgency, the request for a gift-card payment, the link that does not quite match the real website — you are far less likely to become a victim. Every guide on this site is written to give you that moment.</p>
<h2>Who this is for</h2>
<p>This site is for anyone who has ever received a message and thought, "Is this real?" That includes people trying to protect themselves, and also those looking out for parents, grandparents, or friends who may be targeted. Our language is deliberately plain and jargon-free so that it is useful whether or not you consider yourself tech-savvy.</p>
<h2>What we do</h2>
<ul>
  <li>Maintain a large, growing library of plain-language guides — currently more than ${scams.length} — covering common scams across ${categories.length} categories, each with red flags and safe next steps.</li>
  <li>Offer a free, private <a href="/scam-checker/">scam checker</a> that highlights patterns commonly seen in scams, running entirely in your browser.</li>
  <li>Publish in-depth explainers on the highest-impact scams, with cited statistics from fraud-prevention authorities.</li>
  <li>Point you toward the right official <a href="/report-a-scam/">reporting resources</a> for your country so you can take action.</li>
</ul>
<h2>What makes us different</h2>
<p>We work hard to be measured rather than alarmist. Many scam-awareness pages rely on fear; we focus on clarity. We describe likelihoods and red flags, not certainties, and we structure every guide the same trustworthy way: what the scam looks like, how to spot it, what to do, and what not to do. Where we cite numbers, we attribute them to their source so you can check them yourself.</p>
<h2>How we keep content accurate</h2>
<p>Each guide is researched from widely documented scam patterns, written for clarity, and shown with a "last reviewed" date. We revisit and update guides as scams evolve. You can read our full process on the <a href="/how-we-review-scams/">how we review scams</a> page.</p>
<h2>What we do not do</h2>
<p>We do not verify individual messages, companies, or people, and we cannot tell you whether one specific message is genuine. We never claim that something is "definitely a scam" or "guaranteed safe," and we are not affiliated with any government agency, bank, retailer, or police force. Our guidance is educational and is meant to be combined with checks through official channels.</p>
<h2>How the site is funded</h2>
<p>To keep this resource free, we may display advertising. Advertising never influences our guidance, is kept clearly separate from our content, and is never placed inside the scam-checker result area. You can read more in our <a href="/privacy-policy/">privacy policy</a>.</p>
<h2>Get in touch</h2>
<p>We welcome suggestions for new guides and corrections to existing ones. Visit our <a href="/contact/">contact page</a> to reach us.</p>
<div class="disclaimer-box"><strong>Disclaimer:</strong> ${esc(DISCLAIMER_TEXT)}</div>`
  }));

  pages.push(simplePage({
    slug: "contact", name: "Contact",
    title: "Contact Us", description: "Get in touch with Scam or Safe to suggest a scam guide, report a correction, or ask a question.",
    body: `
<p class="lead">We welcome suggestions for new scam guides, corrections to existing pages, and general questions about the site. Your input genuinely helps us keep this resource accurate and useful.</p>
<h2>Email us</h2>
<p>The best way to reach us is by email at <a href="mailto:${esc(config.contactEmail)}">${esc(config.contactEmail)}</a>. We read every message. Because this is a small public-safety project, we may not be able to reply to everyone individually, but we do review and act on the feedback we receive.</p>
<h2>What to include</h2>
<p>To help us respond well, it is useful if you tell us:</p>
<ul>
  <li><strong>Suggesting a new guide?</strong> Describe the scam and how it reached you (for example, "a text about a missed parcel delivery"). Please do not include real personal details.</li>
  <li><strong>Reporting a correction?</strong> Tell us the page and what looks inaccurate or out of date, so we can review and fix it quickly.</li>
  <li><strong>General question?</strong> A clear, specific question helps us point you to the right guide or resource.</li>
</ul>
<h2>How quickly we respond</h2>
<p>We aim to review messages regularly, but response times vary and some messages will not receive an individual reply. If your matter is urgent — for example, you may have lost money or shared sensitive details — please do not wait for us. Act immediately using the guidance below.</p>
<h2>If you need urgent help</h2>
<p>We are an educational resource, not an emergency service, a bank, or law enforcement. If you have lost money or your accounts may be at risk:</p>
<ul>
  <li>Contact your bank or card provider right away using the number on the back of your card.</li>
  <li>Change passwords on any affected accounts and turn on two-factor authentication.</li>
  <li>Report the scam to the official body for your country — see our <a href="/report-a-scam/">report a scam</a> page for the right contacts.</li>
</ul>
<h2>What we cannot do</h2>
<ul>
  <li>We cannot provide legal, financial, or cybersecurity advice, or confirm whether a specific message, company, or person is genuine.</li>
  <li>We cannot recover money, investigate individual cases, or contact scammers on your behalf.</li>
  <li>For your safety, please <strong>do not send us passwords, banking details, ID numbers, or full card numbers</strong> — we never need them.</li>
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
<h2>Acceptable use</h2>
<p>You agree to use this site lawfully and for its intended purpose — learning about scams and checking suspicious messages for educational insight. You must not attempt to disrupt, overload, scrape at scale, reverse-engineer, or misuse the site or its scam checker, and you must not use it to facilitate any unlawful activity.</p>
<h2>Intellectual property</h2>
<p>The written guides, design, and original content on this site are the property of ${esc(config.siteName)} unless otherwise stated. You are welcome to read and share links to our pages, but you may not republish substantial portions of our content as your own without permission. Statistics and quotations attributed to third parties remain the property of their respective owners.</p>
<h2>Limitation of liability</h2>
<p>To the maximum extent permitted by law, ${esc(config.siteName)} and its contributors are not liable for any loss or damage — direct, indirect, or consequential — arising from your use of, or reliance on, the information provided here. You use the site and act on its guidance at your own discretion.</p>
<h2>Third-party links and advertising</h2>
<p>We may link to external resources, and we may display advertising to support the site. We are not responsible for the content, accuracy, or practices of third-party websites or advertisers. Following an external link or interacting with an advertisement is at your own risk, and those sites have their own terms and privacy policies.</p>
<h2>Severability</h2>
<p>If any provision of these terms is found to be unenforceable, the remaining provisions continue in full effect.</p>
<h2>Changes</h2>
<p>We may revise these terms at any time. The "last updated" date above reflects the current version, and your continued use of the site means you accept it.</p>
<h2>Contact</h2>
<p>Questions about these terms? Email <a href="mailto:${esc(config.contactEmail)}">${esc(config.contactEmail)}</a>.</p>`
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
<p>Example messages on this site are fictional and anonymised. They are written to illustrate typical patterns and are not verified reports of real messages. Any names, amounts, or companies in an example are used only to show how a scam typically reads.</p>
<h2>The scam checker is a guide, not a verdict</h2>
<p>Our <a href="/scam-checker/">scam checker</a> looks for language patterns commonly seen in scams. It runs in your browser and can produce both false alarms and missed signals. A "Low risk" result is never a guarantee of safety, and a "High risk" result is not proof of fraud — both are prompts to verify carefully.</p>
<h2>Statistics and third-party information</h2>
<p>Figures we cite come from third-party sources such as fraud-prevention agencies and are believed accurate at the time of writing, but we cannot guarantee that external data or linked resources are current or error-free. Always confirm important details with the original source.</p>
<h2>Not professional advice, and no relationship created</h2>
<p>Using this site does not create any professional, advisory, or fiduciary relationship between you and ${esc(config.siteName)}. For specific concerns, consult an appropriate qualified professional or your local authorities.</p>
<h2>Act through official channels</h2>
<p>If you are worried about an account or a payment, contact the company directly using details you find independently, and report scams to your local authorities. See our <a href="/report-a-scam/">report a scam</a> page.</p>`
  }));

  pages.push(reportBody());

  pages.push(simplePage({
    slug: "how-we-review-scams", name: "How We Review Scams",
    title: "How We Review & Write Our Scam Guides", description: "Our editorial process for researching, writing, and reviewing scam guides at Scam or Safe.",
    body: `
<p class="lead">We aim to be a calm, accurate, and genuinely useful public-safety resource. Trust matters when the subject is fraud, so this page explains exactly how our guides are researched, written, reviewed, and kept current.</p>
<h2>Our sources and research</h2>
<p>Every guide is grounded in scam patterns that are widely documented by reputable, publicly accountable organisations — including consumer-protection and fraud-reporting agencies such as the US Federal Trade Commission, the FBI's Internet Crime Complaint Center, the UK's Action Fraud and National Cyber Security Centre, UK Finance, and Australia's Scamwatch, as well as advisories from banks, couriers, and major platforms. We focus on how each scam typically works and the specific signals that give it away. We do not invent scams or exaggerate rare ones.</p>
<h2>How our statistics are used</h2>
<p>Where we cite numbers — such as reported losses or the most common scam types — we attribute them to their source and, on our in-depth guides, link to it directly so you can verify the figure yourself. We prefer official, published data over second-hand claims. When a precise figure is uncertain, we describe it in careful, honest terms rather than inventing specifics.</p>
<h2>Careful, non-sensational language</h2>
<p>We describe red flags and likelihoods, not certainties. We deliberately avoid claims like "definitely a scam", "guaranteed safe", "officially verified", or "police approved". Our goal is to help you pause and verify — not to frighten you into a decision. Fear is exactly the tool scammers use, and we refuse to copy it.</p>
<h2>A consistent, structured format</h2>
<p>Each guide is organised so you can find what you need fast: what the scam looks like, the red flags to watch for, what to do, what to avoid, and answers to common questions. Our most-searched topics receive expanded, in-depth treatment with step-by-step breakdowns, realistic (anonymised) scenarios, and cited statistics.</p>
<h2>Anonymised, illustrative examples</h2>
<p>Example messages and scenarios are fictional and clearly labelled as illustrations of a pattern. We never publish real personal data, and we never present an example as a verified report of a specific real message or victim.</p>
<h2>Safe, responsible guidance</h2>
<p>Our "what to do" steps consistently emphasise contacting official organisations directly, protecting your accounts, and reporting through proper channels. We do not publish instructions that could enable fraud or cause harm, and we point victims toward legitimate help rather than "recovery" services that often prey on them a second time.</p>
<h2>Review, dating, and updates</h2>
<p>Every guide displays a "last reviewed" date so you can see how current it is. Scams evolve, so we revisit and update guides as tactics change, and we expand coverage as new scam types emerge.</p>
<h2>Independence and funding</h2>
<p>We are not affiliated with any government agency, bank, retailer, or police force. To keep the site free we may show advertising, but advertising never influences our guidance and is kept clearly separate from our content. See our <a href="/privacy-policy/">privacy policy</a> for details.</p>
<h2>Corrections</h2>
<p>Accuracy is a process, not a one-time event. If you spot something inaccurate or out of date, please <a href="/contact/">contact us</a> — we genuinely value corrections and act on them.</p>
<div class="disclaimer-box"><strong>Disclaimer:</strong> ${esc(DISCLAIMER_TEXT)}</div>`
  }));

  return pages; // already full HTML strings, in legalSlugs order
}

/* ---------------------------------------------------------- quiz page ------ */
function quizPage() {
  const trail = [{ name: "Home", url: "/" }, { name: "Spot-the-Scam Quiz", url: "/quiz/" }];
  const dataJson = JSON.stringify(quizData).replace(/</g, "\\u003c");
  const main = `
${breadcrumbs(trail)}
<section class="page-intro">
  <div class="container narrow">
    <h1>Can you spot the scam?</h1>
    <p class="lead">Ten realistic messages — some are fraud patterns, some look genuine. For each one, decide before the answer is revealed. Most people miss at least two.</p>
  </div>
</section>
<section class="prose">
  <div class="container narrow quiz-shell">
    <div class="quiz-launcher" id="quiz-app">
      <div class="quiz-launcher-inner">
        <div class="quiz-launcher-icon" aria-hidden="true">${icon("eye")}</div>
        <h2 style="margin:0 0 6px">Ready to test yourself?</h2>
        <p class="muted" style="margin:0 0 18px">10 questions · about 2 minutes · nothing is recorded</p>
        <button class="btn btn-primary btn-lg" data-quiz-open id="quiz-start">Start the quiz</button>
      </div>
      <noscript><div class="notice" style="margin-top:14px">The interactive quiz needs JavaScript. You can still learn every pattern it covers in our <a href="/scam-types/">scam guides</a>.</div></noscript>
    </div>

    <div class="quiz-overlay" id="quiz-modal" hidden>
      <div class="quiz-modal" role="dialog" aria-modal="true" aria-label="Can you spot the scam? quiz">
        <div class="quiz-modal-head">
          <div class="quiz-bar-track" aria-hidden="true"><span id="quiz-bar"></span></div>
          <button class="quiz-close" id="quiz-close" aria-label="Close quiz">&times;</button>
        </div>
        <div class="quiz-stage" id="quiz-stage"></div>
      </div>
    </div>
    <script type="application/json" id="quiz-data">${dataJson}</script>

    <h2>Why practising works</h2>
    <p>Scams succeed in the first few seconds, when a message triggers urgency, fear, or excitement before your slower judgement catches up. Practising on realistic examples builds the reflex that matters most: pausing to look for the tell. Research by fraud-prevention bodies consistently shows that people who have seen a scam pattern before are far less likely to fall for it — recognition is the cheapest protection there is.</p>
    <p>Every question in this quiz is a fictional, anonymised pattern modelled on scams documented by consumer-protection agencies — the same patterns covered in our <a href="/scam-types/">${scams.length}+ guides</a>. The "genuine" examples show what safe communication tends to look like: no links to click, no codes to share, no artificial deadlines, and directions to official apps or the number on your own card.</p>
    <h2>How scoring works</h2>
    <p>You get one point per correct call. After each answer we show the tells — the specific details that give the message away — with a link to the full guide for that scam. At the end you can share your score and challenge someone you'd like to keep safe. The quiz runs entirely in your browser; nothing you do here is recorded or sent to us.</p>
    <div class="box box-info">
      <h3>Received something suspicious right now?</h3>
      <p style="margin:0">Don't guess — paste it into the free <a href="/scam-checker/">scam checker</a> to see which red flags it contains, then check the matching guide.</p>
    </div>
    ${disclaimerBox()}
  </div>
</section>`;
  return layout({
    title: `Can You Spot the Scam? Free 10-Question Quiz | ${config.siteName}`,
    description: "Test yourself against ten realistic scam and genuine message patterns. Learn the tells that give each one away, get your score, and challenge your family.",
    canonical: "/quiz/",
    main,
    jsonld: [breadcrumbLD(trail)],
    extraScripts: `<script src="${asset("/assets/js/quiz.js")}" defer></script>`
  });
}

/* ------------------------------------------------- scam of the week page --- */
function scamOfTheWeekPage() {
  const trail = [{ name: "Home", url: "/" }, { name: "Scam of the Week", url: "/scam-of-the-week/" }];
  const { list, idx } = sotwPick();
  const cur = list[idx];
  const rotation = list.map((s) => ({
    slug: s.slug, title: s.title, url: `/scams/${s.slug}/`,
    summary: s.summary, risk: s.riskLevel
  }));
  const dataJson = JSON.stringify(rotation).replace(/</g, "\\u003c");
  const main = `
${breadcrumbs(trail)}
<section class="page-intro">
  <div class="container narrow">
    <h1>Scam of the Week</h1>
    <p class="lead">One high-impact scam, spotlighted every week. Check back each Monday — or <a href="/feed.xml">subscribe by RSS</a> — to stay a step ahead of the pattern most worth knowing right now.</p>
  </div>
</section>
<section class="prose">
  <div class="container narrow">
    ${cur ? `<div class="sotw-card" id="sotw-card">
      <div class="sotw-kicker">${icon("flag")} This week's pick</div>
      <h3 id="sotw-title"><a id="sotw-link" href="/scams/${cur.slug}/">${esc(cur.title)}</a></h3>
      <div class="card-meta"><span id="sotw-risk">${riskBadge(cur.riskLevel)}</span></div>
      <p id="sotw-summary">${esc(cur.summary)}</p>
      <a class="btn btn-primary" id="sotw-cta" href="/scams/${cur.slug}/">Read the full guide</a>
    </div>` : ""}
    <script type="application/json" id="sotw-data">${dataJson}</script>

    <h2>How the weekly pick works</h2>
    <p>The spotlight rotates through the scams that cause the most reported harm — the patterns behind the largest losses in FTC, FBI IC3 and UK Finance data: fake bank alerts, investment platforms, romance manipulation, impersonation calls, and remote-access "support". Each featured guide includes cited statistics, a step-by-step breakdown of how the scam unfolds, an illustrative scenario, and exactly what to do if you have already engaged.</p>
    <p>A weekly focus works because scams are seasonal and social: delivery scams spike around shopping periods, tax scams around filing deadlines, romance scams around holidays. Spending two minutes with one pattern a week builds broader recognition than trying to memorise everything at once.</p>

    <h2>The rotation</h2>
    <p class="muted">Every guide in the current rotation — read ahead if you don't want to wait.</p>
    <div class="card-grid">
      ${list.map(scamCard).join("")}
    </div>

    <div class="box box-info mt-2">
      <h3>Make it a habit</h3>
      <p style="margin:0">Bookmark this page, <a href="/feed.xml">subscribe to the RSS feed</a>, or test yourself with the <a href="/quiz/">spot-the-scam quiz</a>. If something suspicious lands in your inbox today, run it through the <a href="/scam-checker/">scam checker</a>.</p>
    </div>
    ${disclaimerBox()}
  </div>
</section>`;
  return layout({
    title: `Scam of the Week — This Week's Most Important Scam | ${config.siteName}`,
    description: "A rotating weekly spotlight on one high-impact scam: how it works, the red flags, and what to do. Check back weekly or subscribe by RSS.",
    canonical: "/scam-of-the-week/",
    main,
    jsonld: [breadcrumbLD(trail)],
    extraScripts: `<script src="${asset("/assets/js/sotw.js")}" defer></script>`
  });
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
    canonical: "/404.html", main, robots: "noindex, follow"
  });
}

/* ------------------------------------------------------------- non-HTML ----- */
function sitemapXML() {
  const base = config.url.replace(/\/$/, "");
  const urls = [
    "/", "/scam-checker/", "/scam-types/", "/quiz/", "/scam-of-the-week/",
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

function feedXML() {
  const base = config.url.replace(/\/$/, "");
  const items = updates.map((u) => `  <item>
    <title>${esc(u.title)}</title>
    <link>${base}${esc(u.url)}</link>
    <guid isPermaLink="false">${base}${esc(u.url)}#${esc(u.date)}</guid>
    <pubDate>${new Date(u.date + "T12:00:00Z").toUTCString()}</pubDate>
    <description>${esc(u.summary)}</description>
  </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(config.siteName)} — Updates</title>
  <link>${base}/</link>
  <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>New scam guides, weekly scam spotlights, and site updates from ${esc(config.siteName)}.</description>
  <language>${esc(config.lang)}</language>
${items}
</channel>
</rss>
`;
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
  writePage("/quiz/", quizPage());
  writePage("/scam-of-the-week/", scamOfTheWeekPage());
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
  writeFileRaw("feed.xml", feedXML());
  writeFileRaw("favicon.svg", faviconSVG());

  const pageCount = 5 + categories.length + scams.length + legalSlugs.length + 1;
  console.log(`✓ Built ${pageCount} pages into /dist`);
  console.log(`  • ${scams.length} scam guides across ${categories.length} categories`);
  console.log(`  • AdSense: ${config.adsense.enabled ? "ENABLED" : "disabled (placeholders reserved)"}`);
}

build();
