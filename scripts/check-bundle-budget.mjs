import { readFileSync, statSync } from "node:fs";

/**
 * Fails the build if a first visit would download too much.
 *
 * This project's central claim is that the core tutor works offline without
 * downloading a language model. The way that claim breaks is not dramatic:
 * someone adds a plain `import` of transformers.js or WebLLM at the top of a
 * module, the bundler folds megabytes into the entry chunk, and the precache
 * quietly grows from under a megabyte to tens of them. Nothing errors, the
 * tests still pass, and only a first-time visitor on a 2G connection
 * notices.
 *
 * So the budget is asserted in CI rather than trusted.
 */
const PRECACHE_BUDGET_KB = 1200;

const sw = readFileSync("dist/sw.js", "utf8");
const urls = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);

if (urls.length === 0) {
  console.error("FAIL: could not read the precache manifest from dist/sw.js");
  process.exit(1);
}

let total = 0;
const entries = urls.map((url) => {
  const bytes = statSync(`dist/${url}`).size;
  total += bytes;
  return { url, bytes };
});

const totalKb = total / 1024;
entries.sort((a, b) => b.bytes - a.bytes);

console.log(`Precached on first visit: ${entries.length} files, ${totalKb.toFixed(1)} KB`);
for (const { url, bytes } of entries.slice(0, 5)) {
  console.log(`  ${(bytes / 1024).toFixed(1).padStart(8)} KB  ${url}`);
}

// The runtimes are allowed to exist in dist — they are lazy-loaded — but a
// precached one means the lazy boundary has been broken.
const leaked = entries.filter((e) => /transformers|webllm|ort-wasm/.test(e.url));
if (leaked.length > 0) {
  console.error("\nFAIL: an inference runtime is in the precache manifest:");
  leaked.forEach((e) => console.error(`  ${e.url}`));
  console.error("Something now imports it statically. Make the import dynamic.");
  process.exit(1);
}

if (totalKb > PRECACHE_BUDGET_KB) {
  console.error(`\nFAIL: first-visit payload ${totalKb.toFixed(1)} KB exceeds ${PRECACHE_BUDGET_KB} KB.`);
  process.exit(1);
}

console.log(`\nOK: within the ${PRECACHE_BUDGET_KB} KB first-visit budget.`);
