# BabyPaper · Pharmacy Edition

[中文](README.md) | **English**

Stuck on a basic concept while reading a paper? Paste the passage in — terms covered by the built-in glossary are highlighted automatically. Click one and you get **the definition, a plain-language explanation, and where the concept sits in the overall logic**.

Pure front-end, zero dependencies, no build step. Your literature is processed entirely in your browser and never uploaded.

![Screenshot](docs/screenshot.jpg)

## Features

- **Read & look up**: paste text, or import / drag in `.txt`, `.md` or `.pdf` files; scanned PDFs and images can be OCR'd. Glossary terms are highlighted automatically in **both Chinese and English text** (English matching handles plurals and hyphenated variants). Click a highlighted term to look it up; select any other word to look that up instead. Terms you already know can be marked "mastered" and stop being highlighted.
- **Term cards**: a plain-language one-liner, the textbook definition, why it matters in papers, common misconceptions, its position in the logic chain, a figure, and the source. Extra sections stay collapsed by default.
- **Local archive**: imported papers are saved automatically in your browser (up to 12). Reopen one from "My Archive" and keep reading — no need to import again.
- **Red notes**: flip the "✎ Red notes" switch, click anywhere in the text, and type. Your note is inserted into the passage in red type, saved together with the archive, and can be edited or deleted later.
- **Logic chains**: 9 causal chains that string scattered concepts together (nucleoside prodrugs, how to read an activity table, method validation, …); every link opens the related term.
- **Glossary**: 623 entries across 17 categories — medicinal chemistry, pharmacology, pharmaceutical analysis, pharmaceutics, pharmacognosy, named reactions, common lab drugs and widely used medicines. Searchable by Chinese name, English name or abbreviation.
- **Experiment quick reference**: 49 cases, each summarised from one published paper — procedure, quantities, main hazards and a link to the original. They describe what that one paper did; they are not general protocols.
- **Vocabulary book**: saved locally in the browser; self-test mode included; exportable to Markdown or Anki cards.
- Dark mode, mobile layout, keyboard friendly (press `/` to search the glossary).

## Usage

**Online**: enable GitHub Pages for the repo (Settings → Pages → Deploy from a branch → `main` / root) and open the resulting URL. A live instance runs at <https://gustavpharm.github.io/babypaper/>.

**Local**: download the repo and open `index.html`, or start the bundled server:

```bash
node tools/serve.js
```

then open <http://127.0.0.1:8765>.

**Single-file offline build** — one self-contained file you can forward (e.g. via chat apps):

```bash
node tools/build-single.js
```

The result is `dist/宝宝文献.html` (~16 MB, styles, scripts, data and figures all inlined).

