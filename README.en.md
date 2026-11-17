# BabyPaper · Pharmacy Edition

[中文](README.md) | **English**

When you read pharmacy papers, what usually stops you is a basic concept the authors assume you already know. Paste the passage you are stuck on. Every term the built-in glossary covers gets highlighted, and a click shows its definition, a plain-language explanation, and where it sits in the chain of reasoning.

It is a plain web page, with nothing to install and no account to create. Your text is processed in your own browser and is never uploaded.

Live version: <https://gustavpharm.github.io/babypaper/>

![Screenshot: a pasted passage on the left with glossary terms highlighted, and the term card for "prodrug" open on the right](docs/screenshot.jpg)

## What it does

- **Read and look up**: paste text, or import or drag in `.txt`, `.md` or `.pdf` files. Scanned PDFs and images can be run through OCR first. Glossary terms are highlighted in both Chinese and English text (English matching handles plurals and hyphenated spellings), and a click looks one up. Any other word can be looked up by selecting it. Mark a term as "mastered" once you know it and it stops being highlighted.
- **Term cards**: each card starts with a plain-language one-liner, then gives the textbook definition, why the term matters in papers, common misconceptions, its place in a logic chain, and finally a figure and the source. Extra sections stay collapsed until you open them.
- **Logic chains**: 9 chains that put scattered concepts in causal order, such as why nucleoside drugs need prodrugs, how to read an activity table, and what to check in a method validation. Every link in a chain opens the matching term.
- **Glossary**: 623 entries in 19 categories, including medicinal chemistry, pharmacology, pharmaceutical analysis, pharmaceutics, pharmacognosy, named reactions, common lab drugs and widely used medicines. Search by Chinese name, English name or abbreviation.
- **Local archive**: imported papers are saved in your browser automatically, up to 12 of them. Reopen one from "My Archive" and carry on reading without importing it again.
- **Red notes**: turn on the "✎ Red notes" switch, click anywhere in the text, and type. The note is inserted into the passage in red, saved with the archive, and can be edited or deleted later.
- **Experiment quick reference**: 49 cases, each summarised from one published paper, with the procedure, quantities, main hazards and a link to the original. Each describes what that one paper did. They are not general protocols.
- **Vocabulary book**: kept locally in the browser. You can test yourself with it or export it to Markdown or Anki cards.

It also has a dark mode and a phone layout, and everything works from the keyboard (press `/` to search the glossary).

## How to use it

