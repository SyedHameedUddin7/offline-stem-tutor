import { describe, expect, it, vi } from "vitest";

/**
 * A download cut off by a dropped connection must be retryable once signal
 * returns, without reloading the page. The first attempt here fails the way
 * a network error does; the second must actually try again.
 */
const pipeline = vi.fn();
vi.mock("@huggingface/transformers", () => ({ env: {}, pipeline }));
vi.mock("./capability", () => ({ detectWebGPU: async () => false }));

const { embed, getEmbedderStatus } = await import("./embeddings");

describe("embedder loading", () => {
  it("retries after a failed load instead of replaying the failure", async () => {
    // The loader logs each failed device; expected here, so kept out of CI output.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    pipeline.mockRejectedValueOnce(new Error("Failed to fetch"));
    await expect(embed(["hello"])).rejects.toThrow("Failed to fetch");
    expect(getEmbedderStatus().state).toBe("failed");

    const extractor = vi.fn(async () => ({ tolist: () => [[1, 0]] }));
    pipeline.mockResolvedValueOnce(extractor);
    await expect(embed(["hello"])).resolves.toEqual([[1, 0]]);
    expect(getEmbedderStatus()).toEqual({ state: "ready", device: "wasm" });
    expect(pipeline).toHaveBeenCalledTimes(2);
  });
});
