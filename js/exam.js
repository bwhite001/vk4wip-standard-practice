/* Paper generation and marking. Pure functions, no DOM. Browser: window.Exam. Node: module.exports. */
(function (root, factory) {
  const rng = (typeof module === "object" && module.exports) ? require("./rng.js") : root.RNG;
  const api = factory(rng);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Exam = api;
})(typeof self !== "undefined" ? self : this, function (RNG) {
  // ---- Club configuration: change quotas here (must total 50 for a full paper) ----
  const CONFIG = {
    paperSize: 50,
    passMark: 35,              // 70% of 50
    timeLimitSec: 60 * 60,     // 60 minutes
    sections: {
      3:  { label: "Mathematics",                   quota: 3 },
      4:  { label: "Technical basics",              quota: 14 },
      5:  { label: "Transmitters & receivers",      quota: 10 },
      6:  { label: "Transmission lines & antennas", quota: 7 },
      7:  { label: "Propagation",                   quota: 5 },
      8:  { label: "Interference & EMC",            quota: 5 },
      10: { label: "Safety",                        quota: 4 },
      11: { label: "Measurements",                  quota: 2 },
    },
  };
  const SECTION_ORDER = Object.keys(CONFIG.sections).map(Number).sort((a, b) => a - b);
  const quotas = () => Object.fromEntries(SECTION_ORDER.map((s) => [s, CONFIG.sections[s].quota]));
  const sectionLabel = (s) => `${s}. ${CONFIG.sections[s] ? CONFIG.sections[s].label : "Other"}`;

  function makeInstance(q, rand) {
    const opts = RNG.shuffle([q.correct, ...q.wrong], rand);
    return {
      id: q.id, section: q.section, question: q.question,
      options: opts, answerIndex: opts.indexOf(q.correct),
      explain: q.explain, image: q.image || null, imageAlt: q.imageAlt || "",
    };
  }

  // Pick n from pool, least-seen first (random within each seen-count group).
  function pickLeastSeen(pool, n, seen, rand) {
    const groups = new Map();
    for (const q of pool) {
      const k = (seen && seen[q.id]) || 0;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(q);
    }
    const out = [];
    for (const k of [...groups.keys()].sort((a, b) => a - b)) {
      for (const q of RNG.shuffle(groups.get(k), rand)) {
        if (out.length >= n) return out;
        out.push(q);
      }
    }
    return out;
  }

  /**
   * generatePaper({ seed, bank, history, quotas, mix })
   * history.seen = { id: count } (ignored when ignoreHistory is true, e.g. shared paper codes)
   */
  function generatePaper({ seed, bank, history = null, quotas: qz = quotas(), mix = false, ignoreHistory = false }) {
    const rand = RNG.mulberry32(seed);
    const live = bank.filter((q) => !q.retired);
    const seen = ignoreHistory || !history ? {} : history.seen || {};
    let paper = [];
    for (const s of SECTION_ORDER) {
      const want = qz[s] || 0;
      if (!want) continue;
      const pool = live.filter((q) => q.section === s).sort((a, b) => (a.id < b.id ? -1 : 1)); // stable base order
      if (pool.length < want && typeof console !== "undefined") console.warn(`Section ${s}: only ${pool.length} questions for quota ${want}`);
      const chosen = pickLeastSeen(pool, want, seen, rand);
      paper.push(...RNG.shuffle(chosen, rand));
    }
    if (mix) paper = RNG.shuffle(paper, rand);
    return paper.map((q) => makeInstance(q, rand));
  }

  // Drill: questions from one section (or a list of ids), least-seen first.
  function generateDrill({ seed, bank, section = null, ids = null, count = 10, history = null }) {
    const rand = RNG.mulberry32(seed);
    let pool = bank.filter((q) => !q.retired);
    if (ids) { const set = new Set(ids); pool = pool.filter((q) => set.has(q.id)); }
    if (section != null) pool = pool.filter((q) => q.section === section);
    pool.sort((a, b) => (a.id < b.id ? -1 : 1));
    const n = count === "all" ? pool.length : Math.min(count, pool.length);
    const chosen = ids ? RNG.shuffle(pool, rand).slice(0, n) : pickLeastSeen(pool, n, history ? history.seen : {}, rand);
    return RNG.shuffle(chosen, rand).map((q) => makeInstance(q, rand));
  }

  // Questions answered wrong most often (correct/seen ratio lowest, seen >= 1).
  function weakIds(stats, limit = 20) {
    return Object.entries(stats || {})
      .filter(([, v]) => v.seen >= 1 && v.correct < v.seen)
      .sort((a, b) => a[1].correct / a[1].seen - b[1].correct / b[1].seen || b[1].seen - a[1].seen)
      .slice(0, limit)
      .map(([id]) => id);
  }

  function mark(paper, answers) {
    let right = 0;
    const bySection = {};
    paper.forEach((q, i) => {
      const b = (bySection[q.section] = bySection[q.section] || { right: 0, total: 0 });
      b.total++;
      if (answers[i] === q.answerIndex) { right++; b.right++; }
    });
    const total = paper.length;
    return {
      right, total, unanswered: answers.filter((a) => a === null || a === undefined).length,
      percent: total ? Math.round((right / total) * 100) : 0,
      pass: total === CONFIG.paperSize ? right >= CONFIG.passMark : right / total >= CONFIG.passMark / CONFIG.paperSize,
      bySection,
    };
  }

  return { CONFIG, SECTION_ORDER, quotas, sectionLabel, generatePaper, generateDrill, weakIds, mark, makeInstance };
});