**Online**: open the [live version](https://gustavpharm.github.io/babypaper/). To host your own copy, enable GitHub Pages for the repo (Settings → Pages → Deploy from a branch → `main` / root).

**Locally**: download the repo and open `index.html`. You can also start the bundled server:

```bash
node tools/serve.js
```

then open <http://127.0.0.1:8765>.

**As a single file**: to pass the whole tool to someone through a chat app, pack it into one HTML file:

```bash
node tools/build-single.js
```

The result is `dist/宝宝文献.html`, about 17 MB, with the styles, scripts, glossary and figures all inside.

> PDF import and OCR need a network connection, because the page loads [pdf.js](https://mozilla.github.io/pdf.js/) and [Tesseract.js](https://github.com/naptha/tesseract.js) from a CDN on demand. Everything else works offline.

## Put it on your phone

There are two ways. Pick either.

**PWA (recommended, no file to download)**
On Android, open the [live version](https://gustavpharm.github.io/babypaper/) in Chrome and choose "Install app" or "Add to Home screen" from the browser menu. On iPhone, open it in Safari, tap Share, then "Add to Home Screen". A 「宝」 icon appears on your home screen and the app opens full screen. After the first launch the glossary is cached on the phone, so it works without a connection.

**Android APK**
Download the latest `babypaper-v*.apk` from this repo's [Releases](../../releases/latest) page and open it on your phone to install. It is a signed release build, so you only need to allow the one-time "unknown source" prompt. You can also build it yourself: find "Build Android APK" on the repo's Actions tab, click Run workflow, and download `babypaper-apk` from the bottom of that run's page when it finishes.

To publish a new version, bump the version in `package.json`, write that version's notes in `docs/releases/` (named `v<version>.md`), then run the workflow with "release" ticked.

Once installed as an app, each launch plays an opening animation of under two seconds that writes the character 「宝」 and then opens the interface. Opening the site in a browser tab skips it.

## Repository layout

The web app itself is static, with no dependencies and no build step.

```
index.html              Page structure and UI copy
assets/css/app.css      Styles (design tokens at the top of the file)
assets/js/app.js        All interaction logic
assets/js/en-terms.js   Derivation rules for English term matching (pure functions, also runs in Node)
assets/figures/         Term figures (sources and licences in CREDITS.md)
assets/icons/           Icons for the web page and the PWA
android-icon-res/       Icons and launch images for the Android package
data/kb.js              Glossary, one JSON entry per line
data/chains.js          Logic chains
data/experiments.js     Experiment quick reference
tools/                  Local preview, data self-check, figure sizes, credits list, EN term list, single-file build, icon generator
docs/                   Glossary revision log and other documents
```

## Contributing

What the project needs most is content: new entries, corrected definitions, better sources, and openly licensed figures.

### Adding or editing an entry

Edit `data/kb.js`. Each line is one JSON object:

```json
{"w":"词条名","en":"English name","cat":"药理学","alias":"别名一；别名二","def":"基础定义……","plain":"一句话大白话。","use":"在文献里为什么重要……","trap":"常见误解……","chain":["上游词","词条名","下游词"],"src":"定义出处……"}
```

| Field | Required | Notes |
| --- | --- | --- |
| `w` / `en` / `cat` | yes | Entry name, English name, category |
| `def` / `plain` / `use` | yes | Definition, plain-language one-liner, why it matters in papers |
| `alias` | | Aliases separated by the full-width semicolon `；`; Chinese aliases take part in auto-highlighting |
| `trap` | | Common misconceptions |
| `extra` | | Extra sections, `[{"h":"heading","p":"body"}]` |
| `chain` | | Logic position: neighbouring terms in causal order, including the entry itself |
| `fig` / `figs` | | Figure `{img, cap, credit, link}`; `img` points to a file under `assets/figures/` |
| `figIdea` | | When no open figure exists yet, describe what the figure should show |
| `src` / `srclink` | | Definition source and an online reference link |
| `unverified` | | If the entry has not been checked against its source yet, say so here; the UI shows a "to verify" note |

House rules:

1. **Every definition needs a source.** Follow the standard wording in textbooks, guidelines or public references, and do not write from memory. If you are unsure, mark the entry `unverified`.
2. **Plain text only.** Do not put HTML in the fields. `1. …. 2. ….` in a body field is rendered as a list automatically.
3. **Figures must be openly licensed** (public domain, CC0, CC BY, CC BY-SA), with the author and licence recorded in `credit`. Illustrations from commercial textbooks are not accepted.
4. **The English name decides whether a term is found in English papers.** `en` and the English aliases are split into phrases and matched against the text, so `selectivity index (SI)` matches `selectivity index` and its plural. Abbreviations need at least 3 characters and are case-sensitive. After editing, print the full matching table to look for false matches; `--single` shows only the riskiest single words:

```bash
node tools/list-en-terms.js --single
```

   Common words that should not be highlighted on their own (such as assay or target) and abbreviations that collide easily (such as BET or PSA) go into the stop table at the top of `assets/js/en-terms.js`.

5. Run the self-check before submitting. If you added or removed figures, also regenerate the figure sizes and the credits list:

```bash
node tools/check-data.js
node tools/fig-sizes.js
node tools/build-credits.js
```

### Editing the UI

Edit `index.html`, `assets/css/app.css` and `assets/js/app.js`, then refresh the page. Design tokens such as colours, fonts and radii sit at the top of `app.css`, with a matching set for dark mode.

After deploying your own copy, set `CONFIG.repoUrl` at the top of `assets/js/app.js` to your repository URL and a GitHub link appears in the header.

The icons (home-screen icon, Android adaptive icon, favicon) are drawn by `tools/build-icons.js`, and the glyph geometry and colours are defined at the top of that script. Run `node tools/build-icons.js` after a change to re-export every size.

The opening animation uses the same glyph as the icon, so the same script generates its markup in the page. The motion is in the "开屏动画" section of `app.css`. Append `?splash` to the URL to preview it in a browser.

## Sources and disclaimer

- Definitions follow textbooks, ICH and pharmacopoeia guidelines, and public references. Every entry cites its source at the bottom of its card, and the app's "About" page lists them together. The one-liners and "why it matters" notes are plain-language paraphrases. **For formal citation, go back to the textbook or the original paper.**
- Named-reaction entries mainly follow the corresponding Wikipedia articles and the LibreTexts open textbooks.
- Each experiment case describes one paper's procedure only and is not a general protocol. The five scores are the editor's subjective impression, with no shared rubric behind them. Before doing any of it, read the original paper, check the reagents' SDS, and follow your lab's safety rules.
- Some sources still cite older textbook editions or the Chinese Pharmacopoeia 2020 and have not been rechecked against newer editions.
- This project is for study and discussion only. It is not medical or clinical advice.
- The log of batch revisions and corrections to the glossary is in [docs/词库修订记录.md](docs/词库修订记录.md) (in Chinese).

## Figures

Images in `assets/figures/` come from PubChem (public domain) and from Wikimedia Commons and OpenStax (public domain, CC0, CC BY, CC BY-SA). Copyright stays with the original authors. The author, licence and source link for each image are in [CREDITS.md](CREDITS.md).

## Acknowledgements

The layout and interaction patterns were inspired by the open-source projects Modureader, Yomitan, Skola, Elementro and Avogadro. Only design patterns were borrowed; none of their code or assets are used. PDF text extraction uses Mozilla's pdf.js, and OCR uses Tesseract.js.

## Licence

The repository is licensed in three parts:

| Part | Licence |
| --- | --- |
| Code: `index.html`, `assets/css/`, `assets/js/`, `tools/` | [MIT](LICENSE) |
| Content: the glossary, chains and experiment reference in `data/`, plus `docs/` and this file | [CC BY-SA 4.0](LICENSE-CONTENT.md) |
| Figures: `assets/figures/` | Each keeps its original licence, see [CREDITS.md](CREDITS.md) |

In short: use the code freely and keep the copyright notice. The content can be reused and adapted with attribution, and adaptations must also be released under CC BY-SA 4.0. Use each figure under its own licence.

The single-file build produced by `tools/build-single.js` contains all three parts, so all three licences apply when you forward or redistribute it.
