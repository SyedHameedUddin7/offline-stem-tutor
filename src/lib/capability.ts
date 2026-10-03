/**
 * Device capability detection — the top of the ladder.
 *
 * The premise of this whole module: the machine a demo runs on is not the
 * machine a student runs on. WebGPU is comfortable on a developer laptop and
 * absent on most of the shared, low-end Android phones these pods actually
 * use. So the app asks what it is running on, picks the best rung it can
 * reach, and then says so in the interface rather than failing silently.
 */

export interface DeviceCapability {
  webgpu: boolean;
  /** Enough headroom to consider a multi-hundred-megabyte model download. */
  storageEstimateBytes: number | null;
  /** Effective connection type, when the browser will tell us ("4g", "2g"…). */
  effectiveType: string | null;
  /** True when the user has asked the OS to conserve data. */
  saveData: boolean;
}

/**
 * Real capability check, not a feature-flag sniff: `navigator.gpu` can exist
 * while `requestAdapter()` still returns null (blocklisted driver, software
 * rendering disabled, headless context). Only an adapter proves anything.
 */
export async function detectWebGPU(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return Boolean(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

interface NetworkInformation {
  effectiveType?: string;
  saveData?: boolean;
}

/**
 * Is this connection one where a large download would be a problem?
 *
 * `saveData` is the user explicitly asking the OS to conserve data, and is
 * treated as decisive — it is a stated preference, not an inference.
 * `effectiveType` is the browser's own estimate of throughput; 3g and below
 * is where a 128MB download stops being a wait and starts being an evening.
 *
 * This NEVER blocks anything. The app's job is to make the cost visible
 * before the tap, not to decide on the student's behalf that they cannot
 * afford it — a facilitator on a slow link may still want the model, and
 * would rightly be annoyed by an app that refused.
 */
export function isLowBandwidth(capability: DeviceCapability): boolean {
  if (capability.saveData) return true;
  return (
    capability.effectiveType === "slow-2g" ||
    capability.effectiveType === "2g" ||
    capability.effectiveType === "3g"
  );
}

/** Rough wait for a download, for showing a cost before the tap. */
export function estimateMinutes(megabytes: number, effectiveType: string | null): number | null {
  // Conservative real-world throughput, well below the theoretical peaks.
  const mbPerMinute: Record<string, number> = {
    "slow-2g": 0.2,
    "2g": 0.5,
    "3g": 5,
    "4g": 30,
  };
  const rate = effectiveType ? mbPerMinute[effectiveType] : undefined;
  if (!rate) return null;
  return Math.max(1, Math.round(megabytes / rate));
}

export async function detectCapability(): Promise<DeviceCapability> {
  const webgpu = await detectWebGPU();

  let storageEstimateBytes: number | null = null;
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (estimate?.quota != null && estimate.usage != null) {
      storageEstimateBytes = estimate.quota - estimate.usage;
    }
  } catch {
    // Storage estimation is best-effort; its absence is not an error.
  }

  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;

  return {
    webgpu,
    storageEstimateBytes,
    effectiveType: connection?.effectiveType ?? null,
    saveData: Boolean(connection?.saveData),
  };
}
