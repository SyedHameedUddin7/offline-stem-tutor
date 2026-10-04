/**
 * Installing the app, and why this app cares more than most.
 *
 * On a laptop, closing the browser and returning keeps IndexedDB. On a
 * phone it frequently does not, and the reasons are specific:
 *
 *  - An in-app browser (a link tapped inside WhatsApp, Gmail, Slack) often
 *    has ephemeral storage discarded when the host app closes, in a
 *    container separate from the real browser, and may not register a
 *    service worker at all.
 *  - iOS gives non-installed sites weak storage guarantees and evicts
 *    aggressively under pressure.
 *
 * Installing fixes both: a Home Screen app gets a durable storage
 * container, and on Chrome being installed is one of the strongest signals
 * for granting navigator.storage.persist(). For a device going into a pod
 * for a week, installed is not a nicety — it is the supported
 * configuration.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState =
  /** Already running as an installed app. Nothing to do. */
  | "installed"
  /** The browser offered a programmatic install. */
  | "available"
  /** iOS Safari: installable, but only through the Share menu by hand. */
  | "manual-ios"
  /** An in-app browser — storage here is often discarded. Needs escaping. */
  | "in-app-browser"
  /** Not installable here, and that is not something we can fix. */
  | "unavailable";

let deferred: BeforeInstallPromptEvent | null = null;
let current: InstallState = "unavailable";
const listeners = new Set<(s: InstallState) => void>();

function set(next: InstallState) {
  if (next === current) return;
  current = next;
  listeners.forEach((fn) => fn(next));
}

export function getInstallState(): InstallState {
  return current;
}

export function onInstallState(fn: (s: InstallState) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS predates the standard and still reports it here.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as a Mac; the touch point count gives it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Detect an embedded browser.
 *
 * Deliberately conservative — a false positive tells someone to open a link
 * they are already viewing correctly, which is merely annoying, while a
 * false negative lets them keep losing data. Matches the in-app browsers
 * common wherever a demo link gets shared.
 */
function isInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  if (/FBAN|FBAV|Instagram|Line\/|Twitter|WhatsApp|Snapchat|LinkedInApp|Slack/i.test(ua)) {
    return true;
  }
  // iOS WKWebView: Safari-like but without "Safari" in the UA string.
  if (isIOS() && /AppleWebKit/.test(ua) && !/Safari/.test(ua) && !isStandalone()) {
    return true;
  }
  return false;
}

export function initInstallState(): void {
  if (isStandalone()) {
    set("installed");
    return;
  }
  if (isInAppBrowser()) {
    set("in-app-browser");
    return;
  }
  if (isIOS()) {
    set("manual-ios");
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    set("available");
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    set("installed");
  });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  if (outcome === "accepted") set("installed");
  return outcome === "accepted";
}
