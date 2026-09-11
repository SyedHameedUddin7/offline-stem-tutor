# Offline STEM Tutor

A small AI tutor that keeps working with **zero network connection** — built in response to specific interview feedback, not as a generic portfolio piece.

## The gap this project answers

I made the final round for an EdTech Platform Developer co-op building offline-first learning tools for STEM pods across Africa. The decision came down to one distinction:

> "Your caching work is server-side — it cuts database calls, but the server still answers. The candidate we chose demonstrated a tutor running fully on-device, no connection in the room."

That's a real, well-founded bar for the target users: students who share phones and lose signal for days at a time. This project closes that gap directly.

## What's actually proven here

- **On-device inference** — [WebLLM](https://github.com/mlc-ai/web-llm) running a small quantized model (Phi-3-mini / Llama-3.2-3B) entirely in the browser via WebGPU. No server ever answers a tutoring question. Verifiable live: open devtools → Network → offline, and the tutor keeps responding.
- **Multiple subjects, one model** — Algebra, Basic Physics, and English Grammar are config objects (`src/data/subjects.ts`), not separate code paths. Deliberately chosen because they stress a small model differently: multi-step numeric reasoning, conceptual explanation, and language judgment.
- **A teacher review panel** — every tutor answer gets a lightweight confidence signal; low-confidence ones are flagged automatically for a teacher to approve or correct, fully offline, syncing only when connectivity returns.
- **True offline-first architecture, not just caching** — a service worker (`vite-plugin-pwa`) precaches the app shell and model weights so the app boots from a cold start with no network at all; IndexedDB (via Dexie) holds all chat history and flagged items locally; the Cache API stores downloaded lesson videos for offline playback. None of this depends on a server responding — sync is a strictly additive step that only runs when a connection exists.

## Demo flow

1. Pick a subject, ask a question, get an on-device answer.
2. Flag or unflag an answer for teacher review.
3. Switch to the Teacher Review tab, approve or correct it.
4. Download a lesson video while online.
5. **Turn on airplane mode.** Ask another question. Play the downloaded video. Nothing breaks.
6. Reconnect — flagged items sync (see `src/lib/sync.ts` once wired).

## Stack

React + TypeScript + Vite · WebLLM · Dexie (IndexedDB) · Cache API · Tailwind · vite-plugin-pwa

## Running it

```bash
npm install
npm run dev
```

WebGPU is required for on-device inference — use a recent Chrome/Edge. First load downloads the model weights (a few hundred MB, one-time, then cached forever offline).

## Honest limitation

A 3B-class quantized model is genuinely capable across these three subjects, but it visibly strains on multi-step algebra word problems compared to conceptual physics or grammar questions — a larger or fine-tuned model would close that gap. Naming that trade-off matters more than pretending it isn't there.
