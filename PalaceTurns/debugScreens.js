/*
 * debugScreens.js — on-screen screen-jumper for quick dev navigation.
 *
 * Loads ONLY when the URL carries ?debug=1 or ?screens=1 (see the loader in
 * index.html), so the shipped game is never affected. It adds a small floating
 * panel that lets you:
 *   - jump straight to any of the 6 intro beats (with their real art / spotlight
 *     / flip / voice), via window.__juiceGame.playIntroBeat(i)
 *   - step Prev / Next through the intro (also bound to the [ and ] keys)
 *   - jump to the tutorial and to each data-driven level
 *
 * It relies only on the public window.__juiceGame surface — no internals.
 */
(function () {
  "use strict";

  function boot() {
    var G = window.__juiceGame;
    // Wait until the game has exposed the intro beats.
    if (!G || !Array.isArray(G.INTRO_BEATS) || typeof G.playIntroBeat !== "function") {
      window.setTimeout(boot, 150);
      return;
    }
    build(G);
  }

  function build(G) {
    injectStyles();

    var beats = G.INTRO_BEATS;

    // ---- Unified ordered screen list ------------------------------------
    // Prev/Next (and [ ]) walk THIS single sequence end-to-end:
    //   intro beats 1..N → Tutorial → Main game → each data-driven level.
    // So one Next button reaches every screen, not just the intro.
    function reset() { if (typeof G.navResetForJump === "function") G.navResetForJump(); }
    var steps = [];
    beats.forEach(function (b, i) {
      steps.push({ label: String(i + 1), title: b.text || ("beat " + (i + 1)), group: "intro",
                   go: function () { G.playIntroBeat(i); } });
    });
    steps.push({ label: "Tutorial", title: "Tutorial flow", group: "more",
                 go: function () { reset(); if (G.startCapacityFlow) G.startCapacityFlow({ assets: G.TUTORIAL_ASSETS, phase: "tutorial" }); } });
    steps.push({ label: "Main game", title: "Main game iteration", group: "more",
                 go: function () { reset(); if (G.startCapacityFlow) G.startCapacityFlow({ assets: G.MAIN_GAME_ASSETS, phase: "main" }); else if (G.startMainGame) G.startMainGame(); } });
    steps.push({ label: "Select", title: "Select one container (chooser)", group: "more",
                 go: function () { reset(); if (G.showContainerSelect) G.showContainerSelect(); } });
    // Per-fruit jumps. These drive the LIVE capacity engine via startFruitRound()
    // (sets currentFruitRound + CAPACITY_PHASE='main', paints the scene with the
    // round's assets + body classes, then opens the chooser) — i.e. the exact
    // entry the game uses when advancing between rounds. The OLD per-juice jumps
    // used the dead mgStage engine and were removed; these replace them properly.
    var FRUITS = G.FRUIT_ROUNDS || [];
    var FRUIT_LABELS = { watermelon: "🍉 Watermelon", pineapple: "🍍 Pineapple", kiwi: "🥝 Kiwi" };
    FRUITS.forEach(function (round) {
      var id = round && round.id;
      if (!id) return;
      steps.push({ label: FRUIT_LABELS[id] || id, title: id + " round (chooser → fill → pour → quiz)", group: "more",
                   go: function () { reset(); if (G.startFruitRound) G.startFruitRound(id); } });
    });

    var cur = -1;

    var panel = document.createElement("div");
    panel.className = "dscr-panel";
    panel.innerHTML =
      '<h5>🎬 Screens <span id="dscr-cur"></span></h5>' +
      '<div class="dscr-row" id="dscr-intro"></div>' +
      '<div class="dscr-row">' +
        '<button class="dscr-btn wide" id="dscr-prev">◀ Prev</button>' +
        '<button class="dscr-btn wide" id="dscr-next">Next ▶</button>' +
      '</div>' +
      '<div class="dscr-sub">Jump elsewhere</div>' +
      '<div class="dscr-row" id="dscr-more"></div>' +
      '<div class="dscr-row"><button class="dscr-btn wide" id="dscr-hide">— hide</button></div>';
    document.body.appendChild(panel);

    // One chip per step, in its row; clicking jumps straight to that step.
    var introWrap = panel.querySelector("#dscr-intro");
    var moreWrap  = panel.querySelector("#dscr-more");
    steps.forEach(function (s, n) {
      var btn = makeBtn(s.label, function () { go(n); });
      btn.title = s.title;
      btn.dataset.step = n;
      (s.group === "intro" ? introWrap : moreWrap).appendChild(btn);
    });

    function markCurrent() {
      var label = panel.querySelector("#dscr-cur");
      if (label) {
        label.textContent = (cur >= 0 && cur < steps.length)
          ? "— " + (cur + 1) + "/" + steps.length + " · " + steps[cur].label
          : "";
      }
      panel.querySelectorAll("[data-step]").forEach(function (c) {
        c.classList.toggle("is-cur", Number(c.dataset.step) === cur);
      });
    }

    function go(n) {
      if (n < 0 || n >= steps.length) return;
      cur = n;
      try { steps[n].go(); } catch (e) { console.warn("[debugScreens]", e); }
      markCurrent();
    }

    panel.querySelector("#dscr-prev").onclick = function () { go(cur <= 0 ? 0 : cur - 1); };
    panel.querySelector("#dscr-next").onclick = function () { go(cur < 0 ? 0 : (cur >= steps.length - 1 ? steps.length - 1 : cur + 1)); };

    // Minimize → small pill that restores the panel.
    panel.querySelector("#dscr-hide").onclick = function () {
      panel.style.display = "none";
      var pill = document.createElement("button");
      pill.className = "dscr-pill";
      pill.textContent = "🎬 Screens";
      pill.onclick = function () { panel.style.display = ""; pill.remove(); };
      document.body.appendChild(pill);
    };

    // [ and ] step through the intro (ignore while typing in a field).
    window.addEventListener("keydown", function (e) {
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "]") go(cur < 0 ? 0 : (cur >= steps.length - 1 ? steps.length - 1 : cur + 1));
      else if (e.key === "[") go(cur <= 0 ? 0 : cur - 1);
    });
  }

  function makeBtn(text, onClick) {
    var b = document.createElement("button");
    b.className = "dscr-btn";
    b.textContent = text;
    b.onclick = onClick;
    return b;
  }

  function injectStyles() {
    var css = document.createElement("style");
    css.textContent =
      ".dscr-panel{position:fixed;left:8px;bottom:8px;z-index:99999;background:rgba(8,18,26,.93);" +
        "border:1px solid #1b6b80;border-radius:10px;padding:9px 10px;font:12px/1.35 system-ui,sans-serif;" +
        "color:#dff;max-width:230px;box-shadow:0 8px 24px rgba(0,0,0,.45)}" +
      ".dscr-panel h5{margin:0 0 7px;font-size:12px;color:#8ef;font-weight:600}" +
      ".dscr-panel #dscr-cur{color:#aef;font-weight:400}" +
      ".dscr-sub{margin:8px 0 4px;color:#6aa;font-size:10px;text-transform:uppercase;letter-spacing:.06em}" +
      ".dscr-row{display:flex;flex-wrap:wrap;gap:4px}" +
      ".dscr-btn{background:#0c3a48;border:1px solid #1b6b80;border-radius:6px;color:#dff;" +
        "padding:5px 8px;cursor:pointer;font-size:11px;line-height:1}" +
      ".dscr-btn:hover{background:#0a5366}" +
      ".dscr-btn.is-cur{background:#00e5ff;color:#001018;font-weight:700;border-color:#00e5ff}" +
      ".dscr-btn.wide{flex:1}" +
      ".dscr-pill{position:fixed;left:8px;bottom:8px;z-index:99999;background:#0c3a48;border:1px solid #1b6b80;" +
        "border-radius:8px;color:#8ef;padding:6px 10px;cursor:pointer;font:12px system-ui,sans-serif}";
    document.head.appendChild(css);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
