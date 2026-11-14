# Build: VK4WIP Standard Theory Practice Portal (GitHub Pages)

You are building a static practice-exam website for the **Ipswich & District Radio Club, Inc. (VK4WIP)** Standard Upgrade Course. It will be hosted on **GitHub Pages** from this repository. Students sit randomly generated 50-question practice papers for the **ACMA Standard recognition certificate theory exam**. Every sitting draws a different set of questions.

Read this whole brief before writing code. Then plan, scaffold, build, test, and report back. Ask me before departing from any **MUST** below.

## 0. Files supplied with this prompt

| File | What it is | How to use it |
|---|---|---|
| `data/questions.js` | **510 questions** (`window.QUESTIONS = [...]`): 3 Maths 30, 4 Technical basics 159, 5 Tx/Rx 98, 6 Lines & antennas 65, 7 Propagation 49, 8 Interference & EMC 49, 10 Safety 40, 11 Measurements 20. 67 of them have a diagram. | Keep at `/data/questions.js` unchanged. Do not reword questions. |
| `assets/questions/*.svg` | 63 SVG diagrams used by those 67 questions: component symbols, NPN/PNP/FET transistors, resistor colour-band pictures, resistor and capacitor networks, rectifier circuits, sine waves, filter response curves, transmitter and receiver block diagrams, antennas and ionosphere layers | Keep at `/assets/questions/`. Questions reference them by relative path. |
| `reference/standard_practice_exams.html` | Working single-file prototype (fixed papers, timer, marking, review, formula sheet) | Reuse its logic and visual style. The new site replaces its fixed papers with random generation. |
| `reference/ACMA_Standard_Syllabus_Feb2024.pdf` | Official ACMA syllabus and exam information (CC BY 4.0) | The source for exam rules, section names and the formula sheet. |

## 1. Scope

**In scope:** theory paper only. These are syllabus sections 3, 4, 5, 6, 7, 8, 10 and 11.

**Out of scope:** the regulations paper (sections 1–2), the practical (section 9), user accounts, a server, a database, analytics and paid services.

## 2. Hard constraints (MUST)

1. **Pure static site.** HTML, CSS and vanilla JavaScript (ES2020) only. No framework and no bundler. There must be **no build step needed to deploy**: GitHub Pages serves the repo as-is.
2. The site must work when `index.html` is opened directly from disk (`file://`). That means **no `fetch()` of local JSON**. Load the bank with a `<script src="data/questions.js">` tag.
3. No external requests except Google Fonts (Montserrat and Inter). The site must still be usable if fonts fail to load.
4. Add a `.nojekyll` file at the root.
5. All progress is stored in `localStorage` under the prefix `vk4wip-std:`. Every read and write is wrapped in try/catch. The site must work fully if storage is unavailable, for example in private browsing.
6. Use Australian English: licence (noun), practise (verb), colour, centre.
7. Show this disclaimer in the footer and on the home screen: *"Practice questions written for the club's Standard Upgrade Course. These are not official ACMA examination questions."*
8. Never use these names: "IDRC", "Ipswich Amateur Radio Club" or "Ipswich & District Amateur Radio Club". Use **Ipswich & District Radio Club** or **Ipswich & District Radio Club, Inc.**, callsign **VK4WIP**.
9. Do not generate, draw or recreate the club logo, the WIA logo or the WICEN logo. Leave an `assets/logo.png` slot and a `<img>` that is hidden if the file is missing. I will add the real file.
10. Meet WCAG 2.1 AA. Readers include members in their 80s, so text must be readable and buttons large.

## 3. Repository layout

```
/
├── index.html            # the app (single page, hash-routed)
├── css/style.css
├── js/
│   ├── app.js            # routing, screens, state
│   ├── exam.js           # paper generation, marking (pure functions, no DOM)
│   ├── storage.js        # safe localStorage wrapper
│   └── rng.js            # seeded PRNG (mulberry32) + shuffle
├── data/questions.js     # the bank (supplied)
├── assets/logo.png       # placeholder slot, not committed by you
├── tools/
│   ├── validate-questions.mjs  # Node script: validates the bank
│   └── test-exam.mjs           # Node unit tests for exam.js
├── .github/workflows/
│   ├── validate.yml      # runs both tools on every push/PR
│   └── pages.yml         # deploys to GitHub Pages from main (actions/deploy-pages)
├── .nojekyll
├── README.md             # for club volunteers (see §11)
└── CONTRIBUTING-QUESTIONS.md  # how to add or fix a question (see §11)
```

