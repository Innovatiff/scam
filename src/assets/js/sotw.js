/* Scam or Safe — Scam of the Week client rotation.
   The page is server-rendered with the pick current at build time; this
   script recomputes the ISO week on load so the spotlight stays fresh even
   between deploys. No storage, no network. */
(function () {
  "use strict";
  var dataEl = document.getElementById("sotw-data");
  var card = document.getElementById("sotw-card");
  if (!dataEl || !card) return;

  var list;
  try { list = JSON.parse(dataEl.textContent); } catch (e) { return; }
  if (!list || !list.length) return;

  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y) / 86400000 + 1) / 7);
  }

  var pick = list[isoWeek(new Date()) % list.length];
  var link = document.getElementById("sotw-link");
  var cta = document.getElementById("sotw-cta");
  var summary = document.getElementById("sotw-summary");
  var risk = document.getElementById("sotw-risk");
  if (!pick || !link || link.getAttribute("href") === pick.url) return;

  link.textContent = pick.title;
  link.setAttribute("href", pick.url);
  if (cta) cta.setAttribute("href", pick.url);
  if (summary) summary.textContent = pick.summary;
  if (risk) {
    var cls = pick.risk === "High" ? "risk-high" : pick.risk === "Medium" ? "risk-medium" : "risk-low";
    risk.innerHTML = '<span class="risk-badge ' + cls + '">' + pick.risk + " risk</span>";
  }
})();
