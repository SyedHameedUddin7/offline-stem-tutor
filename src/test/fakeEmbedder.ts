/**
 * A deterministic stand-in for the embedding model.
 *
 * The real embedder is a 128MB download and several seconds of CPU per run,
 * which makes it unusable in a test suite that should finish in under a
 * second. But the things most worth testing are not the model's weights —
 * they are the POLICIES built on top of it: the grounded/weak/none bands, the
 * out-of-domain margin, the cross-chapter cap, the cache invalidation, the
 * teacher flywheel. Those need a similarity function that is sane and
 * repeatable, not one that is good.
 *
 * So this hashes word stems into a fixed-width vector and normalises. Texts
 * sharing vocabulary score high; unrelated texts score near zero. Crude, but
 * deterministic and directional, which is exactly what policy tests need.
 *
 * The real model's behaviour is checked separately, against the real corpus,
 * by the calibration scripts whose measured numbers are recorded in the
 * threshold comments in lib/retrieval.ts.
 */

const DIM = 96;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function hash(word: string): number {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % DIM;
}

export function fakeEmbedOne(text: string): number[] {
  const vector = new Array<number>(DIM).fill(0);
  for (const word of tokenize(text)) vector[hash(word)] += 1;
  const norm = Math.hypot(...vector);
  return norm === 0 ? vector : vector.map((v) => v / norm);
}

export function fakeEmbed(texts: string[]): number[][] {
  return texts.map(fakeEmbedOne);
}

export function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export const FAKE_MODEL_ID = "test/fake-embedder-v1";
