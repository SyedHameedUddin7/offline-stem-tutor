import { useEffect, useState } from "react";
import type { ConnectivityState } from "../types";

/**
 * Deliberately uses the browser's real navigator.onLine + online/offline
 * events — not a mocked toggle — so that flipping airplane mode in a demo
 * (or devtools' Network > Offline) is reflected truthfully everywhere this
 * hook is used. This is the thing an interviewer should be able to test
 * themselves, live, and trust.
 */
export function useConnectivity(): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>(
    navigator.onLine ? "online" : "offline"
  );

  useEffect(() => {
    const goOnline = () => setState("online");
    const goOffline = () => setState("offline");

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return state;
}
