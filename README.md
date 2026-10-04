# Offline STEM Tutor

An AI STEM tutor that keeps working with **no network, no server, and no assumptions about the device** — built in response to specific interview feedback, not as a generic portfolio piece.

Four tiers answer questions. Only one of them needs a language model, and only one of them is allowed to claim it is certain.

---

## The gap this answers

I reached the final round for an EdTech co-op building offline-first learning tools for STEM pods in Mali. The decision came down to one distinction:

> "Your caching work is server-side — it cuts database calls, but the server still answers. The candidate we chose demonstrated a tutor running fully on-device, no connection in the room."

That is a fair bar for the target users: students who share phones and lose signal for days. This closes that gap — and then goes one step past it, because a tutor that only works on a laptop with WebGPU does not reach the phones those pods actually have.

---

## What you download, and when

**Opening the app downloads 867 KB.** That is the whole first-visit cost: app shell, curriculum, verified answer bank, fonts, icons. You can start learning immediately and keep learning with the network off.

Everything larger is opt-in, downloaded once, and never automatic.

| Level | What you get | Download | Needs |
|---|---|---|---|
| **1. Core tutor** | Curriculum (4 subjects × 7 chapters), deterministic solver, verified answer bank, learner profiles, chat history, facilitator tools, English + French | **867 KB** — included | any modern browser |
| **2. Local retrieval** | Semantic search over the answer bank, in either language | **~128 MB** once | plain WASM — no GPU |
| **3. On-device AI** | A language model answering Maths, Physics and Biology | **~1.6 GB** once | WebGPU |

**The 1.6 GB model is optional.** Nothing asks for it on first load, nothing starts it in the background, and the app is fully usable without it. It is offered behind a button that states the size — and the time, on a slow connection — before you tap. A device without WebGPU is told so plainly and keeps levels 1 and 2.

No model weights are in the repository or the deployed build. They come from the MLC and Hugging Face CDNs on request and are cached in the browser.

## The capability ladder

Four tiers answer questions. Only one needs a language model, and only one is allowed to claim certainty.

| Tier | Engine | Needs | Confidence | Covers |
|---|---|---|---|---|
| 1 | **Deterministic solver** | nothing | `high` | Number series — exactly decidable |
| 2 | **On-device LLM** | WebGPU + one download | `medium` / `low` | Maths, Physics, Biology |
| 3 | **Verified answer bank** | ~128MB embedder, plain WASM | `medium` | Mental Ability |
| 4 | **Honest refusal** | nothing | `low` | Flagged for a facilitator |

Two things worth noting:

**The top rung is not the LLM.** For a number series, arithmetic beats a 1.5B model — and it is the only tier that verifies its own output, so it is the only one allowed to say `high`.

**Tier 3 runs where tier 2 cannot.** On a shared low-end Android, tier 3 is the real tutor. A design that stopped at "run an LLM on-device" would hand that student a blank screen.

## Why Mental Ability is grounded and the STEM subjects are not

Asked `2, 4, 6, 8, ?`, the on-device model retrieved a Fibonacci exemplar, wrote `4 + 6 = 10`, and answered **20**. Its own second step contradicted the question — the series says the term after 6 is 8 — and it did not notice, because nothing in a language model checks a rule against the data it came from.

Retrieval alone did not prevent that. It cannot: retrieval finds the nearest *technique*, and the nearest technique can still be the wrong one. The similarity was **0.67**, comfortably "grounded".

So the two subject types use retrieval for different purposes, which is why they are different modules:

- **`lib/retrieval.ts` — authorises.** For aptitude questions, no match means no answer. A plausible-sounding wrong method is worse than a refusal.
- **`lib/reference.ts` — informs.** For STEM, 84 teacher-written notes (definitions, formulas, worked examples, and the misconception students actually make) are injected when relevant. A miss degrades the answer; it never blocks it. *"Why does a heavier object not fall faster?"* deserves an answer whether or not the corpus covers it.

And where a question is genuinely decidable, `lib/solvers/` decides it instead of asking anyone.

---

## The facilitator flywheel

A facilitator corrects a flagged answer. The correction is embedded on the spot and becomes a retrievable exemplar, so the next student asking something similar gets the teacher's answer rather than a guess. **No server is involved at any point in that loop** — which is why the bank lives in IndexedDB rather than in the bundle.

---

## What works offline

