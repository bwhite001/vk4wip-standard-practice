/* VK4WIP Standard Theory Practice: UI controller. */
(function () {
  "use strict";
  const BANK = (window.QUESTIONS || []).filter((q) => !q.retired);
  const BY_ID = Object.fromEntries(BANK.map((q) => [q.id, q]));
  const { CONFIG, SECTION_ORDER } = Exam;
  const L = "ABCD";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- persisted state ----------
  let seen = Store.get("seen", {});      // id -> times shown
  let stats = Store.get("stats", {});    // id -> {seen, correct}
  let history = Store.get("history", []); // recent attempts
  let A = null;                          // current attempt
  let tick = null;
  let homeMode = "exam";
  let drillN = "10";
  let sharedSeed = null;

  const save = () => { if (A) Store.set("attempt", A); };

  // ---------- routing ----------
  const VIEWS = ["home", "quiz", "results", "instructor", "help"];
  function show(view) {
    VIEWS.forEach((v) => $("v-" + v).classList.toggle("hide", v !== view));
    $("bar").classList.toggle("hide", view !== "quiz");
    if (view !== "quiz") stopTimer();
    window.scrollTo(0, 0);
  }
  function setHash(h) { if (location.hash !== "#" + h) history_replace(h); }
  function history_replace(h) { try { window.history.replaceState(null, "", "#" + h); } catch (e) { location.hash = h; } }

  function route() {
    const h = (location.hash || "#home").slice(1);
    if (h === "formulas") { openModal("m-formulas"); if (!currentView()) { renderHome(); show("home"); } return; }
    let m = h.match(/^paper-([0-9A-Za-z]{1,7})$/);
    if (m) {
      const seed = RNG.codeToSeed(m[1]);
      if (seed) { sharedSeed = seed; renderHome(); show("home"); return; }
    }
    if (h === "instructor" || h === "help") { show(h); return; }
    if (h === "quiz" && A && !A.done) { show("quiz"); startTimer(); drawQ(); return; }
    if (h === "results" && A && A.done) { show("results"); return; }
    renderHome(); show("home");
  }
  const currentView = () => VIEWS.find((v) => !$("v-" + v).classList.contains("hide"));
  window.addEventListener("hashchange", route);

  // ---------- home ----------
  function renderHome() {
    // resume
    const saved = Store.get("attempt", null);
    if (saved && !saved.done && (!A || A.done)) A = saved;
    const resumable = A && !A.done;
    $("resume").classList.toggle("hide", !resumable);
    if (resumable) {
      const n = A.answers.filter((x) => x !== null).length;
      $("resume-txt").textContent = `${A.label}: ${n}/${A.qs.length} answered${A.kind === "exam" ? `, ${fmtTime(A.left)} left` : ""}.`;
    }
    // shared banner
    const sb = $("shared-banner");
    if (sharedSeed) {
      sb.classList.remove("hide");
      sb.innerHTML = `<div><b>Shared paper ${RNG.seedToCode(sharedSeed)}</b> <span class="muted">Choose Exam or Practice mode, then start.</span></div><div class="row"><button class="btn btn-primary" id="shared-go" type="button">Start shared paper</button><button class="btn btn-ghost" id="shared-x" type="button">Cancel</button></div>`;
      $("shared-go").onclick = () => startPaper(sharedSeed, true);
      $("shared-x").onclick = () => { sharedSeed = null; setHash("home"); renderHome(); };
    } else sb.classList.add("hide");

    // quota table
    $("quota").innerHTML = SECTION_ORDER.map((s) => `<tr><td>${esc(Exam.sectionLabel(s))}</td><td>${CONFIG.sections[s].quota}</td><td>${BANK.filter((q) => q.section === s).length}</td></tr>`).join("") +
      `<tr><td><b>Total</b></td><td><b>${SECTION_ORDER.reduce((a, s) => a + CONFIG.sections[s].quota, 0)}</b></td><td><b>${BANK.length}</b></td></tr>`;
    // drill select
    if (!$("drill-sec").options.length) $("drill-sec").innerHTML = SECTION_ORDER.map((s) => `<option value="${s}">${esc(Exam.sectionLabel(s))} (${BANK.filter((q) => q.section === s).length})</option>`).join("");
    // weak spots
    const weak = Exam.weakIds(stats, 20).filter((id) => BY_ID[id]);
    $("weak-go").disabled = !weak.length;
    $("weak-go").textContent = weak.length ? `Weak spots (${weak.length})` : "Weak spots";
    $("weak-txt").textContent = weak.length ? "Questions you've got wrong most often." : "Available once you've answered some questions.";
    // coverage
    const seenCount = BANK.filter((q) => seen[q.id]).length;
    $("coverage-txt").innerHTML = `Bank coverage: <b>${seenCount}</b> of <b>${BANK.length}</b> questions seen`;
    $("coverage-bar").style.width = (seenCount / BANK.length * 100) + "%";
    // history
    $("history").innerHTML = history.length
      ? `<div class="hist"><span class="hd muted">Date</span><span class="muted">Paper</span><span class="muted">Score</span><span class="muted">Result</span>` +
        history.slice(0, 6).map((h) => `<span class="hd">${esc(new Date(h.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }))}</span><span>${esc(h.label)}</span><span>${h.right}/${h.total}</span><span class="${h.pass ? "ok" : "no"}">${h.pass ? "✓ Pass" : "✗ Not yet"}</span>`).join("") + "</div>"
      : `<p class="muted small">No attempts yet. Start a paper above.</p>`;
    // strength
    $("strength").innerHTML = SECTION_ORDER.map((s) => {
      let n = 0, c = 0;
      for (const [id, v] of Object.entries(stats)) if (BY_ID[id] && BY_ID[id].section === s) { n += v.seen; c += v.correct; }
      const p = n ? c / n : 0;
      return `<tr><td>${esc(Exam.sectionLabel(s))}</td><td class="small">${n ? Math.round(p * 100) + "%" : "–"}</td><td class="w35"><div class="meter"><i class="${n ? (p >= 0.7 ? "good" : "poor") : ""}" style="width:${p * 100}%"></i></div></td></tr>`;
    }).join("");
    $("nostore").classList.toggle("hide", Store.available());
  }

  // mode pickers
  document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    homeMode = b.dataset.mode;
    document.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
  }));
  radioArrows(document.querySelector(".choice-grid"));
  document.querySelectorAll("[data-n]").forEach((b) => b.addEventListener("click", () => {
    drillN = b.dataset.n;
    document.querySelectorAll("[data-n]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
  }));
  radioArrows(document.querySelector(".seg"));

  $("start").onclick = () => startPaper(RNG.randomSeed(), false);
  $("code-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const seed = RNG.codeToSeed($("code-in").value.trim());
    if (!seed) { $("code-err").textContent = "That code doesn't look right. Codes are up to 7 letters and numbers."; return; }
    $("code-err").textContent = "";
    sharedSeed = seed; setHash("paper-" + RNG.seedToCode(seed)); renderHome();
  });
  $("drill-go").onclick = () => {
    const s = Number($("drill-sec").value), seed = RNG.randomSeed();
    const qs = Exam.generateDrill({ seed, bank: BANK, section: s, count: drillN === "all" ? "all" : Number(drillN), history: { seen } });
    begin({ kind: "drill", label: `Drill: ${Exam.sectionLabel(s)}`, seed, qs, section: s });
  };
  $("weak-go").onclick = () => {
    const ids = Exam.weakIds(stats, 20).filter((id) => BY_ID[id]);
    if (!ids.length) return;
    const seed = RNG.randomSeed();
    begin({ kind: "weak", label: "Weak spots", seed, qs: Exam.generateDrill({ seed, bank: BANK, ids, count: ids.length }) });
  };
  $("resume-go").onclick = () => { setHash("quiz"); show("quiz"); startTimer(); drawQ(); };
  $("resume-drop").onclick = () => { Store.remove("attempt"); A = null; renderHome(); };
  $("reset").onclick = () => $("reset-confirm").classList.remove("hide");
  $("reset-no").onclick = () => $("reset-confirm").classList.add("hide");
  $("reset-yes").onclick = () => {
    seen = {}; stats = {}; history = [];
    ["seen", "stats", "history", "attempt"].forEach(Store.remove);
    A = null; $("reset-confirm").classList.add("hide"); renderHome();
  };

  function startPaper(seed, shared) {
    const mix = $("mix").checked;
    const qs = Exam.generatePaper({ seed, bank: BANK, history: { seen }, mix, ignoreHistory: shared });
    const code = RNG.seedToCode(seed);
    sharedSeed = null;
    begin({ kind: homeMode, label: `${homeMode === "exam" ? "Exam" : "Practice"} paper ${code}`, seed, code, mix, shared: true, qs, wasShared: shared });
  }

  // ---------- attempt ----------
  function begin(o) {
    A = {
      kind: o.kind, label: o.label, seed: o.seed, code: o.code || null, mix: !!o.mix, section: o.section || null,
      qs: o.qs, answers: Array(o.qs.length).fill(null), flags: Array(o.qs.length).fill(false), shown: Array(o.qs.length).fill(false),
      i: 0, left: CONFIG.timeLimitSec, startedAt: Date.now(), done: false,
    };
    preload(A.qs);
    save(); setHash("quiz"); show("quiz"); startTimer(); drawQ();
  }
  const instant = () => A && A.kind !== "exam";
  function preload(qs) { qs.forEach((q) => { if (q.image) { const im = new Image(); im.src = q.image; } }); }

  // timer
  function fmtTime(s) { s = Math.max(0, s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
  function startTimer() {
    stopTimer(); drawTimer();
    if (!A || A.done) return;
    tick = setInterval(() => {
      if (A.kind === "exam") {
        A.left--;
        if (A.left === 300) $("timer").setAttribute("aria-label", "Five minutes remaining");
        if (A.left <= 0) { A.left = 0; save(); finish(true); return; }
      }
      if (A.left % 5 === 0) save();
      drawTimer();
    }, 1000);
  }
  function stopTimer() { if (tick) clearInterval(tick); tick = null; }
  function drawTimer() {
    const t = $("timer"); if (!A) return;
    if (A.kind === "exam") { t.textContent = "⏱ " + fmtTime(A.left); t.classList.toggle("low", A.left <= 300); }
    else { t.textContent = A.kind === "practice" ? "Practice" : "Drill"; t.classList.remove("low"); }
  }

  function drawQ() {
    if (!A) return;
    const q = A.qs[A.i], a = A.answers[A.i], rev = instant() && A.shown[A.i];
    $("qhead").textContent = `Q${A.i + 1} of ${A.qs.length} · ${Exam.sectionLabel(q.section)}`;
    $("qtext").textContent = q.question;
    if (q.image) { $("qfig").classList.remove("hide"); $("qimg").src = q.image; $("qimg").alt = q.imageAlt || "Diagram"; }
    else { $("qfig").classList.add("hide"); $("qimg").removeAttribute("src"); }
    $("choices").innerHTML = q.options.map((o, k) => {
      let cls = "", mk = "";
      if (rev) { if (k === q.answerIndex) { cls = "right"; mk = '<span class="mk ok" aria-hidden="true">✓</span>'; } else if (k === a) { cls = "wrong"; mk = '<span class="mk no" aria-hidden="true">✗</span>'; } }
      return `<button type="button" class="opt ${cls}" role="radio" aria-checked="${a === k}" tabindex="${(a === null ? k === 0 : a === k) ? 0 : -1}" data-k="${k}" ${rev ? "disabled" : ""}><span class="l">${L[k]}</span><span>${esc(o)}</span>${mk}</button>`;
    }).join("");
    const ex = $("explain");
    if (rev) {
      ex.classList.remove("hide");
      ex.innerHTML = (a === q.answerIndex ? `<b class="ok">✓ Correct.</b> ` : `<b class="no">✗ Not quite. The answer is ${L[q.answerIndex]}.</b> `) + esc(q.explain);
    } else ex.classList.add("hide");
    $("flag").textContent = A.flags[A.i] ? "★ Flagged" : "☆ Flag";
    $("flag").setAttribute("aria-pressed", String(A.flags[A.i]));
    $("prev").disabled = A.i === 0;
    $("next").textContent = A.i === A.qs.length - 1 ? "Finish ›" : "Next ›";
    const n = A.answers.filter((x) => x !== null).length;
    $("progtxt").textContent = `${n}/${A.qs.length} answered`;
    $("progfill").style.width = (n / A.qs.length * 100) + "%";
    $("qmap").style.gridTemplateColumns = A.qs.length < 10 ? `repeat(${A.qs.length},1fr)` : "";
    $("qmap").innerHTML = A.qs.map((qq, k) => {
      const c = [];
      if (A.answers[k] !== null) c.push("ans");
      if (k === A.i) c.push("cur");
      if (A.flags[k]) c.push("flag");
      if (instant() && A.shown[k]) c.push(A.answers[k] === qq.answerIndex ? "r" : "w");
      return `<button type="button" class="${c.join(" ")}" data-n="${k}" aria-label="Question ${k + 1}${A.answers[k] !== null ? ", answered" : ""}${A.flags[k] ? ", flagged" : ""}" ${k === A.i ? 'aria-current="step"' : ""}>${k + 1}</button>`;
    }).join("");
    $("finish-confirm").classList.add("hide");
    drawTimer();
  }

  function choose(k) {
    if (!A || A.done || (instant() && A.shown[A.i])) return;
    A.answers[A.i] = k;
    if (instant()) A.shown[A.i] = true;
    save(); drawQ();
    const btn = document.querySelector(`#choices [data-k="${k}"]`); if (btn && !btn.disabled) btn.focus();
  }
  function go(i) { if (!A) return; A.i = Math.max(0, Math.min(A.qs.length - 1, i)); save(); drawQ(); }

  $("choices").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (b) choose(Number(b.dataset.k)); });
  $("choices").addEventListener("keydown", (e) => {
    const b = e.target.closest("[data-k]"); if (!b) return;
    const k = Number(b.dataset.k);
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault(); const n = (k + (e.key === "ArrowDown" ? 1 : 3)) % 4;
      const nb = document.querySelector(`#choices [data-k="${n}"]`); if (nb) nb.focus();
    }
  });
  $("qmap").addEventListener("click", (e) => { const b = e.target.closest("[data-n]"); if (b) go(Number(b.dataset.n)); });
  $("prev").onclick = () => go(A.i - 1);
  $("next").onclick = () => { if (A.i < A.qs.length - 1) { go(A.i + 1); window.scrollTo(0, 0); } else askFinish(); };
  $("flag").onclick = () => { A.flags[A.i] = !A.flags[A.i]; save(); drawQ(); };
  $("finish").onclick = askFinish;
  $("quit").onclick = () => $("quit-confirm").classList.remove("hide");
  $("quit-no").onclick = () => $("quit-confirm").classList.add("hide");
  $("quit-yes").onclick = () => { $("quit-confirm").classList.add("hide"); stopTimer(); Store.remove("attempt"); A = null; setHash("home"); renderHome(); show("home"); };
  $("qimgbtn").onclick = () => { $("lb-img").src = $("qimg").src; $("lb-img").alt = $("qimg").alt; openModal("m-image"); };

  document.addEventListener("keydown", (e) => {
    if (currentView() !== "quiz" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector(".modal:not([hidden])")) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    const k = e.key.toUpperCase();
    if ("1234".includes(k) && k.length === 1) { choose(Number(k) - 1); e.preventDefault(); }
    else if ("ABCD".includes(k) && k.length === 1) { choose(L.indexOf(k)); e.preventDefault(); }
    else if (e.key === "ArrowRight") { go(A.i + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { go(A.i - 1); e.preventDefault(); }
    else if (k === "F") { $("flag").click(); }
  });

  function askFinish() {
    const left = A.answers.filter((x) => x === null).length;
    const box = $("finish-confirm");
    if (left && box.classList.contains("hide")) {
      box.innerHTML = `${left} question${left > 1 ? "s" : ""} unanswered. Mark anyway? <button class="btn btn-secondary" id="fc-yes" type="button">Mark now</button> <button class="btn btn-ghost" id="fc-no" type="button">Keep going</button>`;
      box.classList.remove("hide");
      $("fc-yes").onclick = () => finish(false);
      $("fc-no").onclick = () => box.classList.add("hide");
      box.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    finish(false);
  }

  function finish(timeout) {
    stopTimer();
    const res = Exam.mark(A.qs, A.answers);
    A.done = true; A.timeout = timeout; A.result = res;
    // update learning stats
    A.qs.forEach((q, k) => {
      if (A.kind === "exam" || A.kind === "practice") seen[q.id] = (seen[q.id] || 0) + 1;
      else if (A.answers[k] !== null) seen[q.id] = (seen[q.id] || 0) + 1;
      if (A.answers[k] !== null || A.kind === "exam") {
        const s = (stats[q.id] = stats[q.id] || { seen: 0, correct: 0 });
        s.seen++; if (A.answers[k] === q.answerIndex) s.correct++;
      }
    });
    history.unshift({ date: Date.now(), kind: A.kind, label: A.label, right: res.right, total: res.total, pass: res.pass, code: A.code });
    history = history.slice(0, 30);
    Store.set("seen", seen); Store.set("stats", stats); Store.set("history", history); Store.remove("attempt");
    drawResults(); setHash("results"); show("results");
  }

  // ---------- results ----------
  function drawResults() {
    const r = A.result, full = A.qs.length === CONFIG.paperSize && (A.kind === "exam" || A.kind === "practice");
    $("r-label").textContent = A.label + (A.timeout ? " · time ran out" : "");
    $("r-score").textContent = `${r.right}/${r.total}`;
    $("r-verdict").innerHTML = r.pass ? '<span class="pass">✓ PASS</span>' : '<span class="fail">✗ NOT YET</span>';
    const used = A.kind === "exam" ? ` · time used ${Math.ceil((CONFIG.timeLimitSec - A.left) / 60)} min` : "";
    $("r-detail").textContent = `${r.percent}% · pass mark is ${full ? CONFIG.passMark + " (70%)" : "70%"}${r.unanswered ? ` · ${r.unanswered} unanswered` : ""}${used}`;
    $("r-code-row").classList.toggle("hide", !A.code);
    if (A.code) $("r-code").textContent = A.code;
    $("r-copied").textContent = "";
    $("r-sec").innerHTML = SECTION_ORDER.filter((s) => r.bySection[s]).map((s) => {
      const b = r.bySection[s], p = b.right / b.total;
      return `<tr><td>${esc(Exam.sectionLabel(s))}</td><td>${b.right}/${b.total}</td><td class="w35"><div class="meter"><i class="${p >= 0.7 ? "good" : "poor"}" style="width:${p * 100}%"></i></div></td><td><button class="btn btn-ghost small" data-drill="${s}" type="button">Drill</button></td></tr>`;
    }).join("");
    $("r-retry").classList.toggle("hide", !A.seed || A.kind === "weak");
    drawReview();
  }
  function drawReview() {
    const wo = $("wrong-only").checked;
    const html = A.qs.map((q, k) => {
      const a = A.answers[k], ok = a === q.answerIndex;
      if (wo && ok) return "";
      return `<div class="rev"><div class="muted small">Q${k + 1} · ${esc(Exam.sectionLabel(q.section))}</div>
        <div><b>${esc(q.question)}</b></div>
        ${q.image ? `<img src="${esc(q.image)}" alt="${esc(q.imageAlt || "Diagram")}" loading="lazy">` : ""}
        <div>Your answer: ${a === null ? '<span class="no">✗ not answered</span>' : `<span class="${ok ? "ok" : "no"}">${ok ? "✓" : "✗"} ${L[a]}. ${esc(q.options[a])}</span>`}</div>
        ${ok ? "" : `<div>Correct answer: <span class="ok">✓ ${L[q.answerIndex]}. ${esc(q.options[q.answerIndex])}</span></div>`}
        <div class="explain">${esc(q.explain)}</div></div>`;
    }).join("");
    $("review").innerHTML = html || '<p class="ok">✓ Every question correct. Nice work.</p>';
  }
  $("wrong-only").onchange = drawReview;
  $("r-sec").addEventListener("click", (e) => {
    const b = e.target.closest("[data-drill]"); if (!b) return;
    $("drill-sec").value = b.dataset.drill; setHash("home"); renderHome(); show("home");
    $("drill-go").scrollIntoView({ block: "center" }); $("drill-go").focus();
  });
  $("r-new").onclick = () => { homeMode = A.kind === "practice" ? "practice" : "exam"; startPaper(RNG.randomSeed(), false); };
  $("r-retry").onclick = () => {
    if (A.kind === "exam" || A.kind === "practice") {
      homeMode = A.kind; $("mix").checked = A.mix;
      const qs = Exam.generatePaper({ seed: A.seed, bank: BANK, mix: A.mix, ignoreHistory: true });
      begin({ kind: A.kind, label: A.label, seed: A.seed, code: A.code, mix: A.mix, qs });
    } else {
      const qs = A.qs.map((q) => Exam.makeInstance(BY_ID[q.id], RNG.mulberry32(RNG.randomSeed())));
      begin({ kind: A.kind, label: A.label, seed: A.seed, qs, section: A.section });
    }
  };
  const shareLink = (code) => location.href.replace(/#.*$/, "") + "#paper-" + code;
  $("r-copy").onclick = () => copy(shareLink(A.code), $("r-copied"));

  // ---------- instructor ----------
  let insPaper = null, insCode = null;
  $("ins-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const typed = $("ins-code").value.trim();
    const seed = typed ? RNG.codeToSeed(typed) : RNG.randomSeed();
    if (!seed) { $("ins-msg").textContent = "Invalid code."; $("ins-actions").classList.remove("hide"); return; }
    insCode = RNG.seedToCode(seed);
    insPaper = Exam.generatePaper({ seed, bank: BANK, mix: $("ins-mix").checked, ignoreHistory: true });
    $("ins-shown").textContent = insCode; $("ins-msg").textContent = "";
    $("ins-actions").classList.remove("hide");
    const p = $("ins-paper"); p.classList.remove("hide");
    p.innerHTML = `<h2>Paper ${esc(insCode)}${$("ins-mix").checked ? " (mixed)" : ""}</h2><p class="muted small">50 questions · 60 minutes · pass mark 35 (70%). Students will get this exact paper if they set "Mix sections" the same way.</p>` +
      insPaper.map((q, k) => `<div class="pq"><b>${k + 1}.</b> ${esc(q.question)}${q.image ? `<img src="${esc(q.image)}" alt="${esc(q.imageAlt)}">` : ""}<ol>${q.options.map((o) => `<li>${esc(o)}</li>`).join("")}</ol></div>`).join("") +
      `<h3>Answer key</h3><div class="keylist">${insPaper.map((q, k) => `<div>${k + 1}. ${L[q.answerIndex]}</div>`).join("")}</div>`;
  });
  $("ins-copy-p").onclick = () => insPaper && copy(`Standard Theory Practice Paper ${insCode}\n50 questions · 60 minutes · pass mark 35 (70%)\n\n` +
    insPaper.map((q, k) => `${k + 1}. ${q.question}${q.image ? `\n   [Diagram: ${q.imageAlt}]` : ""}\n` + q.options.map((o, j) => `   ${L[j]}. ${o}`).join("\n")).join("\n\n"), $("ins-msg"));
  $("ins-copy-k").onclick = () => insPaper && copy(`Paper ${insCode}: answer key\n\n` + insPaper.map((q, k) => `${k + 1}. ${L[q.answerIndex]}  ${q.explain}`).join("\n"), $("ins-msg"));
  $("ins-copy-l").onclick = () => insCode && copy(shareLink(insCode), $("ins-msg"));

  // ---------- helpers ----------
  async function copy(text, msgEl) {
    try { await navigator.clipboard.writeText(text); msgEl.textContent = "Copied."; }
    catch (e) {
      try {
        const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
        const ok = document.execCommand("copy"); ta.remove(); msgEl.textContent = ok ? "Copied." : "Copy blocked. Select the text and copy it.";
      } catch (e2) { msgEl.textContent = "Copy blocked. Select the text and copy it."; }
    }
  }
  let lastFocus = null;
  function openModal(id) {
    const m = $(id); lastFocus = document.activeElement; m.hidden = false;
    const f = m.querySelector("[data-close]"); if (f) f.focus();
  }
  function closeModal(m) {
    m.hidden = true;
    if (m.id === "m-formulas" && location.hash === "#formulas") history_replace(A && !A.done ? "quiz" : (currentView() || "home"));
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) closeModal(m); });
    m.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal(m);
      if (e.key === "Tab") { // focus trap
        const f = [...m.querySelectorAll("button,a,[tabindex]:not([tabindex='-1'])")]; if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  });
  document.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => openModal("m-" + b.dataset.open)));
  function radioArrows(group) {
    if (!group) return;
    group.addEventListener("keydown", (e) => {
      if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
      const items = [...group.querySelectorAll('[role="radio"]')], i = items.indexOf(document.activeElement);
      if (i < 0) return; e.preventDefault();
      const n = items[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length];
      n.focus(); n.click();
    });
  }

  if (!BANK.length) { document.querySelector("main").innerHTML = '<div class="card"><h2>Question bank not loaded</h2><p>data/questions.js is missing or has an error.</p></div>'; return; }
  route();
})();
