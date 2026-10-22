# Offline STEM Tutor

An offline STEM tutor for learning pods in Mali that works with **no network, no server, and no assumptions about the device**. Maths, Physics, Biology and Mental Ability are all usable **without any AI model**: exact solvers, lessons, flashcards and practice ship with the app, and the optional on-device model only improves open-ended answers. An offline English game keeps students learning once everything else is used up.

**Live:** https://zealous-mushroom-0497e111e.6.azurestaticapps.net

**Why it exists.** I reached the final round for an EdTech co-op building offline tools for these pods. Their verdict: *"Your caching work is server-side… the candidate we chose demonstrated a tutor running fully on-device."* This closes that gap, and goes further: a tutor that needs WebGPU does not reach the shared low-end phones the pods actually have.

---

## What downloads, and when

| Level | What you get | Download | Needs |
|---|---|---|---|
| **1. Core** | 4 subjects × 7 chapters: Maths and Physics solvers, 84 lessons, 98 questions + generated practice, 86 flashcards, answer bank, English game, profiles, facilitator tools, English + French UI | **~1.15 MB** on first visit | any modern browser |
| **2. Local search** | Semantic search over the answer bank, both languages | **~150 MB** once (128 MB model + 21 MB WASM) | plain WASM, no GPU |
| **3. On-device AI** | Language model for Maths, Physics, Biology | **~1.6 GB** (or 880 MB light) once | WebGPU |

Levels 2 and 3 are opt-in, never automatic, and show size and estimated time before the tap. An interrupted download resumes on retry, is labelled *partly downloaded* (never "already downloaded"), and any model, complete or partial, can be removed from the device without touching learner data. No model weights are in the repo or the build; they come from the MLC / Hugging Face CDNs and are cached in the browser.

## How questions get answered

Maths, Physics and Biology (`lib/tutor.ts`), in this order:

| # | Engine | Needs | Student sees |
|---|---|---|---|
| 1 | **Exact solver** (Maths, Physics) | nothing | `Verified — checked against your question` |
| 2 | **Teacher answer** to the same question (word match, no embedder) | nothing | `Verified by a teacher` |
| 3 | **Stored lesson** that clearly covers the question (word match, strict) | nothing | `From the chapter notes · not checked against your question` |
| 4 | **On-device LLM**, informed by the notes, output checked | WebGPU + download | `AI answer · …` |
| 5 | **Honest reply**: related lessons, solver formats to try, sent to the teacher | nothing | `No answer — sent to your teacher` |

Mental Ability: number-series solver → teacher answer → semantic answer bank (~150 MB embedder) → word-for-word exemplar match if the embedder is missing → refusal. A solver that recognises a problem but lacks data says exactly what is missing and is **not** flagged.

- **The top rung is not the LLM.** Arithmetic beats a 1.5B model, and only a solver verifies its own output.
- **Tier 3 runs where tier 2 cannot.** On a low-end Android with no WebGPU, the answer bank *is* the tutor.
- **Mental Ability is grounded; STEM is not.** Asked `2, 4, 6, 8, ?` the model retrieved a Fibonacci exemplar (similarity 0.67) and answered 20. So `lib/retrieval.ts` **authorises**: no match, no answer. For STEM, `lib/reference.ts` **informs**: 84 teacher-written notes (definitions, formulas, worked examples, misconceptions) are injected when relevant but never block an answer.
- **The model's work is checked.** Arithmetic (`3 x 4 = 14`), dimensional analysis (*"acceleration is 4 N"*) and substitution (a wrong `x`) are verified deterministically, tolerating how models actually write (`1,250`, French `2,5`, rounded `3.14`, `m/s²`, a final `x = 5.` in prose). A failure drops confidence, auto-flags the answer and labels it `⚠ A check failed`. Passing earns *"checked · reasoning not verified"*, never "correct". No second model call: the model that made the error is not its judge.
- **Students read provenance, not scores:** `Verified — checked against your question` (solver), `Verified by a teacher`, `From a verified example`, `Used the chapter material · not checked by a person`, `AI answer · not checked by a person`, `No answer — sent to your teacher`. Raw tier, score and citations sit behind a `details` toggle.

## Offline curriculum (no AI)

Each chapter opens on **Ask · Learn · Practice · Solve**, with a strip saying what this device actually has (lessons, questions, solver types, teacher answers, whether the AI model is installed) and a per-subject coverage table.