| | |
|---|---|
| App shell, cold boot with the radio off | ✅ service worker precache, 29 entries / 780KB |
| Fonts | ✅ self-hosted, no CDN |
| Curriculum, 4 subjects × 7 chapters | ✅ bundled |
| Learner profiles on a shared device | ✅ no account, no server — a name and a colour |
| Low-bandwidth mode (cost shown before any download) | ✅ |
| Facilitator PIN on the review queue | ✅ PBKDF2 + persisted lockout, all local |
| Pod sync between devices | ✅ append-only event log, exported as a file |
| Facilitator dashboard | ✅ derived from real data only — no invented metrics |
| Offline readiness check | ✅ measured against real storage, with the fixes attached |
| Chat history, flags, corrections, **per learner** | ✅ IndexedDB (Dexie) |
| Answer bank + 84 reference notes + vectors | ✅ IndexedDB |
| Deterministic solver | ✅ no model needed at all |
| Downloaded lesson videos | ✅ Cache API, explicit download with visible byte cost |
| LLM + embedder, **after** one download | ✅ Cache API |
| UI, curriculum and prompts in English / French | ✅ |

### What does *not* work offline — stated plainly

- **First use of either model needs a connection.** ~1.6GB for the LLM, ~128MB for the embedder, each once. Both show the cost before the tap. Until the embedder is cached, Mental Ability says so explicitly instead of pretending nothing matched.
- **Cross-device sync needs a courier, not a connection.** Flags and verified corrections move between phones as an exported file — no server, no signalling, no network. A networked transport (local Wi-Fi or a cloud endpoint) is not built; both would be callers of the same merge.
- **Answer-bank exemplars are authored in English.** Cross-lingual retrieval finds the right exemplar for a French question, and with the LLM present it is restated in French. Without one, a French student gets the right method in English.

---

## Measurements, not claims

Every threshold in the code was measured and the numbers are recorded beside the constant that uses them.

**Embedder choice.** `all-MiniLM-L6-v2` is 22MB and excellent — in English only. On French questions its scores collapsed to **0.21–0.30**, below even the weak threshold, so a French student would be refused answers the bank holds. `paraphrase-multilingual-MiniLM-L12-v2` (~128MB) retrieves cross-lingually: **12/12** correct chapter across both languages.

**That swap cost separability**, and the fix is the more interesting part:

```
                            English-only      Multilingual
in-scope, lowest score            0.437             0.401
out-of-scope, highest             0.325             0.577   ← bands overlap
```

No single threshold separates those. So every query is also scored against **negative anchors** built from the other subjects' sample problems — content already written, and exactly what a student types into the wrong tab. A question counts as aptitude only if it beats the anchors by a margin.

```
Mental Ability sample problems grounded   21/21
out-of-scope leaks (both languages)        0/10
reference notes found for sample problems 63/63
French questions retrieving English notes   8/8
```

**Honest residual:** two in-scope questions fall below the domain gate and are covered by the solver running first. That is a real coupling between two tiers, and it is written down in `lib/retrieval.ts` rather than left to be discovered.

---

## Tests

```bash
npm test     # 150 tests, ~990ms
```

They cover the parts the README claims are reliable: the solver (including the `2,4,6,8` regression, both languages, and the refusals), the retrieval bands and domain gate, embedding-cache invalidation across a model swap, the facilitator flywheel end to end, learner isolation on a shared device, the facilitator PIN including lockout escalation and that the PIN is never stored in any field, the sync merge's idempotency, convergence and conflict rules plus the flywheel crossing devices, the v5 migration that adopts pre-profile conversations rather than deleting them, the Dexie schema regression that once blanked the teacher view, and curriculum integrity including full French coverage.

Retrieval tests use a deterministic stand-in embedder. The real model's behaviour is measured separately against the real corpus — those are the numbers above.

---

## Stack

React · TypeScript · Vite · WebLLM (Qwen2.5-1.5B / Llama-3.2-1B) · transformers.js (multilingual MiniLM) · Dexie · Cache API · Tailwind · vite-plugin-pwa · Vitest

The shell is **313KB**. The inference runtimes — 6MB of WebLLM, 876KB of transformers.js, a 21MB ONNX binary — are deliberately excluded from precache and cached only once something uses them. A student who only watches a downloaded video never pays for the inference stack.

---

## Running it

```bash
npm install
npm run dev                      # development
npm run build && npm run preview # required to test offline — no service worker in dev
```

WebGPU (recent Chrome/Edge) is needed for tier 2 only. Tiers 1, 3 and 4 work in any modern browser — which is the point.

---

## Verifying it by hand

Automated tests cover the logic; they cannot cover the service worker, WebGPU, or a real cold boot. This is the sequence that does, ordered so **nothing requiring a download comes first** — if something is broken, you find out before committing to 1.6GB.

Run the production build. There is no service worker in dev, so `npm run dev` cannot test any of this:

