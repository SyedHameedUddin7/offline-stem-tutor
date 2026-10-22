# Manual test and demo checklist

**Auto** = covered by `npm test` / `npm run eval` / CI on every push. **You** = needs a real browser or device; nothing automated can prove it.

## Setup

```bash
# Local production build (the service worker does not run under `npm run dev`)
npm ci && npm run build && npx vite preview --port 4317 --host
# Then open http://localhost:4317, or http://<your-laptop-ip>:4317 on a phone on the same Wi-Fi.
# Note: a phone over plain http on a LAN IP is not a secure context, so no service worker.
# For offline tests on a phone, use the live site or the PR staging URL (both HTTPS).
```

Before each run: DevTools → Application → **Clear site data** (or a fresh incognito/guest profile). On a phone: browser settings → site settings → clear data for the site. This deletes learners.

## 1. First online visit · offline-ready indicator — You

- [ ] Open the site online. Header badge goes `… preparing offline` → **`✓ works offline`**.
- [ ] Do not disconnect before it says ready. That badge is the only reliable signal.

## 2. Airplane Mode cold start and refresh — You

- [ ] After `✓ works offline`, close the tab/app completely. Airplane Mode **on**.
- [ ] Reopen: app boots, fonts correct (not a fallback serif), header says `NO SIGNAL`.
- [ ] Pull-to-refresh / reload while offline: still boots.

## 3. Learner creation and persistence — You (isolation logic: Auto)

- [ ] Create `Awa`, ask one question. Close the app, reopen: Awa still selected, history intact.
- [ ] `switch` → create `Ibrahim`: **empty** history. Switch back: Awa's intact.

## 4. STEM question and deterministic fallback — You (logic: Auto)

With **no model downloaded**, offline:
- [ ] Mental Ability → Number Series → `2, 4, 6, 8, ?` → **10**, labelled `Verified — checked against your question`.
- [ ] `120, 99, 80, 63, 48, ?` → **35**.
- [ ] `What is photosynthesis?` in Number Series → refused and flagged, no guess.
- [ ] Learn English → Numbers → play a round; Word builder → spell one word.

## 4b. All four subjects with no AI model — You (logic: Auto)

