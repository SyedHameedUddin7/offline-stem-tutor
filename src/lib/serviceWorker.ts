import { registerSW } from "virtual:pwa-register";

/**
 * Service worker registration, with the one piece of state the user needs.
 *
 * The default injected registration script works, but it is silent. That
 * silence is a real usability problem for this app specifically: a
 * facilitator about to walk out of coverage has no way to know whether the
 * 872KB of shell has finished caching. "I opened it and then went offline
 * and it didn't work" is the predictable result — the service worker had not
 * finished installing, and nothing said so.
 *
 * So registration happens here, and `onOfflineReady` is surfaced to the UI.
 */

export type SwState =
  /** No service worker yet — this page load came from the network. */
  | "registering"
  /** Precaching finished. The app will now boot with no connection. */
  | "offline-ready"
  /** A new version is waiting; reload to take it. */
  | "update-available"
  /** Unsupported browser, or registration failed. */
  | "unavailable";

let current: SwState = "registering";
const listeners = new Set<(s: SwState) => void>();

function set(next: SwState) {
  current = next;
  listeners.forEach((fn) => fn(next));
}

export function getSwState(): SwState {
  return current;
}

export function onSwState(fn: (s: SwState) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

let updateSW: ((reload?: boolean) => Promise<void>) | null = null;

/** Apply a waiting update and reload. */
export async function applyUpdate(): Promise<void> {
  await updateSW?.(true);
}

export function initServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    set("unavailable");
    return;
  }

  updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      set("offline-ready");
    },
    onNeedRefresh() {
      set("update-available");
    },
    onRegisteredSW(_url, registration) {
      // onOfflineReady only fires on the install that does the precaching.
      // On every later visit the worker is already active, so without this
      // the app would claim it was still "registering" forever.
      if (registration?.active && !registration.installing) set("offline-ready");
    },
    onRegisterError(error) {
      console.error("Service worker registration failed", error);
      set("unavailable");
    },
  });
}
