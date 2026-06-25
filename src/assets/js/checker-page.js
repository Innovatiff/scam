/* IsThisAScam — checker page UI. Renders red-flag results in the browser only. */
(function () {
  "use strict";
  var C = window.IsThisAScamChecker;
  if (!C) return;

  var form = document.getElementById("checker-form");
  var input = document.getElementById("checker-input");
  var resultEl = document.getElementById("checker-result");
  if (!form || !input || !resultEl) return;

  // Suggested guides keyed by signal id (used to build "related guides").
  var GUIDES = {
    "delivery-fee": [["Fake delivery text scam", "/scams/fake-delivery-text-scam/"], ["Canada Post text scam", "/scams/canada-post-text-scam/"]],
    "account-locked": [["Fake Apple ID locked email", "/scams/fake-apple-id-locked-email/"], ["Fake bank alert text scam", "/scams/fake-bank-alert-text-scam/"]],
    "bank-move": [["Fake bank alert text scam", "/scams/fake-bank-alert-text-scam/"], ["Fake e-transfer scam", "/scams/fake-e-transfer-scam/"]],
    "verification-code": [["Facebook account recovery scam", "/scams/facebook-account-recovery-scam/"], ["Instagram verification scam", "/scams/instagram-verification-scam/"]],
    "gift-card": [["Government, tax & legal scams", "/government-tax-scams/"], ["Romance scam DM", "/scams/romance-scam-dm/"]],
    "crypto": [["Crypto investment scam", "/scams/crypto-investment-scam/"], ["Wrong number text scam", "/scams/wrong-number-text-scam/"]],
    "no-interview-job": [["Fake job offer scam", "/scams/fake-job-offer-scam/"], ["WhatsApp job scam", "/scams/whatsapp-job-scam/"]],
    "off-platform": [["Facebook Marketplace buyer email scam", "/scams/facebook-marketplace-buyer-email-scam/"], ["Marketplace scams", "/marketplace-scams/"]],
    "money-promise": [["Fake giveaway scam", "/scams/fake-giveaway-scam/"], ["Crypto investment scam", "/scams/crypto-investment-scam/"]],
    "fake-confirmation": [["Fake invoice email scam", "/scams/fake-invoice-email-scam/"], ["Fake subscription renewal email", "/scams/fake-subscription-renewal-email/"]],
    "threat": [["Government, tax & legal scams", "/government-tax-scams/"]],
    "password": [["Email scams (phishing)", "/email-scams/"]],
    "shortened-url": [["Text message scams", "/text-message-scams/"]]
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var COPY = {
    High: { cls: "risk-high", pct: 90, head: "This message has several scam red flags",
      blurb: "This message matches a number of patterns that are commonly used in scams. Be very careful before you click, reply, or send anything." },
    Medium: { cls: "risk-medium", pct: 55, head: "This message has some scam red flags",
      blurb: "This message shows a few patterns that can appear in scams. It is not proof of a scam, but it is worth pausing and checking carefully." },
    Low: { cls: "risk-low", pct: 18, head: "Few obvious red flags found",
      blurb: "We did not detect many common scam patterns in this text. This is not a guarantee of safety — always verify unexpected requests through official channels." }
  };

  function relatedFor(flags) {
    var seen = {}, out = [];
    flags.forEach(function (f) {
      (GUIDES[f.id] || []).forEach(function (g) {
        if (!seen[g[1]]) { seen[g[1]] = true; out.push(g); }
      });
    });
    if (out.length === 0) {
      out = [["Browse all scam types", "/scam-types/"], ["Use the scam checker tips", "/how-we-review-scams/"]];
    }
    return out.slice(0, 5);
  }

  function render(text) {
    var r = C.analyze(text);
    var copy = COPY[r.level];
    var meterColor = r.level === "High" ? "#DC2626" : r.level === "Medium" ? "#F59E0B" : "#16A34A";

    var flagsHtml = r.flags.length
      ? '<ul class="flag-list">' + r.flags.map(function (f) {
          return '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>' +
            '<span><strong>' + esc(f.label) + '</strong><br><span class="muted">' + esc(f.why) + '</span></span></li>';
        }).join("") + "</ul>"
      : '<p class="muted">No common scam patterns were detected in this text.</p>';

    var related = relatedFor(r.flags).map(function (g) {
      return '<li><a href="' + g[1] + '">' + esc(g[0]) + '</a></li>';
    }).join("");

    resultEl.innerHTML =
      '<div class="result-card">' +
        '<div class="result-head">' +
          '<span class="risk-badge ' + copy.cls + '">' + r.level + ' risk</span>' +
          '<h2>' + copy.head + '</h2>' +
        '</div>' +
        '<div class="score-meter"><span style="width:' + copy.pct + '%;background:' + meterColor + '"></span></div>' +
        '<p class="muted">' + copy.blurb + '</p>' +
        '<h3>Red flags found</h3>' + flagsHtml +
        '<div class="box box-do"><h3>What to do next</h3><ul>' +
          '<li>Do not click links or download attachments in the message.</li>' +
          '<li>Do not reply, send money, or share codes, passwords, or card details.</li>' +
          '<li>Contact the company or person directly using official contact details you find yourself.</li>' +
          '<li>If it claims to be your bank, call the number on the back of your card.</li>' +
        '</ul></div>' +
        '<h3>Related scam guides</h3><ul>' + related + '</ul>' +
        '<p class="muted" style="font-size:.85rem;margin-top:14px">This is automated educational guidance based on common patterns. ' +
        'It cannot confirm whether something is or is not a scam. When in doubt, treat the message as suspicious and verify independently.</p>' +
      '</div>';
    resultEl.classList.remove("hidden");
    resultEl.setAttribute("tabindex", "-1");
    resultEl.focus({ preventScroll: false });
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (text.length < 3) {
      resultEl.innerHTML = '<div class="notice">Please paste a longer message to check for red flags.</div>';
      resultEl.classList.remove("hidden");
      return;
    }
    render(text);
  });

  // Hand-off from the homepage hero box (ephemeral; cleared immediately).
  try {
    var handoff = sessionStorage.getItem("itas_check");
    if (handoff) {
      sessionStorage.removeItem("itas_check");
      input.value = handoff;
      render(handoff);
    }
  } catch (e) { /* sessionStorage unavailable; ignore */ }
})();