Airplane Mode on, no model ever downloaded. In each chapter the strip under the chapter list should say `AI model not installed — everything listed here works without it`.
- [ ] **Maths** → Linear Equations → Ask `Solve: (2x - 1)/3 = (x + 4)/2` → steps, **x = 14**, `Check: … left side = 9, right side = 9 ✓`, badge `Verified`.
- [ ] Maths → Solve tab → tap any example chip → Solve. Mensuration → shape form: circle, radius 7 cm → 49π ≈ 153.94, with the 22/7 and 3.14 values.
- [ ] Maths → Practice → answer a generated question wrong → `Not quite`, worked solution shown. `New set` gives new numbers.
- [ ] **Physics** → Motion → Ask `A bus travels at 72 km/h for 15 min. What distance does it cover?` → **18000 m**.
- [ ] Physics → Ask `A car accelerates for 10 s. Find its acceleration.` → says what is missing; **not** sent to the teacher.
- [ ] Physics → Solve → formula form (e.g. Ohm's law, find I, V = 12, R = 4) → 3 A. Try R = 0 → refused, no crash.
- [ ] **Biology** → Health & Disease → Ask `How does a mosquito spread malaria?` → lesson text, badge `From the chapter notes · not checked against your question`.
- [ ] Biology → Ask `What is DNA replication?` → honest "can't answer offline", related material, sent to teacher. No invented answer.
- [ ] Biology → Learn → open a lesson, flip flashcards, search `bile`. Practice → MCQ and short answers with explanations.
- [ ] **Mental Ability** → Practice → answer-bank questions; long answers are self-marked.
- [ ] "What works offline in this subject" → table with every chapter's counts.

## 5. Facilitator PIN and teacher correction — You (PIN/lockout logic: Auto)

- [ ] Teacher review → PIN `1234` rejected, `123456` rejected, `135792` accepted.
- [ ] Wrong PIN ×5 → cooldown. Reload → cooldown still running.
- [ ] Correct a flagged answer → `Save + teach the tutor` → marked `in answer bank`. Works offline even without the search model; it becomes searchable once that model has loaded (step 6).
- [ ] As the student, ask the same question → answer labelled `Verified by a teacher`.

## 5b. Curriculum pack import — You (validation: Auto)

- [ ] Teacher review → Curriculum packs → import a valid pack JSON (format in `src/schemas/index.ts`, `contentPackSchema`) → counts shown; its lessons appear in Learn labelled `from <pack title>`.
- [ ] Import a broken file (edit one `chapterId` to `chem-atoms`) → rejected with the reason; nothing changes.
- [ ] `remove` → its items disappear; built-in content unaffected.

## 6. Optional model download, retry, offline use — You (cache-state and removal logic: Auto)

Search model (~150 MB), online:
- [ ] Ask `Doctor : Hospital :: Teacher : ?` → chip `answer bank ready · wasm`, grounded answer.
- [ ] **Retry:** start fresh, go offline *during* the download → failure shown. Back online, ask again → it loads **without reloading the page**.

Language model (880 MB Light or 1.6 GB Standard, needs WebGPU), online:
- [ ] Button states size (and time, on a slow connection) before the tap. Nothing starts on its own.
- [ ] **Interrupt:** go offline mid-download → message says the download stopped and is kept. Chip reads `partly downloaded`, **not** "already downloaded".
- [ ] Back online, tap again → resumes, finishes, `on-device model ready`.
- [ ] Offline, no reload: ask a Maths question → streams locally.
- [ ] Offline **after a reload** → model still loads from cache.
- [ ] `unload`, then `Remove from device` → confirm → chip clears. Learners still there.

## 7. Storage and browser limitations — You

- [ ] Teacher review → Offline readiness → `Ask browser to keep data` → row turns ✓ (installed PWA is the most reliable).
- [ ] Open the link inside WhatsApp/Instagram → in-app-browser warning appears.
- [ ] Installed app (Add to Home Screen) opens offline from the icon.
- [ ] Optional: a nearly full phone → starting the 1.6 GB download shows "out of storage", not a raw error.

## 8. Update availability and safe reload — Auto (flow) + You (real deploy)

- [ ] With the app open, merge/deploy a change. Within a minute or on the next visit: badge **`update ready — tap to reload`**. The page must **not** reload by itself.
- [ ] Mid-game or mid-download, the badge appearing changes nothing until you tap it.
- [ ] Tap → reloads into the new version; learner kept; still works offline.
- [ ] First deploy after this change only: phones still running the old version update silently on next full close/reopen (the old code has no prompt). From then on, the badge shows.

## 9. French — You (string parity: Auto, type-checked)

- [ ] Toggle `Français`: interface, chapters, solver explanation, English-game hints and model messages all in French.
- [ ] Solve tab and solver replies in French (`Résous : 3x + 7 = 22`). Lessons, cards and questions show `anglais uniquement`; the coverage strip says the content is English only.
- [ ] Ask `Résous : 5x - 3 = 17` in Maths (with the model) → answer in French.
- [ ] A phone set to French opens in French on first visit.
- [ ] Have a French speaker skim the game hints and model messages.

## 10. Low-end Android — You (never done yet)

Not yet performed on real hardware. Do not claim it until it is.
- [ ] Cheap Android (≤3 GB RAM, Android 8–10), Chrome, live site.
- [ ] Time to `✓ works offline` on mobile data: ______
- [ ] Header shows `cpu`/no WebGPU → language model offered as unavailable, app still fully usable.
- [ ] Search model: time to first grounded answer: ______
- [ ] Emoji in the English game all render (no empty boxes); letter tiles easy to tap.
- [ ] Learn / Practice / Solve tabs open quickly; typing in Learn search does not lag; the physics formula form fits the screen.
- [ ] Airplane Mode cold start from the home-screen icon.
- [ ] Teacher review → Diagnostics → copy the block and keep it with the results.

## Live demo walkthrough (≈5 min, e.g. on the recruiter call)

1. Live URL, `✓ works offline` badge (step 1).
2. **Airplane Mode on**, close and reopen app (step 2): the core claim.
3. `2, 4, 6, 8, ?` → 10, Verified, no model (step 4). Then step 4b: a Maths equation, a Physics problem with km/h, and a Biology lesson answer, still in airplane mode.
4. Off-topic question refused and flagged; teacher corrects it; student gets `Verified by a teacher` (step 5).
5. Learn English: one picture match, one word builder (step 4).
6. Switch to French (step 9).
7. Optional: pre-downloaded model answering offline (step 6). Download it **before** the call.