`exam.js` and `rng.js` must be importable by Node for tests and also usable in the browser. Use a small UMD-style pattern or attach to `window`, so that **no build step** is needed.

## 4. Data model

Each entry in `window.QUESTIONS`:

```js
{
  id: "P1-07",            // unique, stable. Never reuse a deleted id.
  section: 4,             // one of 3,4,5,6,7,8,10,11
  question: "string",
  correct: "string",      // the right answer
  wrong: ["a","b","c"],   // exactly three wrong answers
  explain: "string"       // shown after answering / in review
}
```

Optional fields you must support if present: `image` (a path under `assets/questions/`, shown above the options with `alt` taken from `imageAlt`), and `retired: true` (the question is excluded from draws).

**Diagram questions (MUST render well):**

- Show `image` between the question text and the options, inside a white panel with a 1px `--border` and a 10px radius.
- Width is 100% of the card, up to the SVG's natural width. Height is auto. Never upscale beyond 1.5× the natural size.
- Set `alt` from `imageAlt`. Some colour-band images print the band colour names underneath the picture for colour-blind students. Keep that text visible.
- Tapping the image opens it enlarged in an in-page lightbox (Esc or tap to close).
- Preload the images for the current paper when it is generated, so there is no layout jump.
- Images appear in the review list and on the instructor paper too. In "Copy as text" output, write `[Diagram: <imageAlt>]`.
- The diagrams are white-background SVGs. Do not invert or recolour them.

Section labels:

| # | Label | Questions per paper |
|---|---|---|
| 3 | Mathematics | 3 |
| 4 | Technical basics | 14 |
| 5 | Transmitters & receivers | 10 |
| 6 | Transmission lines & antennas | 7 |
| 7 | Propagation | 5 |
| 8 | Interference & EMC | 5 |
| 10 | Safety | 4 |
| 11 | Measurements | 2 |
| | **Total** | **50** |

Keep the section labels and quotas in one config object at the top of `exam.js`. The ACMA does not publish a per-section split: these quotas are the club's own weighting, so make them easy to change.

## 5. Exam rules (from the ACMA syllabus)

- A paper has 50 multiple-choice questions with 4 options each.
- The time limit is **60 minutes** in Exam mode.
- The pass mark is **70% = 35 of 50**.
- The ACMA formula sheet is available during the exam, so the site provides it in every mode (see §8.6).

## 6. Paper generation (the core feature)

`generatePaper({ seed, quotas, bank, history })` returns an ordered list of question instances. Each instance holds `{ id, section, question, options[4], answerIndex, explain }`.

Algorithm:

1. Exclude `retired` questions.
2. For each section, take `quotas[section]` questions. **Prefer the questions this browser has seen least.** Group the candidates by seen count (from `history.seen[id]`, default 0) and fill from the lowest-count group upwards, picking randomly inside each group. A student therefore works through the whole bank before repeats become common.
3. Order the paper by section in syllabus order (3, 4, 5 …), with the order shuffled inside each section. This mirrors the real paper's grouping. Offer a "Mix sections" option that shuffles the whole paper instead.
4. Shuffle each question's four options independently.
5. Everything is driven by a **seeded PRNG** (mulberry32). The seed is a random 32-bit integer by default.
6. **Shareable papers:** the paper code is the seed in base-36, shown on screen as, for example, `Paper code K3F9QZ`. Visiting `#paper-K3F9QZ` regenerates exactly the same paper and option order, **ignoring seen-history**. An instructor can then give a whole class the same paper. Add a "Copy paper link" button.
   - Hash routing rule: use only plain `#name` hashes built from ASCII letters, digits and hyphens. Never use `#/path` or `?query`.
