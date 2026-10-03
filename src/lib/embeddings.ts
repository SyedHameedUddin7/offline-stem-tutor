import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import { detectWebGPU } from "./capability";

/**
 * On-device text embeddings.
 *
 * Runs on plain WASM — no WebGPU required. That single fact is what makes the
 * bottom rung of the ladder real: a phone that cannot host a 1.5B language
 * model can still search the verified answer bank and give the student a
 * teacher-approved answer, offline, where a "just run an LLM on-device"
 * design would have left a blank screen.
 *
 * Weights are fetched once from the Hugging Face CDN and cached by
 * transformers.js in the Cache API, so every load after the first is offline.
 */

/**
 * Multilingual, and it has to be.
 *
 * all-MiniLM-L6-v2 is 22MB and excellent — in English only. Measured against
 * the same bank with French questions, its scores collapsed to 0.21-0.30:
 * below even the weak threshold, so a French-speaking student got "I don't
 * have a verified method" for questions the bank answers perfectly. A tutor
 * for Bamako that silently fails in French is not a tutor for Bamako.
 *
 * paraphrase-multilingual-MiniLM-L12-v2 is ~128MB quantised (112MB weights +
 * a 16MB tokenizer — the vocabulary is the expensive part of going
 * multilingual). Six times bigger, still a thirteenth of the language model,
 * and it retrieves cross-lingually: a French question finds the right
 * English exemplar. That last property is worth more than it sounds. One
 * bank serves both languages, so the corpus does not have to be maintained
 * twice and cannot drift between them.
 */
export const EMBEDDING_MODEL_ID = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

/** Output dimensionality (unchanged from the English model). */
export const EMBEDDING_DIM = 384;

export type EmbedderStatus =
  | { state: "idle" }
  | { state: "loading"; progress: number; note: string }
  | { state: "ready"; device: "webgpu" | "wasm" }
  | { state: "failed"; error: string };

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;
let currentStatus: EmbedderStatus = { state: "idle" };
const listeners = new Set<(s: EmbedderStatus) => void>();

function setStatus(next: EmbedderStatus) {
  currentStatus = next;
  listeners.forEach((fn) => fn(next));
}

export function getEmbedderStatus(): EmbedderStatus {
  return currentStatus;
}

export function onEmbedderStatus(fn: (s: EmbedderStatus) => void): () => void {
  listeners.add(fn);
  fn(currentStatus);
  return () => listeners.delete(fn);
}

/**
 * Load the embedder once, preferring WebGPU but falling back to WASM.
 *
 * The fallback is not defensive boilerplate — WASM is the expected path on the
 * target hardware, and the WebGPU attempt is the optimisation.
 */
async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractorPromise) return extractorPromise;

  extractorPromise = (async () => {
    // Dynamic import, deliberately.
    //
    // transformers.js drags the ONNX runtime behind it — over a megabyte of
    // JS and a 21MB wasm binary. Static-importing that would mean every
    // student pays for the inference stack before the app renders its first
    // screen, on a connection where the app shell itself is the expensive
    // part. It loads when something actually needs to embed, and not before.
    const { env, pipeline } = await import("@huggingface/transformers");

    // Never look for model files on our own origin — we do not ship them.
    env.allowLocalModels = false;

    const preferWebGPU = await detectWebGPU();
    const devices: Array<"webgpu" | "wasm"> = preferWebGPU ? ["webgpu", "wasm"] : ["wasm"];
    let lastError: unknown;

    for (const device of devices) {
      try {
        setStatus({
          state: "loading",
          progress: 0,
          note: `preparing search index (${device})`,
        });

        const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL_ID, {
          device,
          dtype: "q8",
          progress_callback: (report: { status?: string; progress?: number }) => {
            if (report.status === "progress" && typeof report.progress === "number") {
              setStatus({
                state: "loading",
                progress: report.progress / 100,
                note: `downloading search model (${device})`,
              });
            }
          },
        });

        setStatus({ state: "ready", device });
        return extractor;
      } catch (err) {
        lastError = err;
        console.warn(`Embedder failed to initialise on ${device}, trying next`, err);
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    setStatus({ state: "failed", error: message });
    throw new Error(`Could not initialise embedder: ${message}`);
  })();

  return extractorPromise;
}

/**
 * Embed a batch of texts into unit-length vectors.
 *
 * Mean pooling plus L2 normalisation is what all-MiniLM expects, and the
 * normalisation is what lets cosine similarity collapse into a plain dot
 * product downstream.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embed([text]);
  return vector;
}

/**
 * Cosine similarity. Both vectors are already unit-length coming out of
 * `embed`, so this is a dot product — worth stating, because the missing
 * magnitude division looks like a bug otherwise.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
