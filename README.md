# Offline STEM Tutor

An AI STEM tutor for learning pods in Mali that works with **no network, no server, and no assumptions about the device**. Four tiers answer questions; only one needs a language model, and only one may claim certainty. An offline English game keeps students learning once downloaded content runs out.

**Live:** https://zealous-mushroom-0497e111e.6.azurestaticapps.net

**Why it exists.** I reached the final round for an EdTech co-op building offline tools for these pods. Their verdict: *"Your caching work is server-side… the candidate we chose demonstrated a tutor running fully on-device."* This closes that gap, and goes further: a tutor that needs WebGPU does not reach the shared low-end phones the pods actually have.

---

## What downloads, and when

| Level | What you get | Download | Needs |
|---|---|---|---|
| **1. Core** | 4 subjects × 7 chapters, exact solver, verified answer bank, English game, learner profiles, facilitator tools, English + French | **~960 KB** on first visit | any modern browser |
| **2. Local search** | Semantic search over the answer bank, both languages | **~150 MB** once (128 MB model + 21 MB WASM) | plain WASM, no GPU |
| **3. On-device AI** | Language model for Maths, Physics, Biology | **~1.6 GB** (or 880 MB light) once | WebGPU |

Levels 2 and 3 are opt-in, never automatic, and show size and estimated time before the tap. No model weights are in the repo or the build; they come from the MLC / Hugging Face CDNs and are cached in the browser.

## How questions get answered

| Tier | Engine | Needs | Confidence | Covers |
|---|---|---|---|---|
| 1 | **Deterministic solver** | nothing | `high` | Number series |
| 2 | **On-device LLM** | WebGPU + download | `medium` / `low` | Maths, Physics, Biology |
| 3 | **Verified answer bank** | ~150 MB embedder | `medium` | Mental Ability |
| 4 | **Honest refusal** | nothing | `low` | Flagged for a facilitator |

- **The top rung is not the LLM.** For a number series, arithmetic beats a 1.5B model, and only the solver verifies its own output.
- **Tier 3 runs where tier 2 cannot.** On a low-end Android with no WebGPU, the answer bank *is* the tutor.
- **Mental Ability is grounded; STEM is not.** Asked `2, 4, 6, 8, ?` the model retrieved a Fibonacci exemplar (similarity 0.67) and answered 20. So `lib/retrieval.ts` **authorises**: no match, no answer. For STEM, `lib/reference.ts` **informs**: 84 teacher-written notes (definitions, formulas, worked examples, misconceptions) are injected when relevant but never block an answer.
- **The model's work is checked.** Arithmetic (`3 x 4 = 14`), dimensional analysis (*"acceleration is 4 N"*) and substitution (a wrong `x`) are verified deterministically. A failure drops confidence, auto-flags the answer and labels it `⚠ A check failed`. Passing earns *"checked · reasoning not verified"*, never "correct". No second model call: the model that made the error is not its judge.
- **Students read provenance, not scores:** `Verified — checked against your question` (solver), `Verified by a teacher`, `From a verified example`, `Used the chapter material · not checked by a person`, `AI answer · not checked by a person`, `No answer — sent to your teacher`. Raw tier, score and citations sit behind a `details` toggle.

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
- **Robust storage:** Zod validates data crossing a boundary (sync bundles, old IndexedDB rows, localStorage). One bad row never takes down a query: it is quarantined, not deleted.
- **Diagnostics:** a copyable block (browser, install/SW state, storage, WebGPU/WASM, model states, build) with no learner data.

## What works offline

**Works:** cold boot with the radio off (service-worker precache, 29 files), self-hosted fonts, curriculum, solver, English game, profiles, chat history, flags and corrections, answer bank + notes + vectors, PIN, dashboard, sync export/import, and both models after their one download. UI, curriculum and prompts in English and French.

**Does not, stated plainly:**
- First use of each model needs a connection (once).
- Sync needs a courier (a file), not a connection; no networked transport is built.
- Answer-bank exemplars are in English. French questions retrieve them correctly; without the LLM the method is shown in English.

## Measurements

- **Embedder:** English-only MiniLM scored French questions at 0.21–0.30, so French students would be refused. Multilingual MiniLM: 12/12 correct chapter across both languages.
- **That swap overlapped the bands** (in-scope low 0.401, out-of-scope high 0.577), so every query is also scored against **negative anchors** from other subjects and must beat them by a margin: 21/21 Mental Ability samples grounded, 0/10 out-of-scope leaks, 63/63 notes found, 8/8 French→English notes. Two in-scope questions fall below the gate and are covered by the solver; documented in `lib/retrieval.ts`.

## Tests and evaluation

```bash
npm test     # 232 tests, ~1s, deterministic stand-in embedder, no download
npm run eval # 45 versioned cases, all checkable without a language model
```

Tests cover the solver (incl. the `2,4,6,8` regression), retrieval bands and domain gate, embedding-cache invalidation, the flywheel, learner isolation, PIN lockout, sync idempotency and convergence, migrations, corrupt-record recovery, the verifiers, and the English game's scheduling, scrambles, unlocks and per-mode storage.

Eval: 100% on solver agreement, correct refusals, contradiction and unit checks (`npm run eval` skips 14 retrieval cases that need the real embedder; Vitest covers all 45). It measures the deterministic layers, **not** LLM answer quality. Its first run caught a real bug: `2 x 36 = 36` read out of `0.5 x 2 x 36 = 36`.

## Run it

```bash
npm install
npm run dev                                 # development (no service worker)
npm run build && npx vite preview --port 4317 # required to test offline
```

After a rebuild, unregister the service worker (DevTools → Application) and reload.

**Stack:** React · TypeScript · Vite · WebLLM (Qwen2.5-1.5B / Llama-3.2-1B) · transformers.js · Dexie · Cache API · Tailwind · vite-plugin-pwa · Vitest. The inference runtimes (6 MB WebLLM, 876 KB transformers.js, 21 MB ONNX) are excluded from precache and cached only once used.

## Verify by hand

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
3. **Solvers cover one chapter.** Direction sense, row positions and fixed-shift coding are all provably solvable.
4. **English game has no sentences yet.** A sentence builder needs 40–60 authored, teacher-checked beginner sentences. A separate listen-and-pick mode is skipped: many pod phones have no offline English voice, so the in-game Listen button covers it where possible.
5. Not built by choice: signed sync bundles, conflict UI, bank management screen, assessments, adaptive difficulty, mastery estimation.
