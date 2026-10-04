import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// This project's whole thesis is "works with zero network."
// The PWA plugin is what makes that literally true: it precaches the
// app shell so the tutor loads from a cold start with no connection at all.
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Give the two inference runtimes stable, predictable chunk names.
        //
        // Without this they come out as index-<hash>.js, indistinguishable
        // from the app entry, and the service worker config below has no way
        // to say "precache the shell but not the 6MB model runtime". Naming
        // them is what makes the caching policy expressible.
        manualChunks(id) {
          if (id.includes("@mlc-ai/web-llm")) return "webllm";
          if (id.includes("@huggingface/transformers") || id.includes("onnxruntime")) {
            return "transformers";
          }
        },
      },
    },
    // The shell is small; the deliberately-excluded runtimes are not. Warning
    // on them every build would just train us to ignore the warning.
    chunkSizeWarningLimit: 1024,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Registered by hand in src/lib/serviceWorker.ts instead of via an
      // injected script, so the app can observe when precaching finishes
      // and actually tell the user they are ready to go offline. Without
      // that signal, "is it safe to disconnect yet?" is unanswerable.
      injectRegister: null,
      includeAssets: ["favicon.png"],
      manifest: {
        name: "Offline STEM Tutor",
        short_name: "STEM Tutor",
        description:
          "An AI STEM tutor that keeps working with no signal, no server, and no assumptions about the network.",
        theme_color: "#12172B",
        background_color: "#12172B",
        display: "standalone",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          // Maskable so Android can crop to a circle or squircle without
          // slicing the glyph. Without one, the launcher icon gets a white
          // box around it, which looks broken on exactly the devices this
          // app is for.
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the app shell only.
        //
        // Two things are deliberately NOT handled here:
        //
        //  - Model weights. WebLLM maintains its own Cache API store keyed by
        //    model id, with its own integrity and progress handling. A
        //    duplicate CacheFirst route would quietly store a second copy of
        //    roughly a gigabyte on a phone that does not have a spare
        //    gigabyte.
        //
        //  - Lesson videos. Those are downloaded on purpose, by the student or
        //    teacher, with a visible byte cost (see LessonsPane). Caching them
        //    as a side effect of playback is the opposite of what a metered
        //    connection deserves.
        //
        // Both of those are the app's business, not the service worker's. The
        // service worker's one job is making sure the shell boots with the
        // radio off.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],

        // The inference runtime is lazy-loaded and must not be part of the
        // first-visit cost. A student who only watches a downloaded video
        // should never pay for the ONNX stack.
        globIgnores: ["**/transformers-*.js", "**/webllm-*.js", "**/ort-wasm*"],

        runtimeCaching: [
          {
            // ...but once something HAS pulled the runtime in, keep it.
            //
            // This is not the same call as weights and videos. Those are
            // content, with a size a student should decide about. This is
            // infrastructure: by the time it is fetched, the student has
            // already chosen to use the feature, and failing to cache it
            // would mean re-downloading 21MB the next time they open the app
            // — the exact behaviour this project exists to argue against.
            urlPattern: ({ url }: { url: URL }) =>
              url.origin === self.location.origin &&
              (url.pathname.endsWith(".wasm") ||
                /\/(transformers|webllm)-[\w-]+\.js$/.test(url.pathname)),
            handler: "CacheFirst",
            options: {
              cacheName: "inference-runtime-v1",
              expiration: { maxEntries: 12 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
