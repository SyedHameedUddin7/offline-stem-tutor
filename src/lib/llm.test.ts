import { beforeEach, describe, expect, it, vi } from "vitest";
import { modelCacheState, removeModel } from "./llm";

// WebLLM's own delete needs the shard manifest; a cut-off download has none.
vi.mock("@mlc-ai/web-llm", () => ({
  deleteModelAllInfoInCache: vi.fn(async () => {
    throw new Error("tensor-cache.json not found");
  }),
}));

/**
 * "Already downloaded — loading uses no data" must mean every weight shard is
 * on the device. A download cut off partway used to earn the same label, and
 * tapping it then pulled the rest of 1.6GB over a metered connection.
 */
const MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const BASE = `https://huggingface.co/mlc-ai/${MODEL}/resolve/main/`;
const SHARDS = ["params_shard_0.bin", "params_shard_1.bin", "params_shard_2.bin"];

function fakeCaches(initial: string[]) {
  const urls = [...initial];
  const manifest = { records: SHARDS.map((dataPath) => ({ dataPath })) };
  const cache = {
    keys: async () => urls.map((url) => ({ url })),
    delete: async (req: { url: string }) => {
      urls.splice(urls.indexOf(req.url), 1);
      return true;
    },
    match: async (req: { url: string }) =>
      urls.includes(req.url) ? { json: async () => manifest } : undefined,
  };
  vi.stubGlobal("caches", {
    keys: async () => (urls.length ? ["webllm/model"] : []),
    open: async () => cache,
  });
  return urls;
}

beforeEach(() => {
  vi.stubGlobal("window", globalThis);
});

describe("modelCacheState", () => {
  it("is complete only when every shard in the manifest is cached", async () => {
    fakeCaches([`${BASE}tensor-cache.json`, ...SHARDS.map((s) => BASE + s)]);
    expect(await modelCacheState(MODEL)).toBe("complete");
  });

  it("is partial when the download stopped before the last shard", async () => {
    fakeCaches([`${BASE}tensor-cache.json`, BASE + SHARDS[0]]);
    expect(await modelCacheState(MODEL)).toBe("partial");
  });

  it("is partial when not even the manifest arrived", async () => {
    fakeCaches([`${BASE}mlc-chat-config.json`]);
    expect(await modelCacheState(MODEL)).toBe("partial");
  });

  it("is none when nothing for this model is cached", async () => {
    fakeCaches([]);
    expect(await modelCacheState(MODEL)).toBe("none");
  });
});

describe("removeModel", () => {
  it("frees a partial download even when WebLLM's own delete fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const other = "https://huggingface.co/mlc-ai/Other-Model-MLC/resolve/main/params_shard_0.bin";
    const left = fakeCaches([BASE + SHARDS[0], BASE + "mlc-chat-config.json", other]);
    await removeModel(MODEL);
    expect(left).toEqual([other]);
  });
});