7. If a section has fewer questions than its quota, use all of them and show a dev-console warning. The validator (§10) must fail the build in that case.

When a paper is finished, increment `seen[id]` for every question on it and record whether each was answered correctly (`stats[id] = {seen, correct}`).

## 7. Modes

| Mode | Timer | Feedback | Paper |
|---|---|---|---|
| **Exam** | 60:00 countdown. Auto-marks at 0:00. Warns visually at 5:00. | Only at the end | Random 50 using the §6 quotas |
| **Practice** | No timer (an elapsed-time counter only) | Right/wrong and the explanation straight after each answer | Random 50 using the §6 quotas |
| **Topic drill** | None | Immediate | 10, 20 or all questions from one chosen section, least-seen first |
| **Weak spots** | None | Immediate | Up to 20 questions this browser has got wrong most often (lowest correct/seen ratio, at least 1 seen). Disabled until there is history. |

## 8. UI design

### 8.1 Brand tokens (MUST use these exact values as CSS custom properties)

```css
:root{
  --brand-blue:#1E5CB3;  /* links, accents, focus, selected states */
  --brand-navy:#0B2D53;  /* header, headings */
  --brand-gold:#D4AF37;  /* PRIMARY button background (ink text), accents */
  --brand-red:#CC0000;   /* wrong answers, timer warning, fail */
  --ink:#222A35; --muted:#5A6579;  /* body / secondary text (muted holds 4.5:1, never lighten) */
  --paper:#F7F8FB; --white:#FFFFFF; --border:#E0E6F0;
  --band:#EEF3FA; --surface-alt:#E9F2FF;
  --ok:#1B7F3B; --ok-bg:#E8F5EC; --bad-bg:#FCEAEA;
  --radius-md:10px; --radius-lg:12px;
  --shadow-1:0 2px 10px rgba(0,0,0,.08);
  --font-heading:Montserrat,sans-serif;   /* weights 600/700/800 only */
  --font-body:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
}
```

Button rules:

- **Primary** buttons have a gold background and ink text. They are uppercase, weight 800, letter-spacing 0.6px, with a 10px radius. Not pill-shaped, and not blue.
- **Secondary** buttons have a white background with a 2px navy border and navy text.
- **Ghost** buttons are blue text with no border.
- Never use font-weight 900.

The visual style should match `reference/standard_practice_exams.html`: a navy header with a 4px gold bottom border, white cards on a pale paper background, and Montserrat headings in navy.

### 8.2 Layout and responsiveness

- Design mobile-first (most students will use phones). The content column has a max width of 860px and is centred.
- Tap targets are at least 44px tall. Body text is 16px. Question text is 18px (17px under 520px wide).
- On the quiz screen there is a sticky top bar: timer, progress bar and "n/50 answered", plus a "Formulas" button.

### 8.3 Screens (hash routes)

**`#home`** (default)

```
┌───────────────────────────────────────────────┐
│ [logo] STANDARD UPGRADE COURSE · VK4WIP       │  navy header, gold kicker text
│ Standard Theory Practice                      │
│ Random 50-question papers · ACMA syllabus     │
└════════════════ gold 4px rule ════════════════┘
┌ Card: Start a paper ──────────────────────────┐
│ ( Exam mode  )  ( Practice mode )             │  two large toggle cards
│ ☐ Mix sections (default: grouped by section)  │
│ [ START RANDOM PAPER ]  (gold)                │
│ Have a paper code? [______] [Open]            │
└───────────────────────────────────────────────┘
┌ Card: Drill a topic ──────────────────────────┐
│ [Section ▼]  [10|20|All]  [ START DRILL ]     │
│ [ Weak spots (12) ]                           │
└───────────────────────────────────────────────┘
┌ Card: Your progress (this device) ────────────┐
│ Bank coverage: 128 / 192 seen  ▓▓▓▓▓▓░░░      │
│ Last 5 attempts: date · mode · score · ✓/✗    │
│ Section strength bars (based on all answers)  │
│ [Reset my progress] (confirm in-page)         │
└───────────────────────────────────────────────┘
┌ Card: About the exam ─────────────────────────┐
│ 50 Q · 60 min · pass 35 (70%) · quota table   │
│ Disclaimer                                    │
└───────────────────────────────────────────────┘
```

