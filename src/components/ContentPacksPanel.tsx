import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { importPack, listPacks, removePack } from "../lib/contentPacks";
import { isQuotaError } from "../lib/storagePersistence";
import { useLang } from "../i18n/LanguageContext";

/**
 * Import a teacher's curriculum pack from a file. The pack is validated in
 * full first; a rejected file leaves the device exactly as it was, and the
 * reasons are shown so whoever made the file can fix it.
 */
export function ContentPacksPanel() {
  const { t } = useLang();
  const packs = useLiveQuery(listPacks, [], []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setBusy(true);
    try {
      const r = await importPack(await file.text());
      setMessage(
        r.ok
          ? { ok: true, lines: [t.packsImported(r.pack.title, r.counts.lessons, r.counts.questions, r.counts.flashcards)] }
          : { ok: false, lines: [t.packsRejected, ...r.errors] }
      );
    } catch (err) {
      setMessage({ ok: false, lines: [t.packsRejected, isQuotaError(err) ? t.storageFull : String(err)] });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-card border border-white/10 bg-night-surface p-4">
      <h3 className="font-display text-sm font-semibold text-paper">{t.packsTitle}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{t.packsBlurb}</p>
      <div className="mt-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-card border border-signal/40 px-3 py-2 text-xs font-medium text-signal disabled:opacity-40"
        >
          {t.packsImport}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
        }} />
      </div>
      {message && (
        <div className={`mt-3 rounded-card border p-3 text-xs ${message.ok ? "border-signal/20 bg-signal/5 text-paper/85" : "border-danger/30 bg-danger/5 text-paper/85"}`}>
          {message.lines.map((l, i) => <p key={i} className={i === 0 ? "" : "mt-0.5 font-mono text-[0.65rem] text-muted"}>{l}</p>)}
        </div>
      )}
      <ul className="mt-3 space-y-1 text-xs text-paper/80">
        {packs.length === 0 && <li className="text-muted">{t.packsNone}</li>}
        {packs.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-white/5 bg-night px-3 py-2">
            <span>
              <span className="font-medium text-paper">{p.title}</span> · v{p.version} · {p.provenance} ·{" "}
              {p.lessons.length + p.questions.length + p.flashcards.length}
            </span>
            <button onClick={() => void removePack(p.id)} className="font-mono text-[0.65rem] uppercase text-muted underline decoration-dotted underline-offset-2 hover:text-danger">
              {t.packsRemove}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
