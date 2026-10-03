import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // fake-indexeddb has to be installed before any module that constructs a
    // Dexie instance at import time, which src/lib/db.ts does.
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
  },
});