```bash
npm run build && npx vite preview --port 4317
```

After any rebuild: DevTools → Application → Service Workers → **Unregister**, then reload. `registerType: "autoUpdate"` still needs a reload cycle, and a stale worker will serve you old JavaScript.

### Phase 1 — no downloads required

| # | Do | Expect |
|---|---|---|
| 1 | Open the app | "Who's learning today?" — not the tutor |
| 2 | Add a learner, e.g. `Awa` | Header shows `Awa · switch` |
| 3 | Mental Ability → Number Series → ask `2,4,6,8,?` | **Answer 10**, labelled `Verified — checked against your question`. No model, no download |
| 4 | Ask `120, 99, 80, 63, 48, ?` | 35, via constant second difference |
| 5 | Ask `What is photosynthesis?` here | Refuses and flags it — wrong subject, correctly rejected |
| 6 | Toggle `details` in the chat header | Tier, confidence and match score appear; toggle off, they go |
| 7 | Switch to Français | Interface, chapters and solver explanation all in French |
| 8 | `switch` → add `Ibrahim` → open Number Series | **Empty history.** Switch back to Awa — hers is intact |

Step 8 is the shared-device privacy property. If Ibrahim sees Awa's questions, stop and tell me.

### Phase 2 — the search model (~128MB, once)

| # | Do | Expect |
|---|---|---|
| 9 | Ask a non-series aptitude question, e.g. `Doctor : Hospital :: Teacher : ?` | Header chip goes `answer bank ready · wasm`; answer labelled `From a verified example` |
| 10 | Ask `Odd one out: 3, 5, 11, 14, 17` | Grounded answer, 14 |

### Phase 3 — the language model (~1.6GB, once)

| # | Do | Expect |
|---|---|---|
| 11 | Mathematics → Linear Equations → `Download 1630MB`, wait | Banner → `on-device model ready` |
| 12 | Ask `Solve for x: 3x + 7 = 22` | Streams token by token; labelled `Used the chapter material · not checked by a person` |
| 13 | Ask `Why does a heavier object not fall faster?` in Physics → Gravitation | Should reflect the misconception note, not the common wrong answer |

### Phase 4 — the actual claim

These are two different failure modes and must be tested separately.

| # | Do | Expect |
|---|---|---|
| 14 | DevTools → Network → **Offline**. Do **not** reload. Ask a new Maths question | It answers. Network tab stays silent. *This proves inference is local* |
| 15 | Still offline, ask `7, 14, 21, 28, ?` | 35, instantly, from the solver |
| 16 | Still offline — **reload the page** | App boots. Fonts correct, not fallback. *This proves the service worker works* |
| 17 | Offline, after reload: ask an aptitude question | Still grounded — the embedder came from cache |
| 18 | Go back online | `SIGNAL DETECTED` returns |

Step 16 is the one the whole project exists for.

### Phase 5 — facilitator

| # | Do | Expect |
|---|---|---|
| 19 | Teacher review tab | Asked to set a PIN. `1234` is rejected (too short), `123456` rejected (sequential), `135792` accepted |
| 20 | Lock, then enter a wrong PIN five times | Cooldown with a countdown. **Reload — the cooldown survives** |
| 21 | Wait it out, unlock | Dashboard, readiness, sync panel, review queue |
| 22 | Offline readiness → `Ask browser to keep data` | Row flips to ✓ |
| 23 | Correct a flagged answer → `Save + teach the tutor` | Resolved, marked `in answer bank` |
| 24 | Ask the **same question again** as a student | The teacher's answer comes back, labelled `Verified by a teacher` |

Step 24 is the flywheel.

### Phase 6 — sync between devices

Use **two browser profiles**, not two tabs — same-origin tabs share one IndexedDB, so two tabs prove nothing.

| # | Do | Expect |
|---|---|---|
| 25 | Profile A: facilitator → `Export everything` | A `pod-sync-xxxxxxxx-DATE.json` file |
| 26 | Profile B: set up, then facilitator → `Import from another device` | Report: received / applied / already had / kept ours |
| 27 | Profile B: ask the question A's teacher corrected | A's correction answers it |
| 28 | Profile B: import the same file again | `applied: 0`, `already had: N` — idempotent |

### What to tell me if something fails

The step number, what you saw instead, and anything in the DevTools console. For offline failures also check **Application → Cache Storage** — you should see `workbox-precache`, `inference-runtime-v1`, a `transformers` cache, and `webllm` entries once the models are in.

---

## Offline readiness

