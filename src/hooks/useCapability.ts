import { useEffect, useState } from "react";
import { detectCapability, isLowBandwidth, type DeviceCapability } from "../lib/capability";

/**
 * Device capability, re-read when the connection changes.
 *
 * The `change` listener matters on the target hardware: a phone that walks
 * out of 4G into 2G mid-session should start warning about download sizes it
 * was happy to offer a minute earlier.
 */
export function useCapability(): { capability: DeviceCapability | null; lowBandwidth: boolean } {
  const [capability, setCapability] = useState<DeviceCapability | null>(null);

  useEffect(() => {
    let live = true;
    const read = () => {
      detectCapability()
        .then((c) => live && setCapability(c))
        .catch(() => undefined);
    };
    read();

    const connection = (
      navigator as Navigator & { connection?: { addEventListener?: typeof addEventListener; removeEventListener?: typeof removeEventListener } }
    ).connection;
    connection?.addEventListener?.("change", read);
    return () => {
      live = false;
      connection?.removeEventListener?.("change", read);
    };
  }, []);

  return { capability, lowBandwidth: capability ? isLowBandwidth(capability) : false };
}
