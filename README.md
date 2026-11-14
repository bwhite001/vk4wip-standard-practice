# Standard Theory Practice: Ipswich & District Radio Club (VK4WIP)

A free practice website for students on the club's **Standard Upgrade Course**. Every time a student starts, they get a **new random 50-question paper** built to the ACMA Standard syllabus (theory sections 3–8, 10 and 11). It runs entirely in the browser and is hosted free on GitHub Pages.

> Practice questions written for the club's Standard Upgrade Course. These are not official ACMA examination questions.

## What students can do

- **Exam mode**: 50 questions, 60-minute timer, marked at the end. Pass mark 35/50 (70%).
- **Practice mode**: no timer. The answer and explanation appear after each question.
- **Topic drill**: 10, 20 or all questions from one syllabus section.
- **Weak spots**: the questions they've got wrong most often.
- **Formula sheet**: the same formulas the ACMA hands out in the exam.
- **Progress**: how much of the bank they've seen, recent scores and section strengths.

Papers favour questions the student hasn't seen yet, so they work through the whole bank of **510 questions** (67 with diagrams) before seeing repeats.

Progress is stored **only in the student's own browser** on that device. There are no accounts and nothing is sent anywhere.

## Putting it online (one-time setup)

1. Create a new repository on GitHub (for example `standard-practice`) under the club's or your account.
2. Upload everything in this folder (drag and drop on the GitHub website works). Include the hidden `.github` folder and `.nojekyll`. If drag-and-drop skips them, use GitHub Desktop or `git`.
3. In the repository go to **Settings → Pages**. Under **Build and deployment → Source** choose **GitHub Actions**.
4. Go to the **Actions** tab. The *Deploy to GitHub Pages* run will start (or re-run it). When it's green, the site is live at:
   `https://<owner>.github.io/<repo>/`

The site needs a **public** repository on a free GitHub account. Private repos need a paid plan for Pages.

## Adding the club logo

Put the real club logo at `assets/logo.png` (around 120 px tall, transparent background works best). It appears in the header. If the file is missing, the header shows text only. Don't redraw or recolour the logo; use the official file.

## Changing the number of questions per section

Open `js/exam.js` and edit the `quota` numbers near the top. They must add up to 50. The automatic check (below) will fail if they don't.

## Sharing the same paper with a class

Every paper has a **paper code** (for example `K3F9QZ`). There are two ways to share one:

- Students enter the code on the home page, or open `https://<owner>.github.io/<repo>/#paper-K3F9QZ`.
- Instructors can go to **Instructor tools** (link in the footer) to make a paper, copy it as text to print, copy the answer key, or copy the student link.

A paper code gives the same questions in the same order to everyone, as long as the "Mix sections" box is set the same way.

## Editing questions

See **[CONTRIBUTING-QUESTIONS.md](CONTRIBUTING-QUESTIONS.md)**. In short: edit `data/questions.js` on GitHub, commit, and the automatic check makes sure nothing is broken before the site updates.

`review/questions_review.csv` lists every question in a spreadsheet, so an instructor can check them. **Please have the bank reviewed by the course instructor before promoting the site to students.** The calculation questions were generated and checked by script, but the wording and the other answers still need a person to check them.

## Automatic checks

Every change runs two checks (see the **Actions** tab):

- `tools/validate-questions.mjs` checks for missing answers, duplicate options or ids, missing images, and sections without enough questions.
- `tools/test-exam.mjs` checks that random papers have the right mix, papers are reproducible from their code, the 35/50 pass mark is applied correctly, and so on.

If a check fails, the site is **not** updated, so a typo can't take the live site down.

To run the checks on your own computer (needs Node.js 18+): `npm run check`.

## Files

```
index.html                  the website
css/style.css               look and feel (club colours)
js/app.js                   screens and buttons
js/exam.js                  paper generation and marking (quotas live here)
js/rng.js                   random numbers / paper codes
js/storage.js               saves progress in the browser
data/questions.js           THE QUESTION BANK
assets/questions/*.svg      diagrams used by questions
assets/logo.png             (add the club logo here)
tools/                      automatic checks
.github/workflows/          GitHub Actions: checks + publish to Pages
review/questions_review.csv the bank as a spreadsheet for reviewers
docs/PROMPT.md              the original build spec (for Claude Code or developers)
docs/ACMA_Standard_Syllabus_Feb2024.pdf   ACMA syllabus (CC BY 4.0)
```

---
Ipswich & District Radio Club, Inc. · VK4WIP