**`#quiz`** (one question at a time)

```
[sticky] ⏱ 47:12  ▓▓▓▓▓░░░░░  23/50 answered   Formulas
┌───────────────────────────────────────────────┐
│ Q23 of 50 · 6. Transmission lines   ☆ Flag    │
│ The velocity factor of a transmission line is:│
│ ┌ A │ Always less than 1 ───────────────────┐ │  big full-width option buttons
│ ┌ B │ ...                                   │ │  role="radio", A–D badge
│ ┌ C │ ...                                   │ │
│ ┌ D │ ...                                   │ │
│ (Practice: green/red states + explanation)    │
│ [‹ Back]                         [Next ›]     │
└───────────────────────────────────────────────┘
┌ Question map: 50 numbered squares ────────────┐
│ answered = blue fill · current = navy outline │
│ flagged = gold underline · practice: ✓ green ✗ red │
│ [ FINISH & MARK ]   Quit (confirm)            │
└───────────────────────────────────────────────┘
```

- Keyboard: `1`–`4` or `A`–`D` choose an option, `←`/`→` move between questions, `F` flags.
- Finishing with unanswered questions shows an **in-page** confirmation strip ("7 unanswered. Mark anyway?"). Never use `alert` or `confirm`.
- Quitting asks for in-page confirmation. The attempt in progress is saved to storage so that a page reload offers "Resume your paper".

**`#results`**

- Large score `38/50`, then **PASS** (green) or **NOT YET** (red), the percentage, the pass mark, time used and the paper code with a "Copy paper link" button.
- A table of results by section, with a bar for each. Bars under 70% are red, 70% and over are green. Each row links to "Drill this topic".
- Answer review: wrong and unanswered questions are shown by default, with a toggle to show all. For each one, show your answer, the correct answer and the explanation.
- Buttons: **New random paper** (primary), Retry same paper (secondary), Home (ghost).

**`#paper-XXXXXX`**: a shared paper. It shows a small banner, "Shared paper K3F9QZ", and then opens the mode chooser.

**`#formulas`**: also opens as an in-page modal from any screen. The modal traps focus and closes with Esc or the close button.

### 8.4 States and feedback

- A selected option has a blue border and a surface-alt fill. In Practice mode, after answering, the correct option is green, a wrong chosen option is red, and the options lock.
- Never rely on colour alone. Add a ✓ or ✗ icon and the text "Correct" or "Not quite. The answer is C."
- Use `aria-live="polite"` for feedback text and the timer warning.

### 8.5 Instructor tools (low-key)

The footer has a link to `#instructor`. That screen generates a paper from a typed or random seed. It shows the full paper and its answer key as plain text, with Copy buttons, so instructors can print it. It is not hidden for security reasons: the bank is public in the repo anyway.

### 8.6 Formula sheet content

Reproduce the ACMA sheet:

- R<sub>T</sub> = R1+R2+R3 and 1/R<sub>T</sub> = 1/R1+1/R2+1/R3
- The same two formulas for L
- C<sub>T</sub> = C1+C2+C3 (parallel) and 1/C<sub>T</sub> = … (series)
- E = IR, I = E/R, R = E/I
- P = EI, P = E²/R, P = I²R
- p = 1/f, f = 1/p
- λ = c/f
- Amplifier efficiency % = Power out / Power in × 100

Then add a separate "Handy extras (not on the ACMA sheet)" block:

- RMS = 0.707 × peak
- λ(m) ≈ 300 / f(MHz)
- +3 dB ≈ ×2, +6 dB ≈ ×4, +10 dB = ×10
- OWF ≈ MUF − 15%
- The resistor colour code, with gold ±5%, silver ±10% and no band ±20%

## 9. Accessibility checklist (MUST)