- **Maths solver** (`lib/solvers/maths`, 17 problem types): order of operations and fractions; HCF/LCM; prime factorisation; expand; factorise (common factor, quadratics with rational roots); linear equations; 2×2 systems; quadratics (exact surds); percent of / change / increase-by; simple and compound interest; ratio sharing; Pythagoras; triangle, complementary and supplementary angles; distance, midpoint, gradient; area/perimeter/volume/surface of 12 shapes (π, 22/7 and 3.14 shown); mean/median/mode/range; probability for a die or a bag of colours. Exact fractions throughout; a closed parser, never `eval`.
- **Physics engine** (`lib/solvers/physics`, 26 formulas across all 7 chapters + series/parallel resistors): reads quantities and units from a typed question (km/h, min, g, kWh, ×10ⁿ…), finds what is asked, picks the one formula that uses the given values, and **asks rather than guesses** when two fit. A structured form covers anything the reader cannot parse. Every rearrangement is hand-written and tested against the formula as written.
- **Every solver answer is independently checked**: substituted into the original equation, recomputed by a second formula (circle area from the diameter, cuboid surface as six faces), or Euclid's gcd against the factorisation. A failed check means no answer.
- **Biology**: 28 lessons, 56 flashcards, 49 questions with explanations, consistent with the notes. **Physics/Maths**: 56 lessons, 49 concept questions, 30 formula cards, plus generated numerical practice with fresh numbers every set and the solver's worked solution as the explanation. **Mental Ability**: the 56 answer-bank exemplars double as practice.
- **Search** (`lib/lexical.ts`): BM25 with rarity-weighted coverage over lessons, cards, explanations and teacher answers; no model. The threshold for showing a lesson *as an answer* is strict and pinned by tests in both directions.
- **Teacher corrections** are found by word match in every subject, and stored unindexed when the embedder is missing, then indexed when it loads.
- **Curriculum packs**: a teacher can import extra lessons, questions and flashcards as a JSON file (Teacher review → Curriculum packs). Validated in full before anything is saved; a bad file changes nothing.
- **Progress** per learner per item, deleted with the learner.
- **Which syllabus?** None specifically: the chapter list is syllabus-neutral lower secondary (grades 8–10). Content was written for this app and has **not** been reviewed by an external educator. **It is English only**; the French UI says so on every item instead of implying a translation exists. Solver steps and UI are in both languages (French by the developer, not reviewed by a French-speaking educator).

## English game

For the day there is no signal and a student has already used everything downloaded. Fully offline, part of the first-visit download (~18 KB), no model.

- **10 beginner topics:** Numbers, Colours, Family, Body, Food, Animals, School, then STEM-linked Shapes, Nature, Science tools. 78 words, each with a French hint.
- **Picture match:** picture → word and word → picture, distractors always from the same topic so elimination cannot replace knowing.
- **Word builder:** tap scrambled letters into slots to spell the word, checked when every slot is full, with the right spelling shown on a miss. Two-word answers show their gap.
- **Never runs out.** 8 questions a round, Leitner spaced repetition per learner and **per mode** (recognising a word is not spelling it): a correct answer moves a word up a box, a miss resets it, least-known words come first. *Mixed review* draws from every opened topic.
- **Progression:** a topic unlocks in both modes when half the previous one is learned in picture match; up to 3 stars per mode for words mastered (3 correct in a row).
- **No image downloads:** emoji from the phone's font (limited to what Android 7 draws), plus drawn colour swatches, shapes and dot counts. A *Listen* button appears only if the phone has an on-device English voice.
- Progress is stored per learner and deleted with them. It is the student's own; facilitators do not see it. Add words in `src/data/englishWords.ts`.

## Built for a shared, disconnected pod

