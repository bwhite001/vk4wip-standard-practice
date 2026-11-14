// Unit tests for js/exam.js and js/rng.js. Run: node tools/test-exam.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const Exam = require(path.join(root, "js/exam.js"));
const RNG = require(path.join(root, "js/rng.js"));
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "data/questions.js"), "utf8"), ctx);
const BANK = ctx.window.QUESTIONS.filter((q) => !q.retired);
const BY_ID = Object.fromEntries(BANK.map((q) => [q.id, q]));
const quotas = Exam.quotas();
const silence = () => { const w = console.warn; console.warn = () => {}; return () => (console.warn = w); };

test("same seed gives an identical paper", () => {
  const a = Exam.generatePaper({ seed: 12345, bank: BANK });
  const b = Exam.generatePaper({ seed: 12345, bank: BANK });
  assert.deepEqual(a, b);
  const c = Exam.generatePaper({ seed: 12346, bank: BANK });
  assert.notDeepEqual(a.map((q) => q.id), c.map((q) => q.id));
});

test("paper has 50 questions with exact section quotas, grouped in syllabus order", () => {
  const p = Exam.generatePaper({ seed: 99, bank: BANK });
  assert.equal(p.length, 50);
  for (const [s, n] of Object.entries(quotas)) assert.equal(p.filter((q) => q.section === Number(s)).length, n, `section ${s}`);
  const order = p.map((q) => q.section);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test("mix option keeps quotas", () => {
  const p = Exam.generatePaper({ seed: 5, bank: BANK, mix: true });
  for (const [s, n] of Object.entries(quotas)) assert.equal(p.filter((q) => q.section === Number(s)).length, n);
});

test("answerIndex always points at the correct text", () => {
  for (let seed = 1; seed <= 200; seed++) {
    for (const q of Exam.generatePaper({ seed, bank: BANK })) {
      assert.equal(q.options[q.answerIndex], BY_ID[q.id].correct);
      assert.equal(q.options.length, 4);
    }
  }
});

test("1 000 random papers contain no duplicate ids", () => {
  for (let i = 0; i < 1000; i++) {
    const p = Exam.generatePaper({ seed: RNG.randomSeed(), bank: BANK });
    assert.equal(new Set(p.map((q) => q.id)).size, p.length);
  }
});

test("least-seen questions are always chosen first", () => {
  const sec = 11;
  const pool = BANK.filter((q) => q.section === sec);
  const fresh = pool.slice(0, quotas[sec]).map((q) => q.id);
  const seen = Object.fromEntries(BANK.map((q) => [q.id, 1]));
  fresh.forEach((id) => (seen[id] = 0));
  for (let seed = 1; seed <= 50; seed++) {
    const p = Exam.generatePaper({ seed, bank: BANK, history: { seen } });
    assert.deepEqual(p.filter((q) => q.section === sec).map((q) => q.id).sort(), [...fresh].sort());
  }
});

test("ignoreHistory makes shared codes reproducible regardless of history", () => {
  const seen = Object.fromEntries(BANK.slice(0, 200).map((q) => [q.id, 5]));
  const a = Exam.generatePaper({ seed: 777, bank: BANK, history: { seen }, ignoreHistory: true });
  const b = Exam.generatePaper({ seed: 777, bank: BANK });
  assert.deepEqual(a, b);
});

test("pass threshold is exactly 35 of 50", () => {
  const p = Exam.generatePaper({ seed: 3, bank: BANK });
  const ans = (n) => p.map((q, i) => (i < n ? q.answerIndex : (q.answerIndex + 1) % 4));
  assert.equal(Exam.mark(p, ans(35)).pass, true);
  assert.equal(Exam.mark(p, ans(34)).pass, false);
  assert.equal(Exam.mark(p, ans(35)).percent, 70);
});

test("marking handles unanswered questions", () => {
  const p = Exam.generatePaper({ seed: 4, bank: BANK });
  const answers = p.map((q, i) => (i % 2 ? null : q.answerIndex));
  const r = Exam.mark(p, answers);
  assert.equal(r.right, 25);
  assert.equal(r.unanswered, 25);
  assert.equal(r.pass, false);
});

test("drill returns the requested section and count", () => {
  const d = Exam.generateDrill({ seed: 8, bank: BANK, section: 7, count: 10 });
  assert.equal(d.length, 10);
  assert.ok(d.every((q) => q.section === 7));
  const all = Exam.generateDrill({ seed: 8, bank: BANK, section: 11, count: "all" });
  assert.equal(all.length, BANK.filter((q) => q.section === 11).length);
});

test("weakIds ranks the worst questions first", () => {
  const stats = { a: { seen: 4, correct: 0 }, b: { seen: 2, correct: 1 }, c: { seen: 3, correct: 3 } };
  assert.deepEqual(Exam.weakIds(stats), ["a", "b"]);
});

test("paper codes round-trip", () => {
  for (const s of [1, 123456, 4294967295, RNG.randomSeed()]) assert.equal(RNG.codeToSeed(RNG.seedToCode(s)), s);
  assert.equal(RNG.codeToSeed("bad code"), null);
});

test("too-small section warns but still returns what it has", () => {
  const restore = silence();
  const tiny = BANK.filter((q) => q.section !== 11).concat(BANK.filter((q) => q.section === 11).slice(0, 1));
  const p = Exam.generatePaper({ seed: 1, bank: tiny });
  restore();
  assert.equal(p.filter((q) => q.section === 11).length, 1);
});
