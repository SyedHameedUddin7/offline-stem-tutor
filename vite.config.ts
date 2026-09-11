import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// This project's whole thesis is "works with zero network."
// The PWA plugin is what makes that literally true: it precaches the
// app shell so the tutor loads from a cold start with no connection at all.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Offline STEM Tutor",
        short_name: "STEM Tutor",
        description:
          "An AI STEM tutor that keeps working with no signal, no server, and no assumptions about the network.",
        theme_color: "#12172B",
        background_color: "#12172B",
        display: "standalone",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // Model weights are large; raise the default 2MB precache limit so
        // the shell + weights can actually be cached for true offline boot.
        maximumFileSizeToCacheInBytes: 200 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        runtimeCaching: [
          {
            // WebLLM fetches model weights from a CDN on first load.
            // CacheFirst means: once downloaded, never touch the network again.
            urlPattern: /^https:\/\/.*\.(wasm|bin|json)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "model-weights-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Lesson videos: same idea, separate cache so we can inspect/clear
            // it independently and show accurate "available offline" state.
            urlPattern: /\/videos\/.*\.(mp4|webm)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "lesson-video-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 180,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
