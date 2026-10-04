/**
 * Runs the evaluation dataset and prints a report.
 *
 * Bundles the TypeScript with esbuild rather than requiring a build step,
 * so `npm run eval` works from a clean checkout. Retrieval cases are
 * skipped here because they need the 128MB embedder; the Vitest suite
 * covers them with a deterministic stand-in.
 */
import * as esbuild from "esbuild";
import { pathToFileURL } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const out = path.join(mkdtempSync(path.join(tmpdir(), "eval-")), "eval.mjs");
await esbuild.build({
  entryPoints: ["src/eval/runner.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: out,
  logLevel: "error",
});

const { runEvaluation, formatReport } = await import(pathToFileURL(out).href);
const metrics = await runEvaluation();
console.log(formatReport(metrics));

if (metrics.failed > 0) {
  console.error(`\n${metrics.failed} evaluation case(s) failed.`);
  process.exit(1);
}
