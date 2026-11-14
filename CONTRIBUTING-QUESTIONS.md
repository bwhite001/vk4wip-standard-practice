# Adding or fixing questions

All questions live in **`data/questions.js`**. You can edit it directly on the GitHub website: open the file, click the pencil icon, make the change, then **Commit changes**. The site checks your edit automatically and only updates if the check passes. You'll see a green tick or a red cross in the **Actions** tab.

## The format

Each question is one line between `{` and `}`, followed by a comma:

```js
  {"id":"M-124","section":6,"question":"The feedpoint impedance of a half-wave dipole is approximately:","correct":"73 Ω","wrong":["36 Ω","300 Ω","600 Ω"],"explain":"About 73 Ω. A folded dipole is about 300 Ω."},
```

| Field | What to put |
|---|---|
| `id` | A unique code. For new questions use the next free `M-` number (search the file to check). **Never reuse an id**, even from a deleted question. |
| `section` | The syllabus section: 3 Maths · 4 Technical basics · 5 Transmitters & receivers · 6 Lines & antennas · 7 Propagation · 8 Interference & EMC · 10 Safety · 11 Measurements |
| `question` | The question text. |
| `correct` | The one right answer. |
| `wrong` | **Exactly three** wrong answers, in square brackets. |
| `explain` | One or two sentences that *teach* why the answer is right. |
| `image` *(optional)* | A diagram file, for example `"assets/questions/my-diagram.svg"`. Upload the file into `assets/questions/` first. |
| `imageAlt` *(optional, required if there's an image)* | A short description of the diagram for screen readers. Don't give the answer away. |
| `retired` *(optional)* | `true` hides the question from papers without deleting it. |

The site **shuffles the four options every time**, so it doesn't matter where the correct answer sits, and you should never write "All of the above" or "Both A and B".

### Copy-paste template

```js
  {"id":"M-XXX","section":0,"question":"","correct":"","wrong":["","",""],"explain":""},
```

## Rules for good questions

1. **One clearly correct answer.** It must be checkable against the ACMA Standard syllabus and the course notes.
2. **Plausible wrong answers.** Use common mistakes, such as the series answer when the circuit is in parallel, or ×10 instead of ÷10.
3. **Check every calculation twice**, with a calculator.
4. **Australian English and units**: licence, colour, 230 V 50 Hz, Ω, µF, MHz. Leave a space between a number and its unit.
5. **Theory only.** Regulations (sections 1–2) and operating practice (section 9) are not in this bank.
6. Use quotes `"` around text. If your text itself needs a double quote, write `\"`. Single quotes (') are fine as they are.

## Removing a question

Don't delete it. Add `"retired":true`:

```js
  {"id":"P1-07","retired":true,"section":4, ...},
```

That keeps ids stable, so students' saved progress still lines up.

## If the check fails

Open the failed run in the **Actions** tab. The message says which question id is wrong and why (for example "'wrong' must have exactly 3 answers"). Fix it and commit again. The live site keeps running the last good version in the meantime.
