import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import { detectCapability, detectWebGPU } from "./capability";

/**
 * The on-device language model — the top rung of the ladder.
 *
 * Weights are downloaded once from the MLC CDN and stored by WebLLM in the
 * Cache API. After that the model answers with the radio off, forever: no
 * server is asked a tutoring question at any point, online or not.
 *
 * WebGPU is required, and that is exactly the constraint this project is
 * about. On a device without it, nothing here runs and the app falls to the
 * answer-bank tier rather than showing a blank screen.
 */

export interface ModelChoice {
  id: string;
  label: string;
  /** One-time download, roughly. Shown to the student before they commit. */
  downloadMB: number;
  note: string;
}

/**
 * Two rungs, not one.
 *
 * Qwen2.5-1.5B is markedly better at multi-step arithmetic than anything
 * smaller, which matters when the subject is algebra. But 1.6GB is a real
 * amount of storage on a shared phone, so there is a lighter option that
 * still reasons acceptably for conceptual physics and biology questions.
 * The student picks; the app does not decide for them behind their back.
 */
export const MODELS: ModelChoice[] = [
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Standard",
    downloadMB: 1630,
    note: "Best at multi-step maths. Needs about 1.6GB free.",
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Light",
    downloadMB: 880,
    note: "Half the size, weaker on arithmetic. For tight storage.",
  },
];

export const DEFAULT_MODEL_ID = MODELS[0].id;

export type LlmStatus =
  | { state: "idle" }
  | { state: "unsupported"; reason: string }
  | { state: "loading"; progress: number; note: string }
  | { state: "ready"; modelId: string }
  | { state: "failed"; error: string };

let engine: MLCEngineInterface | null = null;
let enginePromise: Promise<MLCEngineInterface> | null = null;
let loadedModelId: string | null = null;

let currentStatus: LlmStatus = { state: "idle" };
const listeners = new Set<(s: LlmStatus) => void>();

function setStatus(next: LlmStatus) {
  currentStatus = next;
  listeners.forEach((fn) => fn(next));
}

export function getLlmStatus(): LlmStatus {
  return currentStatus;
}

export function onLlmStatus(fn: (s: LlmStatus) => void): () => void {
  listeners.add(fn);
  fn(currentStatus);
  return () => listeners.delete(fn);
}

export function isLlmReady(): boolean {
  return engine !== null && currentStatus.state === "ready";
}

export function loadedModel(): string | null {
  return loadedModelId;
}

export type ModelCacheState = "complete" | "partial" | "none";

/**
 * How much of this model is already on the device.
 *
 * Worth knowing before offering a download button: on a metered connection
 * the difference between "start" and "resume from cache" is the difference
 * between a 1.6GB bill and none. WebLLM keeps its weights in the Cache API,
 * so the question is answerable locally, offline, in milliseconds.
 *
 * "Complete" means every weight shard listed in the model's tensor-cache
 * manifest is present. It used to mean "any file for this model is cached",
 * so a download cut off at 5% was labelled "already downloaded — loading
 * uses no data", and tapping it then pulled the remaining 1.5GB. WebLLM's own
 * hasModelInCache does this same check, but importing it means loading the
 * 6MB runtime just to label a button.
 */
export async function modelCacheState(modelId: string): Promise<ModelCacheState> {
  if (!("caches" in window)) return "none";
  let partial = false;
  try {
    for (const name of await caches.keys()) {
      if (!name.includes("webllm")) continue;
      const cache = await caches.open(name);
      const keys = (await cache.keys()).filter((req) => req.url.includes(modelId));
      if (keys.length === 0) continue;
      partial = true;
      const manifest = keys.find((req) => /\/(tensor|ndarray)-cache\.json$/.test(req.url));
      if (!manifest) continue;
      const records: Array<{ dataPath: string }> =
        (await (await cache.match(manifest))?.json())?.records ?? [];
      const have = new Set(keys.map((req) => req.url));
      if (records.length > 0 && records.every((r) => have.has(new URL(r.dataPath, manifest.url).href))) {
        return "complete";
      }
    }
  } catch {
    // Cache inspection is an optimisation; failing it is not an error.
  }
  return partial ? "partial" : "none";
}

