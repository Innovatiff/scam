/* Scam or Safe, "Can you spot the scam?" quiz (modal edition).
   Runs entirely in the browser. Nothing is recorded or sent anywhere. */
(function () {
  "use strict";
  var dataEl = document.getElementById("quiz-data");
  var overlay = document.getElementById("quiz-modal");
  var stage = document.getElementById("quiz-stage");
  var bar = document.getElementById("quiz-bar");
  var closeBtn = document.getElementById("quiz-close");
  if (!dataEl || !overlay || !stage) return;

  var QUESTIONS;
  try { QUESTIONS = JSON.parse(dataEl.textContent); } catch (e) { return; }
  if (!QUESTIONS || !QUESTIONS.length) return;

  var idx = 0, score = 0, lastFocus = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function setBar(answered) {
    if (bar) bar.style.width = Math.round((answered / QUESTIONS.length) * 100) + "%";
  }

  /* ---------- modal open / close ---------- */
  function openModal() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    // Double rAF so the transition plays from the hidden state.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add("open"); });
    });
    document.body.classList.add("quiz-open");
    idx = 0; score = 0;
    setBar(0);
    renderQuestion();
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    overlay.classList.remove("open");
    document.body.classList.remove("quiz-open");
    window.setTimeout(function () { overlay.hidden = true; }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.querySelectorAll("[data-quiz-open]").forEach(function (btn) {
    btn.addEventListener("click", openModal);
  });
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !overlay.hidden) closeModal();
  });

  /* ---------- quiz views ---------- */
  function view(html) {
    stage.innerHTML = '<div class="quiz-view">' + html + "</div>";
    stage.scrollTop = 0;
  }

  function renderQuestion() {
    var q = QUESTIONS[idx];
    setBar(idx);
    view(
      '<div class="quiz-progress">Question ' + (idx + 1) + " of " + QUESTIONS.length +
        " · Score " + score + "</div>" +
      '<div class="quiz-msg">' +
        '<div class="from">' + esc(q.from) + "</div>" +
        '<div class="text">“' + esc(q.text) + "”</div>" +
      "</div>" +
      '<div class="quiz-actions choices">' +
        '<button class="quiz-btn scam" data-answer="scam">🚩 This is a scam</button>' +
        '<button class="quiz-btn genuine" data-answer="genuine">✅ Looks genuine</button>' +
      "</div>" +
      '<p class="muted" style="font-size:.82rem;margin-top:12px;text-align:center">All examples are fictional patterns written for practice, no real messages or people.</p>'
    );
    stage.querySelectorAll(".quiz-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { answer(btn.getAttribute("data-answer")); });
    });
  }

  function answer(choice) {
    var q = QUESTIONS[idx];
    var correct = choice === q.answer;
    if (correct) score++;
    setBar(idx + 1);
    var tells = (q.tells || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var verdictLabel = q.answer === "scam" ? "a scam pattern" : "closer to genuine";
    view(
      '<div class="quiz-progress">Question ' + (idx + 1) + " of " + QUESTIONS.length +
        " · Score " + score + "</div>" +
      '<div class="quiz-feedback ' + (correct ? "correct" : "wrong") + '">' +
        "<h3>" + (correct ? "✔ Correct" : "✘ Not quite") + ", this is " + verdictLabel + "</h3>" +
        "<p>" + esc(q.explain) + "</p>" +
        (tells ? "<strong>The tells:</strong><ul class=\"quiz-tells\">" + tells + "</ul>" : "") +
        (q.guide ? '<p style="margin:10px 0 0">Full guide: <a href="' + esc(q.guide.url) + '">' + esc(q.guide.title) + "</a></p>" : "") +
      "</div>" +
      '<div class="quiz-actions" style="margin-top:16px">' +
        '<button class="quiz-btn" id="quiz-next">' +
          (idx + 1 < QUESTIONS.length ? "Next question →" : "See my score →") +
        "</button>" +
      "</div>"
    );
    var next = document.getElementById("quiz-next");
    next.focus();
    next.addEventListener("click", function () {
      idx++;
      if (idx < QUESTIONS.length) renderQuestion(); else renderScore();
    });
  }

  function tierMessage() {
    var pct = score / QUESTIONS.length;
    if (pct === 1) return "Perfect score. You have a sharp eye for the tells, consider sharing this quiz with someone who might not.";
    if (pct >= 0.8) return "Strong result. You spot most patterns; review the ones you missed and you'll be very hard to fool.";
    if (pct >= 0.6) return "A solid start, but a few convincing patterns got past you. The guides linked along the way are worth two minutes each.";
    return "These messages are designed to fool people, and today a few fooled you. That's exactly why practising matters, browse the guides and try again.";
  }

  function renderScore() {
    setBar(QUESTIONS.length);
    var shareText = "I scored " + score + "/" + QUESTIONS.length +
      " on the Can-You-Spot-the-Scam quiz. Can you beat me? " +
      location.origin + "/quiz/";
    view(
      '<div class="quiz-score">' +
        '<div class="quiz-progress">Your result</div>' +
        '<div class="big">' + score + " / " + QUESTIONS.length + "</div>" +
        "<p>" + tierMessage() + "</p>" +
        '<div class="quiz-actions">' +
          '<button class="quiz-btn" id="quiz-share">Copy my score to share</button>' +
          '<button class="quiz-btn" id="quiz-retry">Try again</button>' +
          '<button class="quiz-btn" id="quiz-done">Done</button>' +
        "</div>" +
        '<p class="muted" id="quiz-copied" style="font-size:.85rem;margin:10px 0 0;visibility:hidden">Copied, paste it anywhere.</p>' +
      "</div>"
    );
    document.getElementById("quiz-retry").addEventListener("click", function () {
      idx = 0; score = 0; setBar(0); renderQuestion();
    });
    document.getElementById("quiz-done").addEventListener("click", closeModal);
    document.getElementById("quiz-share").addEventListener("click", function () {
      var done = function () {
        document.getElementById("quiz-copied").style.visibility = "visible";
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = shareText; document.body.appendChild(ta);
        ta.select(); try { document.execCommand("copy"); } catch (e) { /* ignore */ }
        document.body.removeChild(ta); done();
      }
    });
  }
})();
