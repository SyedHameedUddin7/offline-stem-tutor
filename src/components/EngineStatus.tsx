import { useEffect, useState } from "react";
import { getEmbedderStatus, onEmbedderStatus, type EmbedderStatus } from "../lib/embeddings";
import { detectCapability, type DeviceCapability } from "../lib/capability";
import { useLang } from "../i18n/LanguageContext";

/**
 * The capability ladder, shown rather than hidden.
 *
 * A demo on a laptop with WebGPU tells you nothing about a shared Android
 * phone in a pod, so the app states out loud which rung it managed to reach
 * on *this* device. A student who can see "verified answer bank, no model"
 * understands why the answers look the way they do; a student staring at a
 * blank screen just thinks the app is broken.
 */
export function EngineStatus() {
  const { lang } = useLang();
  const [capability, setCapability] = useState<DeviceCapability | null>(null);
  const [embedder, setEmbedder] = useState<EmbedderStatus>(getEmbedderStatus());

  useEffect(() => {
    detectCapability().then(setCapability).catch(() => setCapability(null));
    return onEmbedderStatus(setEmbedder);
  }, []);

  const rung = capability?.webgpu ? "webgpu" : "cpu";

  const fr = lang === "fr";
  let detail: string;
  let tone: string;
  switch (embedder.state) {
    case "loading":
      detail = `${embedder.note} ${Math.round(embedder.progress * 100)}%`;
      tone = "text-solar";
      break;
    case "ready":
      detail = `${fr ? "banque prête" : "answer bank ready"} · ${embedder.device}`;
      tone = "text-signal";
      break;
    case "failed":
      detail = fr ? "recherche indisponible" : "search unavailable on this device";
      tone = "text-danger";
      break;
    default:
      detail = capability
        ? capability.webgpu
          ? fr
            ? "webgpu disponible"
            : "webgpu available"
          : fr
            ? "pas de webgpu — mode cpu"
            : "no webgpu — cpu tier"
        : fr
          ? "vérification de l'appareil…"
          : "checking device…";
      tone = "text-muted";
  }

  return (
    <div
      className="flex items-center gap-2 rounded-card border border-white/5 bg-night-surface/80 px-3 py-1.5"
      role="status"
      aria-live="polite"
    >
      <span className="font-mono text-[0.7rem] font-medium uppercase text-paper/70">{rung}</span>
      <span className={`font-mono text-[0.625rem] ${tone}`}>{detail}</span>
    </div>
  );
}