The question a facilitator has to answer before putting ten phones in a bag and driving out of coverage — and one the app could not answer before. An online/offline pill tells you the state you are *in*; it says nothing about whether the thing will still work in an hour.

Eight checks, each measured against real storage rather than assumed, split into **required** and **optional** so a device is never reported broken for lacking a 1.6GB download. Rows that can be fixed from the screen offer the fix: `Index now`, `Ask browser to keep data`.

Two checks worth calling out:

**`navigator.storage.persist()`** — the one nobody thinks of and the one most likely to ruin a trip. Without persistence granted, a browser short on space may evict IndexedDB and the Cache API, taking the model weights, the indexed answer bank and every stored conversation with them. On a shared phone that is nearly full, that is not hypothetical.

**"Indexed" means embedded with the *current* model.** A row carrying a vector from a previous embedder counts as missing, not ready — both models output 384 dimensions, so a stale vector compares without erroring and returns nonsense. Counting it as ready would be the exact failure the check exists to prevent.

## What a student reads instead of a cosine score

The chat used to show `confidence: medium · match 0.67`. That is the right thing for *me* to see while calibrating thresholds and the wrong thing to put in front of a fourteen-year-old: it reads as precision the system does not have, and it is not actionable by the person reading it.

Answers now carry provenance in words:

| | |
|---|---|
| `Verified — checked against your question` | solver; it re-derived the answer from the question |
| `Verified by a teacher` | a teacher wrote or approved this exemplar |
| `From a verified example` | matched a vetted exemplar that ships with the app |
| `Used the chapter material · not checked by a person` | model, with reference notes in the prompt |
| `AI answer · not checked by a person` | model, nothing behind it |
| `No answer — sent to your teacher` | refused, and flagged |

Only the first two read as reassuring. A grounded model answer is **better informed, not verified** — citations constrain the facts it reached for and say nothing about the reasoning built on top of them. The raw tier, confidence, match score and citation count are still stored on every message and still shown, behind a `details` toggle that is off by default.

## The facilitator dashboard, and the metric I refused to invent

A mastery bar would have been easy and would have been a fabrication: nothing in this system knows whether a student's answer was *right*. What it knows is what they asked, which engine answered, and whether a human has checked it.

