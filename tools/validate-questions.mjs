// Validates data/questions.js. Run: node tools/validate-questions.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const Exam = require(path.join(root, "js/exam.js"));

const ctx = { window: {} };
vm.createContext(ctx);
try {
  vm.runInContext(fs.readFileSync(path.join(root, "data/questions.js"), "utf8"), ctx, { filename: "data/questions.js" });
} catch (e) {
  console.error("✗ data/questions.js has a syntax error:\n  " + e.message);
  process.exit(1);
}
const Q = ctx.window.QUESTIONS;
const errors = [];
const err = (q, m) => errors.push(`${q && q.id ? q.id : "?"}: ${m}`);
if (!Array.isArray(Q)) { console.error("✗ window.QUESTIONS is not an array"); process.exit(1); }

const allowed = new Set(Exam.SECTION_ORDER);
const ids = new Set(), combos = new Set();
for (const q of Q) {
  if (!q.id || typeof q.id !== "string") err(q, "missing id");
  else if (ids.has(q.id)) err(q, "duplicate id"); else ids.add(q.id);
  if (!allowed.has(q.section)) err(q, `section ${q.section} is not one of ${[...allowed].join(", ")}`);
  for (const f of ["question", "correct", "explain"]) if (typeof q[f] !== "string" || !q[f].trim()) err(q, `'${f}' is empty`);
  if (!Array.isArray(q.wrong) || q.wrong.length !== 3) err(q, "'wrong' must have exactly 3 answers");
  else {
    const opts = [q.correct, ...q.wrong].map((o) => String(o).trim());
    if (opts.some((o) => !o)) err(q, "an answer option is empty");
    if (new Set(opts).size !== 4) err(q, "two answer options are the same");
  }
  const key = (q.question || "") + "|" + (q.image || "");
  if (combos.has(key)) err(q, "same question text and image as another question"); else combos.add(key);
  if (q.image) {
    if (!fs.existsSync(path.join(root, q.image))) err(q, `image not found: ${q.image}`);
    if (!q.imageAlt) err(q, "image has no imageAlt");
  }
}
const live = Q.filter((q) => !q.retired);
const counts = {};
for (const s of Exam.SECTION_ORDER) {
  counts[s] = live.filter((q) => q.section === s).length;
  const want = Exam.CONFIG.sections[s].quota;
  if (counts[s] < want) errors.push(`Section ${s}: only ${counts[s]} live questions but the quota is ${want}`);
}
const total = Exam.SECTION_ORDER.reduce((a, s) => a + Exam.CONFIG.sections[s].quota, 0);
if (total !== Exam.CONFIG.paperSize) errors.push(`Quotas add up to ${total}, but paperSize is ${Exam.CONFIG.paperSize}`);

console.log(`Questions: ${Q.length} (${live.length} live, ${Q.length - live.length} retired, ${live.filter((q) => q.image).length} with diagrams)`);
for (const s of Exam.SECTION_ORDER) console.log(`  ${Exam.sectionLabel(s).padEnd(36)} ${String(counts[s]).padStart(4)}  (quota ${Exam.CONFIG.sections[s].quota})`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s):`);
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log("\n✓ Question bank is valid.");