- **Learner profiles:** a name and a colour, no account. Separation on a shared phone, not security.
- **Facilitator flywheel:** a correction is embedded on the spot and becomes a retrievable exemplar, so the next student gets the teacher's answer. No server in the loop.
- **Facilitator PIN:** PBKDF2-SHA256, 150k iterations, persisted lockout (5 attempts, doubling cooldown), 6-digit minimum because a 4-digit space enumerates offline in ~2 minutes. A boundary against a curious student, not real security; deliberately no in-app reset.
- **Dashboard:** reports answer provenance and *unverified coverage*, never an invented mastery metric. Labelled "this device only".
- **Pod sync without a network:** an append-only event log exported as a file. Merge is idempotent (`deviceId:seq` ids), convergent (a correction outranks an approval, then clock, then device-id tiebreak) and never deletes local work. Clocks are not trusted; vectors never travel (re-embedded on arrival).
- **Offline readiness:** eight checks measured against real storage, split required/optional, with fixes inline (`Index now`, `Ask browser to keep data`). Storage persistence is requested before data exists and warned about if refused; in-app browsers are told to open in a real browser and install.
- **Updates never interrupt:** a new deploy waits behind an `update ready — tap to reload` badge (or until every tab is closed) instead of reloading mid-answer, mid-game or mid-download.
- **Robust storage:** a full device gets a plain "out of storage" message, not a raw browser error. Zod validates data crossing a boundary (sync bundles, old IndexedDB rows, localStorage). One bad row never takes down a query: it is quarantined, not deleted.
- **Diagnostics:** a copyable block (browser, install/SW state, storage, WebGPU/WASM, model states, build) with no learner data.

## What works offline

**Works:** cold boot with the radio off (service-worker precache, 32 files), self-hosted fonts, all four subjects' lessons, practice and solvers, English game, profiles, chat history, flags and corrections, answer bank + notes + vectors, PIN, dashboard, sync export/import, and both models after their one download. UI, curriculum and prompts in English and French.

**Does not, stated plainly:**
- First use of each model needs a connection (once).
- Sync needs a courier (a file), not a connection; no networked transport is built.
- Curriculum text (lessons, cards, questions, answer-bank exemplars) is English only. The French interface labels it.
- The no-model reply covers what the solvers read and what a lesson clearly answers. Anything else is honestly declined and sent to the teacher; open-ended explanation needs the optional model.

## Measurements

- **Embedder:** English-only MiniLM scored French questions at 0.21–0.30, so French students would be refused. Multilingual MiniLM: 12/12 correct chapter across both languages.
- **That swap overlapped the bands** (in-scope low 0.401, out-of-scope high 0.577), so every query is also scored against **negative anchors** from other subjects and must beat them by a margin: 21/21 Mental Ability samples grounded, 0/10 out-of-scope leaks, 63/63 notes found, 8/8 French→English notes. Two in-scope questions fall below the gate and are covered by the solver; documented in `lib/retrieval.ts`.

## Tests and evaluation

```bash
npm test     # 512 tests, ~3s, no model download, no network
npm run eval # 105 cases (v3), all checkable without a language model
```

Tests cover every Maths and Physics solver against hand-worked answers, every formula rearrangement, 200 generated questions per chapter, the no-model pipeline for all four subjects (with the embedder failing as it does offline), lesson-matching policy, content-pack validation, the solver (incl. the `2,4,6,8` regression), retrieval bands and domain gate, embedding-cache invalidation, the flywheel, learner isolation, PIN lockout, sync idempotency and convergence, migrations, corrupt-record recovery, the verifiers, model download state and removal, search-model retry, and the English game's scheduling, scrambles, unlocks and per-mode storage.

Eval (`npm run eval`): **91/91** evaluated cases pass (Maths 21/21, Physics 11/11, declines 9/9, lesson policy 12/12, plus the v2 checks); 14 retrieval cases are skipped because they need the real embedder, and Vitest runs them with a stand-in embedder, which tests retrieval *policy*, not the real model. This is a small, hand-built set: it shows the supported problem types work, **not** that the syllabus is covered, and it measures nothing about LLM answer quality. Mocked in tests: the embedder (stand-in or failing), WebLLM's cache and delete, transformers.js loading. It has caught real bugs: `2 x 36 = 36` read out of `0.5 x 2 x 36 = 36`, and in v2, false alarms on `1,250`, `2,5`, `3.14` and `m/s²` plus a substitution check that never ran on prose answers (the old checkers score 33/38 on v2).

## Run it

```bash
npm install
npm run dev                                 # development (no service worker)
npm run build && npx vite preview --port 4317 # required to test offline
```

After a rebuild, tap `update ready`, or unregister the service worker (DevTools → Application) and reload.

**Stack:** React · TypeScript · Vite · WebLLM (Qwen2.5-1.5B / Llama-3.2-1B) · transformers.js · Dexie · Cache API · Tailwind · vite-plugin-pwa · Vitest. The inference runtimes (6 MB WebLLM, 876 KB transformers.js, 21 MB ONNX) are excluded from precache and cached only once used.