- Semantic landmarks, a skip link, and one `h1` per screen.
- `:focus-visible` outline: 3px solid `--brand-blue`.
- Options use `role="radiogroup"` and `role="radio"` with `aria-checked`. Arrow keys move within the group.
- All text meets 4.5:1 contrast. Respect `prefers-reduced-motion`.
- The page is usable at 200% zoom and at 320px width with no horizontal scroll.

## 10. Quality gates

`tools/validate-questions.mjs` loads `data/questions.js` in Node through a `vm` sandbox with a fake `window`. It **fails** if any of these are true:

- an id is duplicated
- a section is not in the allowed set
- `wrong` does not have exactly 3 entries
- an option is duplicated within a question, or an option is empty
- the same question text and image appear twice (diagram questions deliberately share wording such as "The circuit symbol shown is a:", so the duplicate check is on question + image)
- any non-retired section has fewer questions than its quota
- any `image` path does not exist

It prints the number of questions per section.

`tools/test-exam.mjs` uses `node:test` and checks that:

- the same seed always gives an identical paper
- every paper has 50 questions with the exact quotas
- `answerIndex` always points at the `correct` text
- least-seen preference works: after marking every question seen once except 5 in a section, those 5 are always chosen first
- the pass threshold is exactly 35
- 1 000 random papers contain no duplicate ids within a paper
- marking handles unanswered questions

GitHub Actions:

- `validate.yml` runs both scripts on every push and pull request.
- `pages.yml` deploys the repo root to Pages on push to `main`, but only if validation passes. Use `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages`.

Finally, before finishing, open the site in a headless browser (Playwright, if it is available locally, as a dev-only check that is not committed as a dependency). Complete one Exam-mode paper and one Practice-mode paper. Check there are no console errors. Take screenshots at 390px and 1280px wide, including at least one diagram question, and show them to me.

## 11. Documentation

`README.md` is written for non-programmer club volunteers. It covers:

1. What the site is.
2. The live URL pattern: `https://<owner>.github.io/<repo>/`.
3. How to turn on Pages: Settings → Pages → Source: **GitHub Actions**.
4. How to add the logo.
5. How to change the quotas.
6. How sharing a paper code works.
7. That progress is stored only on each student's device.

`CONTRIBUTING-QUESTIONS.md` covers:

- editing `data/questions.js` in the GitHub web editor
- a copy-paste template for a new question
- the rules: three wrong answers; plausible distractors; one clearly correct answer; an explanation that teaches; Australian English; check the answer against the ACMA syllabus and course notes
- that you retire a question instead of deleting it, so ids stay stable
- that the validation check must go green before the change goes live

## 12. Acceptance criteria

- [ ] Diagram questions display their image, enlarge on tap, and show it in the review.

- [ ] Two random Exam papers in a row are different, and the bank coverage on the home screen grows.
- [ ] `#paper-<code>` reproduces the same paper on another browser.
- [ ] The timer auto-marks at 0:00. Reloading mid-paper offers to resume.
- [ ] A score of 35/50 shows PASS and 34/50 shows NOT YET.
- [ ] Topic drill and Weak spots work. Weak spots is disabled with no history.
- [ ] The site works from `file://` and with localStorage blocked.
- [ ] Validation and tests pass in CI. Pages deploys.
- [ ] There is no `alert`, `confirm` or `prompt`, and no external requests except Google Fonts.
- [ ] Lighthouse accessibility score is ≥ 95 on the home and quiz screens.

## 13. Working order

1. Scaffold the repo and copy in `data/questions.js` and `assets/questions/`.
2. Write `rng.js`, `exam.js` and the tests, and get them passing.
3. Write the validator.
4. Build the UI screens (start from the prototype's CSS and markup patterns).
5. Add storage, resume, history and the progress card.
6. Add the instructor screen and the formula modal.
7. Add CI workflows and the docs.
8. Run the headless check and take screenshots. Then summarise what was built, anything you could not do, and the exact steps for me to enable Pages.

Commit in logical steps with clear messages. Do not push or create the GitHub repo until I confirm the owner and repo name.
