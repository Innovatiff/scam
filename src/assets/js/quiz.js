/* Scam or Safe — "Can you spot the scam?" quiz.
   Runs entirely in the browser. Nothing is recorded or sent anywhere. */
(function () {
  "use strict";
  var app = document.getElementById("quiz-app");
  var dataEl = document.getElementById("quiz-data");
  if (!app || !dataEl) return;

  var QUESTIONS;
  try { QUESTIONS = JSON.parse(dataEl.textContent); } catch (e) { return; }
  if (!QUESTIONS || !QUESTIONS.length) return;

  var idx = 0, score = 0;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderQuestion() {
    var q = QUESTIONS[idx];
    app.innerHTML =
      '<div class="quiz-progress">Question ' + (idx + 1) + " of " + QUESTIONS.length +
        " · Score " + score + "</div>" +
      '<div class="quiz-msg">' +
        '<div class="from">' + esc(q.from) + "</div>" +
        '<div class="text">“' + esc(q.text) + "”</div>" +
      "</div>" +
      '<div class="quiz-actions">' +
        '<button class="quiz-btn scam" data-answer="scam">🚩 This is a scam</button>' +
        '<button class="quiz-btn genuine" data-answer="genuine">✅ Looks genuine</button>' +
      "</div>" +
      '<p class="muted" style="font-size:.85rem;margin-top:12px">All examples are fictional patterns written for practice — no real messages or people.</p>';
    app.querySelectorAll(".quiz-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { answer(btn.getAttribute("data-answer")); });
    });
  }

  function answer(choice) {
    var q = QUESTIONS[idx];
    var correct = choice === q.answer;
    if (correct) score++;
    var tells = (q.tells || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var verdictLabel = q.answer === "scam" ? "a scam pattern" : "closer to genuine";
    app.innerHTML =
      '<div class="quiz-progress">Question ' + (idx + 1) + " of " + QUESTIONS.length +
        " · Score " + score + "</div>" +
      '<div class="quiz-msg">' +
        '<div class="from">' + esc(q.from) + "</div>" +
        '<div class="text">“' + esc(q.text) + "”</div>" +
      "</div>" +
      '<div class="quiz-feedback ' + (correct ? "correct" : "wrong") + '">' +
        "<h3>" + (correct ? "✔ Correct" : "✘ Not quite") + " — this is " + verdictLabel + "</h3>" +
        "<p>" + esc(q.explain) + "</p>" +
        (tells ? "<strong>The tells:</strong><ul class=\"quiz-tells\">" + tells + "</ul>" : "") +
        (q.guide ? '<p style="margin:10px 0 0">Full guide: <a href="' + esc(q.guide.url) + '">' + esc(q.guide.title) + "</a></p>" : "") +
      "</div>" +
      '<div class="quiz-actions" style="margin-top:16px">' +
        '<button class="quiz-btn" id="quiz-next">' +
          (idx + 1 < QUESTIONS.length ? "Next question →" : "See my score →") +
        "</button>" +
      "</div>";
    document.getElementById("quiz-next").addEventListener("click", function () {
      idx++;
      if (idx < QUESTIONS.length) renderQuestion(); else renderScore();
    });
  }

  function tierMessage() {
    var pct = score / QUESTIONS.length;
    if (pct === 1) return "Perfect score. You have a sharp eye for the tells — consider sharing this quiz with someone who might not.";
    if (pct >= 0.8) return "Strong result. You spot most patterns; review the ones you missed and you'll be very hard to fool.";
    if (pct >= 0.6) return "A solid start — but a few convincing patterns got past you. The guides linked above are worth two minutes each.";
    return "These messages are designed to fool people, and today a few fooled you. That's exactly why practising matters — browse the guides and try again.";
  }

  function renderScore() {
    var shareText = "I scored " + score + "/" + QUESTIONS.length +
      " on the Can-You-Spot-the-Scam quiz. Can you beat me? " +
      location.origin + "/quiz/";
    app.innerHTML =
      '<div class="quiz-msg quiz-score">' +
        '<div class="quiz-progress">Your result</div>' +
        '<div class="big">' + score + " / " + QUESTIONS.length + "</div>" +
        "<p>" + tierMessage() + "</p>" +
        '<div class="quiz-actions" style="justify-content:center">' +
          '<button class="quiz-btn" id="quiz-share">Copy my score to share</button>' +
          '<button class="quiz-btn" id="quiz-retry">Try again</button>' +
        "</div>" +
        '<p class="muted" id="quiz-copied" style="font-size:.85rem;margin:10px 0 0;visibility:hidden">Copied — paste it anywhere.</p>' +
      "</div>";
    document.getElementById("quiz-retry").addEventListener("click", function () {
      idx = 0; score = 0; renderQuestion();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
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

  renderQuestion();
})();