## Verify by hand

Full device checklist and demo order: [`docs/MANUAL_TESTS.md`](docs/MANUAL_TESTS.md). Summary:

Online for phases 1–3, offline from 4. Phases 2 and 3 are independent and optional.

| Phase | Do | Expect |
|---|---|---|
| **1 · online, no download** | Wait for `✓ works offline`; add learner `Awa`; Mental Ability → Number Series → `2,4,6,8,?` | **10**, `Verified`, no download |
| | `120, 99, 80, 63, 48, ?` / `What is photosynthesis?` | 35 / refused and flagged |
| | Switch to Français; add `Ibrahim` | All French; Ibrahim sees an **empty** history, Awa's intact |
| | Learn English → Numbers, play a round; switch to Word builder, play Numbers | French hint after each answer; Colours unlocks after 4 correct; spelling stars separate |
| **2 · online, ~150 MB** | `Doctor : Hospital :: Teacher : ?`; `Odd one out: 3, 5, 11, 14, 17` | `answer bank ready · wasm`; grounded, 14 |
| **3 · online, optional** | Maths → Linear Equations → Download; `Solve 3x + 7 = 22`; Physics → *heavier object* | Streams; reflects the misconception note |
| **4 · offline** | Network off, **no reload**: ask Maths, `7, 14, 21, 28, ?` | Answers locally; 35 instantly |
| | **Reload** offline; ask aptitude; play the English game | Boots with correct fonts; grounded; game and progress work |
| | No model: Maths `Solve: (2x - 1)/3 = (x + 4)/2`; Physics `72 km/h for 15 min, distance?`; Biology `How does a mosquito spread malaria?`; each chapter's Learn / Practice / Solve | x = 14 verified; 18000 m; lesson answer labelled as notes; all tabs work |
| **5 · facilitator** | Teacher review: PIN `1234`, `123456`, `135792`; 5 wrong tries, reload | Rejected, rejected, accepted; cooldown survives reload |
| | Correct a flag → `Save + teach the tutor`; ask it again as student | `Verified by a teacher` |
| **6 · sync** (two browser profiles) | A: `Export everything` → B: `Import`; ask A's corrected question; import again | A's correction answers; second import `applied: 0` |

If something fails, send the step, what you saw, and the console. For offline failures check Cache Storage for `workbox-precache`, `inference-runtime-v1`, `transformers` and `webllm`.

**Low-end Android is not hardware-tested.** Procedure: Device Mode, Slow 4G + 6x CPU; confirm `cpu` not `webgpu`, solver instant, embedder timed, LLM never auto-starts, offline reload still boots.

## Deployment

Azure Static Web Apps; no backend, by design. `push to main → tsc → test → eval → build → bundle budget → upload dist/` (`skip_app_build`, so Azure ships exactly what was tested; PRs get staging environments).

- **Bundle budget (CI gate):** `scripts/check-bundle-budget.mjs` fails if the first visit exceeds 1200 KB or an inference runtime leaks into precache.
- **`public/staticwebapp.config.json`:** SPA fallback; `sw.js` / `index.html` `no-cache`, hashed assets `immutable`; MIME types for `.wasm` / `.webmanifest`. `Cross-Origin-Embedder-Policy` deliberately unset: it could block model fetches from the CDN.

## Known gaps and next steps

1. **No networked sync transport.** The merge is transport-agnostic; local Wi-Fi / WebRTC and cloud are unbuilt.
2. **No CPU/WASM language model** between tiers 2 and 3 (llama.cpp on WASM); unmeasured on target hardware.
3. **Mental Ability solvers cover one chapter.** Direction sense, row positions and fixed-shift coding are all provably solvable.
4. **Curriculum content is English only and not externally reviewed.** French translations need a French-speaking educator; Biology lessons have no diagrams yet.
5. **Not yet solvable offline:** multi-step physics (two formulas in sequence), motion graphs, lenses and mirrors (sign conventions differ by syllabus), surds and indices simplification, inequalities, statistics from tables, two-dice probability.
6. **English game has no sentences yet.** A sentence builder needs 40–60 authored, teacher-checked beginner sentences. A separate listen-and-pick mode is skipped: many pod phones have no offline English voice, so the in-game Listen button covers it where possible.
7. Not built by choice: signed sync bundles, conflict UI, bank management screen, assessments, adaptive difficulty, mastery estimation.
