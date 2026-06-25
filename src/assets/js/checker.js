/* IsThisAScam — client-side red-flag checker
   Runs entirely in the browser. Pasted text is never sent to a server or stored
   beyond a single in-memory analysis (and an optional sessionStorage hand-off
   between the homepage and the checker page, which is cleared after use). */

(function () {
  "use strict";

  // Each signal: id, label, weight, why (plain-language reason), patterns.
  // Patterns are matched case-insensitively against the message text.
  var SIGNALS = [
    {
      id: "urgency", label: "Urgency or pressure to act now", weight: 2,
      why: "Scams often rush you so you act before thinking it through.",
      patterns: [/\b(urgent|immediately|right away|act now|as soon as possible|asap|don'?t delay|hurry)\b/i]
    },
    {
      id: "limited-time", label: "“Limited time” deadline", weight: 2,
      why: "Artificial deadlines are used to stop you from checking the facts.",
      patterns: [/\b(within \d+ ?(hours?|minutes?|days?)|expires?( soon| today)?|last chance|today only|limited time|final notice|before it'?s too late)\b/i]
    },
    {
      id: "threat", label: "Threats or consequences", weight: 3,
      why: "Threats of arrest, fines, account loss, or legal action create fear and panic.",
      patterns: [/\b(arrest|legal action|lawsuit|deport|warrant|police|prosecut|fine|penalty|suspend(ed)?|terminat|permanently (closed|deleted)|lose access)\b/i]
    },
    {
      id: "account-locked", label: "“Account locked / suspended” claim", weight: 3,
      why: "Fake account-problem alerts are a common way to push you to a phishing login page.",
      patterns: [/\b(account (has been )?(locked|suspended|disabled|on hold|restricted|limited)|unusual (activity|login|sign[- ]?in)|verify your (account|identity)|reactivate your account)\b/i]
    },
    {
      id: "payment", label: "Request for a payment or fee", weight: 3,
      why: "Unexpected requests to pay a fee, fine, or charge are a frequent scam tactic.",
      patterns: [/\b(pay(ment)? (a |the )?(small )?(fee|fine|charge|deposit)|outstanding (fee|charge|balance)|redelivery fee|customs (fee|charge)|processing fee|activation fee|release fee)\b/i]
    },
    {
      id: "gift-card", label: "Gift card request", weight: 4,
      why: "Legitimate companies and agencies never ask for payment in gift cards.",
      patterns: [/\b(gift ?cards?|itunes card|google play card|amazon card|steam card|voucher code)\b/i]
    },
    {
      id: "crypto", label: "Cryptocurrency request or promise", weight: 3,
      why: "Requests to pay in crypto, or promises of crypto profits, are common in scams.",
      patterns: [/\b(bitcoin|btc|ethereum|crypto(currency)?|usdt|wallet address|trading bot|guaranteed (returns?|profit))\b/i]
    },
    {
      id: "suspicious-link", label: "Contains a link", weight: 1,
      why: "Links can lead to fake login or payment pages. Verify the destination before clicking.",
      patterns: [/\b((https?:\/\/)?[a-z0-9-]+\.[a-z]{2,}(\/[^\s]*)?)\b/i, /\[?(suspicious )?link\]?/i]
    },
    {
      id: "shortened-url", label: "Shortened or odd-looking URL", weight: 2,
      why: "Shortened links hide the real destination, which can be a fake site.",
      patterns: [/\b(bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|cutt\.ly|rb\.gy|[a-z0-9-]+\.(xyz|top|click|link|info|live|shop|cn|ru|tk))\b/i]
    },
    {
      id: "password", label: "Asks for your password", weight: 4,
      why: "No legitimate service asks you to send or confirm your password.",
      patterns: [/\b(your )?(password|passcode|login (details|credentials)|sign[- ]?in details)\b/i]
    },
    {
      id: "verification-code", label: "Asks for a verification / one-time code", weight: 4,
      why: "One-time codes unlock your accounts. No genuine party should ask you to share them.",
      patterns: [/\b(verification code|one[- ]?time (code|passcode|password)|otp|2fa code|security code|the code (i|we) (just )?sent)\b/i]
    },
    {
      id: "delivery-fee", label: "Unexpected delivery / parcel message", weight: 2,
      why: "Fake delivery notices that ask for a fee or details are a common smishing pattern.",
      patterns: [/\b(parcel|package|delivery|shipment|courier|held at (our )?(depot|customs)|could not be delivered|reschedule (your )?delivery|missed delivery)\b/i]
    },
    {
      id: "money-promise", label: "Unrealistic money or prize promise", weight: 3,
      why: "Offers of easy money, big prizes, or guaranteed returns are classic bait.",
      patterns: [/\b(you('| ha)?ve won|congratulations|claim your (prize|reward)|free (gift|prize|iphone|money)|\$\d{2,}[\d,]*\s*(\/?\s*(day|hour|week))?|earn \$?\d+|guaranteed income|risk[- ]?free)\b/i]
    },
    {
      id: "no-interview-job", label: "Job offer with no real interview", weight: 2,
      why: "Being 'hired' instantly with no interview is a common job-scam sign.",
      patterns: [/\b(no (experience|interview) (needed|required|necessary)|work from home|easy (money|task|job)|hiring immediately|you('| ha)?ve been (selected|hired)|simple (online )?tasks?|recruiter)\b/i]
    },
    {
      id: "off-platform", label: "Asks to move off the platform", weight: 2,
      why: "Moving to email, text, or a chat app removes the platform's safety protections.",
      patterns: [/\b(contact me (on|at|via)|message me on|whats ?app|telegram|signal app|move (this )?(chat|conversation) to|email me (directly|at)|text me at)\b/i]
    },
    {
      id: "fake-confirmation", label: "Unprompted payment / order confirmation", weight: 2,
      why: "Fake invoices and order confirmations push you to click or call a fake number.",
      patterns: [/\b(your order (#|number|of)|invoice (#|number|attached)|payment (received|confirmed|pending|on hold)|auto[- ]?renew|subscription (renewal|will renew)|receipt (#|attached))\b/i]
    },
    {
      id: "secrecy", label: "Asks you to keep it secret", weight: 3,
      why: "Pressure to keep a request secret is meant to stop you asking someone you trust.",
      patterns: [/\b(keep (this|it) (a )?secret|don'?t tell (anyone|anybody)|between us|confidential matter)\b/i]
    },
    {
      id: "bank-move", label: "Tells you to move money to a “safe” account", weight: 4,
      why: "A real bank will never ask you to move money to another account to keep it safe.",
      patterns: [/\b(move your (money|funds)|safe account|new account|transfer (your )?(money|funds|balance) to)\b/i]
    }
  ];

  function findFlags(text) {
    var found = [];
    for (var i = 0; i < SIGNALS.length; i++) {
      var s = SIGNALS[i];
      for (var p = 0; p < s.patterns.length; p++) {
        if (s.patterns[p].test(text)) {
          found.push({ id: s.id, label: s.label, weight: s.weight, why: s.why });
          break;
        }
      }
    }
    return found;
  }

  // Light heuristic for grammar/spelling noise (very rough, non-judgemental).
  function looksPoorlyWritten(text) {
    var t = text.trim();
    if (t.length < 12) return false;
    var hits = 0;
    if (/\s{3,}/.test(t)) hits++;
    if (/[a-z]{2,}[A-Z]{2,}/.test(t)) hits++;
    if (/(.)\1{3,}/.test(t)) hits++;
    // No sentence punctuation in a long-ish message
    if (t.length > 80 && !/[.!?]/.test(t)) hits++;
    return hits >= 2;
  }

  function scoreToLevel(score) {
    if (score >= 7) return "High";
    if (score >= 3) return "Medium";
    return "Low";
  }

  function analyze(text) {
    var flags = findFlags(text);
    if (looksPoorlyWritten(text)) {
      flags.push({
        id: "grammar", label: "Spelling or formatting that looks off", weight: 1,
        why: "Odd spelling, spacing, or formatting can be a sign of a mass scam message."
      });
    }
    var score = flags.reduce(function (sum, f) { return sum + f.weight; }, 0);
    return { level: scoreToLevel(score), score: score, flags: flags };
  }

  // Expose for the page scripts.
  window.IsThisAScamChecker = { analyze: analyze, SIGNALS: SIGNALS };
})();
