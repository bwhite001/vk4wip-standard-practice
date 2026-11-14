// Rebuilds the help-page screenshots (assets/help/*.png) and the printable guide (assets/help/guide.pdf).
// Run after changing anything a student sees:
//   npm i --no-save playwright && npx playwright install chromium && node tools/help-shots.cjs
// Optional: node tools/help-shots.cjs https://<owner>.github.io/<repo>/   (defaults to the local index.html)
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const URL = (process.argv[2] || "file://" + path.join(root, "index.html")).replace(/#.*$/, "");
const OUT = path.join(root, "assets/help");
const CODE = "1JSUL9K"; // fixed paper so the pictures don't change between runs
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const shot = async (name, locator) => { await p.waitForTimeout(150); await locator.screenshot({ path: path.join(OUT, name), animations: "disabled" }); console.log("✓", name); };
  const card = (sel) => p.locator(".card", { has: p.locator(sel) }).first();
  const clip = async (name, topSel, bottomSel) => {
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(150);
    const t = await p.locator(topSel).first().boundingBox(), bt = await p.locator(bottomSel).first().boundingBox();
    const y = t.y + (await p.evaluate(() => scrollY));
    await p.screenshot({ path: path.join(OUT, name), fullPage: true, clip: { x: 0, y, width: 390, height: bt.y + bt.height - t.y + 12 } });
    console.log("✓", name);
  };
  // pick the right (or a deliberately wrong) answer by matching the bank's text
  const answer = (right) => p.evaluate((right) => {
    const qt = document.getElementById("qtext").textContent;
    const btns = [...document.querySelectorAll("#choices [data-k]")];
    const shown = btns.map((x) => x.textContent.slice(1));
    // several questions share wording (e.g. the resistor colour codes), so match the options too
    const q = window.QUESTIONS.find((x) => x.question === qt && [x.correct, ...x.wrong].every((o) => shown.includes(o)));
    const want = q.correct;
    const b = btns.find((x) => (x.textContent.slice(1) === want) === right) || btns[0];
    b.click();
  }, right);
  const goQ = (i) => p.click(`#qmap [data-n="${i}"]`);
  const hasImg = () => p.locator("#qfig").isVisible();

  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();

  // 1. start card
  await shot("01-start.png", card("#start"));

  // 2-3. exam paper from the fixed code
  await p.goto(URL + "#paper-" + CODE); await p.click("#shared-go");
  let img = 0; for (let i = 0; i < 50; i++) { await goQ(i); if (await hasImg()) { img = i; break; } }
  for (let i = 0; i < 47; i++) { if (i === img) continue; await goQ(i); await answer(i % 9 !== 4); } // ~5 wrong, 3 left blank
  await goQ(img); await answer(true);
  await clip("02-question.png", "#bar", ".nav-btns");
  await goQ(12); await p.click("#flag"); await goQ(20);
  await p.click("#finish");
  await shot("03-map.png", card("#qmap"));
  await p.click("#fc-yes");

  // 5-6. results
  await clip("05-results.png", "#v-results .card", "#r-sec");
  await shot("06-review.png", p.locator("#review .rev").first());

  // 4. practice answer (wrong, to show both marks)
  await p.click('a[href="#home"]');
  await p.click('[data-mode="practice"]'); await p.click("#start");
  await answer(false);
  await clip("04-practice.png", "#v-quiz .card", "#explain");

  // 7-8. drill card, resume + progress (practice paper left open = resume card)
  await p.goto(URL + "#home"); await p.reload();
  await shot("07-drill.png", card("#drill-go"));
  await shot("08-resume.png", p.locator("#resume"));
  await shot("08-progress.png", card("#coverage-txt"));

  // 9. shared-paper banner
  await p.click("#resume-drop");
  await p.fill("#code-in", CODE); await p.click('#code-form button[type="submit"]');
  await shot("09-shared.png", p.locator("#shared-banner"));

  // 10. instructor
  await p.goto(URL + "#instructor");
  await p.fill("#ins-code", CODE); await p.click('#ins-form button[type="submit"]');
  await clip("10-instructor.png", "#v-instructor .card", "#ins-paper .pq:nth-of-type(2)");

  // printable guide
  const pdf = await b.newPage();
  await pdf.goto(URL + "#help"); await pdf.waitForLoadState("networkidle");
  await pdf.evaluate(() => Promise.all([...document.images].map((i) => i.complete || new Promise((r) => (i.onload = i.onerror = r)))));
  await pdf.pdf({ path: path.join(OUT, "guide.pdf"), format: "A4", margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" }, printBackground: true });
  console.log("✓ guide.pdf");

  if (errs.length) { console.error("Page errors:\n" + errs.join("\n")); process.exitCode = 1; }
  await b.close();
})();