> PDF import and OCR load [pdf.js](https://mozilla.github.io/pdf.js/) and [Tesseract.js](https://github.com/naptha/tesseract.js) from a CDN on demand, so those two steps need a network connection. Everything else works fully offline.

## Install it as a phone app

Two ways — pick either:

**Option 1: PWA (recommended, no file to download)**
On Android, open the [live site](https://gustavpharm.github.io/babypaper/) in Chrome and choose "Install app" or "Add to Home screen" from the browser menu. On iPhone, open it in Safari, tap Share, then "Add to Home Screen". You get the 「宝」 icon on your home screen, full-screen use, and — after the first open — the glossary is cached on-device and works offline.

**Option 2: Android APK**
Download `babypaper-v1.0.0.apk` from this repo's [Releases](../../releases) page and open it on your phone to install (it is debug-signed, so allow the one-time "unknown source" prompt). You can also build it yourself: the repo ships a manually triggered GitHub Actions workflow, "Build Android APK" — run it from the Actions tab and download the `babypaper-apk` artifact at the bottom of the run page.

## Repository layout

```
index.html              Page structure and UI copy
assets/css/app.css      Styles (design tokens at the top of the file)
assets/js/app.js        All interaction logic
assets/js/en-terms.js   Derivation rules for English term matching (pure functions, also runs in Node)
assets/figures/         Term figures (sources and licences in CREDITS.md)
data/kb.js              Glossary, one JSON entry per line
data/chains.js          Logic chains
data/experiments.js     Experiment quick reference
tools/                  Local preview, data self-check, figure sizes, credits list, EN term list, single-file build
docs/                   Glossary revision log and other documents
```

## Contributing

The most useful contributions are **content**: new entries, corrected definitions, better sources, and openly licensed figures.

### Adding or editing an entry

Edit `data/kb.js` — one JSON object per line:

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

1. **Every definition needs a source.** Transcribe the standard wording from textbooks, guidelines or public references — never from memory. If unsure, mark the entry `unverified`.
2. **Plain text only.** No HTML inside fields; `1. …. 2. ….` in a body field is rendered as a list automatically.
3. **Figures must be openly licensed** (public domain, CC0, CC BY, CC BY-SA) with author and licence recorded in `credit`. No commercial textbook illustrations.
4. **The English name drives matching in English papers.** `en` and English aliases are split into phrases matched against the text: `selectivity index (SI)` matches `selectivity index` and its plural; abbreviations need 3+ characters and are case-sensitive. Print the full table to check for false matches (`--single` shows only the riskiest single words):

```bash
node tools/list-en-terms.js --single
```

   Common words that should never be highlighted on their own (e.g. assay, target) and collision-prone abbreviations (e.g. BET, PSA) go into the stop table at the top of `assets/js/en-terms.js`.

5. Run the self-check before submitting; after adding or removing figures, regenerate figure sizes and the credits list:

```bash
node tools/check-data.js
node tools/fig-sizes.js
node tools/build-credits.js
```

### Editing the UI

No build step: edit `index.html`, `assets/css/app.css`, `assets/js/app.js` and refresh. Design tokens (colours, fonts, radii) live at the top of `app.css`, with a matching set for dark mode.

After publishing your fork, set `CONFIG.repoUrl` at the top of `assets/js/app.js` to your repository URL and a GitHub link appears in the header.

## Sources and disclaimer

- Definitions are transcribed from textbooks, ICH / pharmacopoeia guidelines and public references; every entry cites its source at the bottom of its card, and the app's "About" page collects them. The one-liners and "why it matters" notes are plain-language paraphrases. **For formal citation, always go back to the textbook or the original paper.**
- Named-reaction entries mainly follow the corresponding Wikipedia articles and the LibreTexts open textbooks.
- Each experiment case describes one paper's procedure only — not a general protocol. The five scores are the editor's subjective impression with no unified rubric. Before doing any of it, read the original paper, check the reagents' SDS, and follow your lab's safety rules.
- Some sources still cite older textbook editions or the Chinese Pharmacopoeia 2020; they have not all been rechecked against the newest editions.
- This project is for study and discussion. It is not medical or clinical advice.
- The glossary's batch revision and correction log is in [docs/词库修订记录.md](docs/词库修订记录.md) (Chinese).

## Figures

Images in `assets/figures/` come from PubChem (public domain) and Wikimedia Commons / OpenStax (public domain, CC0, CC BY, CC BY-SA). Copyright stays with the original authors; per-image author, licence and source links are in [CREDITS.md](CREDITS.md).

## Acknowledgements

The layout and interaction patterns were inspired by the open-source projects Modureader, Yomitan, Skola, Elementro and Avogadro (design patterns only — no code or assets were used). PDF text extraction uses Mozilla's pdf.js; OCR uses Tesseract.js.

## Licence

The repository is licensed in three parts:

| Part | Licence |
| --- | --- |
| Code: `index.html`, `assets/css/`, `assets/js/`, `tools/` | [MIT](LICENSE) |
| Content: the glossary, chains and experiment reference in `data/`, plus `docs/` and this file | [CC BY-SA 4.0](LICENSE-CONTENT.md) |
| Figures: `assets/figures/` | Each keeps its original licence, see [CREDITS.md](CREDITS.md) |

In short: use the code freely and keep the copyright notice; reuse and adapt the content with attribution, and share adaptations under CC BY-SA 4.0; use each figure under its own licence.

The single-file build produced by `tools/build-single.js` contains all three parts, so all three licences apply when forwarding or redistributing it.