export async function isModelCached(modelId: string): Promise<boolean> {
  return (await modelCacheState(modelId)) === "complete";
}

/**
 * Delete a model's weights from the device.
 *
 * Without this the only way to get 1.6GB back on a shared phone was clearing
 * the site's data, which also deletes every learner and their history.
 */
export async function removeModel(modelId: string): Promise<void> {
  if (loadedModelId === modelId) await unloadLlm();
  try {
    const { deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm");
    await deleteModelAllInfoInCache(modelId);
  } catch (err) {
    // WebLLM reads the shard manifest to know what to delete, so a download
    // cut off before the manifest arrived makes it throw. The sweep below
    // still frees the space.
    console.warn("WebLLM could not remove the model; clearing its cache entries directly", err);
  }
  for (const name of await caches.keys()) {
    if (!name.includes("webllm")) continue;
    const cache = await caches.open(name);
    for (const req of await cache.keys()) {
      if (req.url.includes(modelId)) await cache.delete(req);
    }
  }
}

/**
 * Load the model, reporting download progress.
 *
 * Progress reporting is not decoration here. This is a multi-hundred-megabyte
 * download over a connection that may be 2G, and the difference between a
 * progress bar and a spinner is whether the student believes the app is
 * working or broken.
 */
export async function initLlm(modelId: string = DEFAULT_MODEL_ID): Promise<MLCEngineInterface> {
  if (engine && loadedModelId === modelId) return engine;
  if (enginePromise && loadedModelId === modelId) return enginePromise;

  loadedModelId = modelId;
  enginePromise = (async () => {
    if (!(await detectWebGPU())) {
      const reason =
        "This device has no WebGPU, so it cannot run a language model in the browser.";
      setStatus({ state: "unsupported", reason });
      throw new Error(reason);
    }

    setStatus({ state: "loading", progress: 0, note: "starting" });

    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const created = await CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          setStatus({
            state: "loading",
            progress: typeof report.progress === "number" ? report.progress : 0,
            note: report.text ?? "loading model",
          });
        },
      });
      engine = created;
      setStatus({ state: "ready", modelId });
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      engine = null;
      enginePromise = null;
      loadedModelId = null;
      setStatus({ state: "failed", error: message });
      throw err;
    }
  })();

  return enginePromise;
}

/**
 * Free the model's GPU memory.
 *
 * On a shared phone that is running three other things, holding ~1.6GB of
 * VRAM after the student has finished a session is antisocial.
 */
export async function unloadLlm(): Promise<void> {
  if (!engine) return;
  await engine.unload();
  engine = null;
  enginePromise = null;
  loadedModelId = null;
  setStatus({ state: "idle" });
}

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  /** Called with the growing text as tokens arrive. */
  onToken?: (partial: string) => void;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Stream a completion.
 *
 * Streaming rather than awaiting the whole answer, because a 1.5B model on
 * integrated graphics produces maybe 10-20 tokens a second. Waiting for a
 * complete multi-step algebra explanation in silence feels broken; watching
 * it arrive feels like a tutor thinking.
 */
export async function generate({
  systemPrompt,
  userPrompt,
  onToken,
  temperature = 0.3,
  maxTokens = 768,
}: GenerateOptions): Promise<string> {
  const active = engine ?? (await initLlm(loadedModelId ?? DEFAULT_MODEL_ID));

  const stream = await active.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    // Low temperature on purpose: this is a tutor, not a writing partner.
    // Creative variance in a worked solution is just a wrong answer.
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });

  let text = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      text += delta;
      onToken?.(text);
    }
  }
  return text.trim();
}

/**
 * Pick a sensible default model for this device.
 *
 * Uses the storage estimate rather than assuming: a phone with 600MB free
 * should be offered the light model, not shown a 1.6GB download it will fail
 * halfway through.
 */
export async function suggestModel(): Promise<ModelChoice> {
  const capability = await detectCapability();
  const freeMB =
    capability.storageEstimateBytes != null
      ? capability.storageEstimateBytes / (1024 * 1024)
      : null;

  if (freeMB != null && freeMB < MODELS[0].downloadMB * 1.5) return MODELS[1];
  if (capability.saveData) return MODELS[1];
  return MODELS[0];
}
