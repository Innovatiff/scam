/* Scam or Safe — homepage hero hand-off to the checker page.
   Stores the pasted text only in sessionStorage (cleared after one use). */
(function () {
  "use strict";
  var form = document.getElementById("hero-check-form");
  var input = document.getElementById("hero-check-input");
  if (!form || !input) return;
  form.addEventListener("submit", function (e) {
    var text = input.value.trim();
    if (!text) return; // let it navigate to the checker page empty
    e.preventDefault();
    try { sessionStorage.setItem("itas_check", text); } catch (err) { /* ignore */ }
    window.location.href = "/scam-checker/";
  });
})();
