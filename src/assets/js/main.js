/* Scam or Safe, shared UI behaviour: mobile nav, theme toggle, reading
   progress. The theme preference is the only thing stored (localStorage,
   this browser only). No tracking. */
(function () {
  "use strict";

  // Mobile nav
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Dark / light theme toggle (attribute is pre-set by the inline head script).
  // Also keeps the mobile browser chrome (theme-color) in sync with the theme.
  function syncThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    meta.setAttribute("content", dark ? "#0B1220" : "#F8FAFC");
  }
  syncThemeColor();
  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var root = document.documentElement;
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("sos-theme", next); } catch (e) { /* ignore */ }
      syncThemeColor();
    });
  }

  // Reading progress bar on guide pages
  var guide = document.querySelector("article.guide");
  if (guide) {
    var bar = document.createElement("div");
    bar.className = "reading-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    var ticking = false;
    var update = function () {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
      bar.style.width = pct + "%";
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }
})();