So the dashboard reports **unverified coverage** instead — how many answers came from the language model with nothing behind them. Real, actionable (it says where a facilitator's next ten minutes should go), and it makes no claim about learning. There is no XP and no streak for the same reason.

It also surfaces the thing this project is actually arguing: **where answers came from**. Of N answers, how many were exact-solver, verified-bank, model, or refused. The capability ladder as a number a facilitator can read.

Form choices worth noting, since they were measured rather than picked:

- Provenance started as a four-segment stacked bar. Four steps of one hue measured **ΔE 6.9** between adjacent segments — below the threshold at which full-colour vision can separate them — and four distinct hues failed the lightness band against this app's `#1C2340` surface. It became a **meter** for the one ratio that matters plus a **table** for the breakdown, where every class carries its own label.
- Exactly one hero figure, and it is the actionable one: answers awaiting review.
- The panel says **"this device only"** in its header. A dashboard that silently reports a fraction of the pod is worse than one that reports nothing.

## Pod sync without a network

Two phones in a pod may both have been offline for a week. Both have moved on. There is no "current state" for them to agree on — only two sets of things that happened. So the unit of transfer is an **append-only log of facts**, not a snapshot of tables.

A facilitator exports a file from a student's phone, carries it, imports it on their own. The merge guarantees three properties, each with a test:

- **Idempotent.** Event ids are `deviceId:seq`, so importing the same bundle twice changes nothing — no payload comparison needed.
- **Convergent.** Two devices that exchange logs in either order end up agreeing. Conflicts resolve by rules that ignore arrival order: a **correction outranks an approval** regardless of timestamps (it carries strictly more information — someone wrote out the right answer), then wall clock, then a lexicographic device-id tiebreak. That last rule looks arbitrary because it is; its job is to be the *same* arbitrary answer everywhere.
- **Non-destructive.** A merge never deletes local work. The worst case is an incoming opinion recorded but not adopted.

Two details that matter more than they look:

**Wall clocks are not trusted to arbitrate.** A pod phone offline for days may have a clock that is minutes or months wrong, so every event carries a per-device sequence number and conflicts prefer semantics over timestamps.

**Vectors never travel.** A bank item crossing devices ships as text, stripped of its embedding, and the receiving device embeds it with its own model. Smaller, and it makes the silent failure impossible — two embedders' output has the same dimensions and would compare without erroring while returning nonsense.

**What is not built:** a networked transport. The hard part of sync is the merge, and the merge is transport-agnostic — `importBundle` takes a parsed bundle, so a file, an HTTP response and a WebRTC channel are the same thing from there. Building the file path first was deliberate: designing around a cloud endpoint would have hidden the fact that the merge has to work without one.

## On the facilitator PIN, honestly

The review queue holds every learner's flagged questions, so it sits behind a PIN: PBKDF2-SHA256, random salt per device, 150,000 iterations, plus a persisted lockout (5 attempts, then a doubling cooldown).

What that is actually worth, measured rather than assumed — ~11ms per derivation on a current laptop:

| PIN length | Offline enumeration of the whole space |
|---|---|
| 4 digits | ~2 minutes |
| 6 digits | ~3 hours |
| 8 digits | ~12 days |

My first implementation allowed 4 digits and a comment claimed the derivation cost turned guessing from "instant" into "hours". The measurement said two minutes, so the minimum became 6. **PIN length is the lever; the iteration count is only a multiplier on it.**

The lockout closes the UI path completely — thousands of guesses through a form is not happening, and it is persisted so a reload does not reset it. It does nothing against someone who extracts the stored hash and scripts against it offline, which is exactly why length matters more.

So: this is a boundary against a curious student, which is the threat that actually exists in a pod. It is not real security, and anyone holding the device could eventually get past it. Anything genuinely sensitive would need a server-side check — and working with no server is this project's architecture, not an oversight. There is deliberately no in-app PIN reset, because with no server a reset reachable from inside the app is just a second unlocked door.

## Deployment

**Live:** https://zealous-mushroom-0497e111e.6.azurestaticapps.net

Hosted on **Azure Static Web Apps** — chosen because this is a static PWA and the interesting engineering happens in the browser, not the cloud. There is no backend, no database and no API, because none is required: a server would undermine the point.

```
push to main
  → GitHub Actions: npm ci → tsc --noEmit → npm test → npm run build → bundle budget
  → Azure Static Web Apps (upload the verified dist/)
```

Two workflows in `.github/workflows/`:

- **`ci.yml`** — typecheck, test, build, bundle budget, on every push and PR.
- **`azure-static-web-apps.yml`** — the same gates, then deploy. `skip_app_build: true`, so Azure publishes exactly the artefact that was tested rather than rebuilding it with Oryx. PRs get a staging environment, torn down on close.

### The bundle budget is a CI gate

`scripts/check-bundle-budget.mjs` fails the build if the first-visit payload exceeds 1200 KB, or if an inference runtime appears in the precache manifest.

This guards the project's central claim, and it guards it against a failure that is silent rather than loud: someone adds a plain `import` of transformers.js or WebLLM, the bundler folds megabytes into the entry chunk, and the first-visit download grows from under a megabyte to tens of them. Nothing errors. The tests still pass. Only a first-time visitor on a 2G connection notices.

`public/staticwebapp.config.json` — in `public/` so Vite copies it into `dist`, because with `skip_app_build` the config has to live inside the uploaded folder to be applied.

### `staticwebapp.config.json`

- `navigationFallback` to `/index.html`, excluding real asset paths — required for the service worker and for any deep link to resolve.
- `sw.js`, `registerSW.js` and `index.html` served `no-cache`; hashed assets and fonts `immutable` for a year. Getting this wrong is how a PWA serves a stale shell forever.
- Explicit MIME types for `.wasm` and `.webmanifest`.

One header deliberately **not** set: `Cross-Origin-Embedder-Policy`. It would enable `SharedArrayBuffer` and multi-threaded WASM for the embedder, but it can block the cross-origin model fetches from the Hugging Face CDN, and `credentialless` is unsupported in Safari. Shipping a header I could not verify against the live site, where the downside is "the model never downloads", was not a trade worth making. Worth testing later.

## Known gaps

Ordered by how much they matter for a real learning pod:

1. **Sync has no networked transport.** The log and merge are done and tested; moving a file by hand is the only pipe. Local-network transfer (facilitator phone as hub, WebRTC with QR signalling) and a cloud endpoint are both unbuilt.
3. **No CPU/WASM language model.** A rung belongs between tiers 2 and 3 — llama.cpp compiled to WASM would reach devices WebGPU cannot, at a few tokens per second. Not implemented, and I would want to measure whether it is usable on the target hardware before claiming it is the answer.
4. **Solvers cover one chapter.** Direction Sense is a state machine over `(facing, x, y)`; row positions are arithmetic; fixed-shift coding is verifiable by re-applying the shift. Each would move a chapter from "probably right" to "provably right".
5. **No real lesson videos.** The download-and-play-offline mechanism is real; the content is placeholder.
