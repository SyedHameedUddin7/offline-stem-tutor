import { useMemo, useState } from "react";
import { MATH_PROBLEM_TYPES, solveMaths } from "../lib/solvers/maths";
import { SHAPE_DIMENSIONS, SHAPE_QUANTITIES, DIMENSION_NAMES, measure, quantityName, shapeName, type Quantity, type Shape } from "../lib/solvers/maths/mensuration";
import { solveFormula, solvePhysics, type Known } from "../lib/solvers/physics/engine";
import { FORMULAS, unitsFor } from "../lib/solvers/physics/formulas";
import { sayIn, type SolveOutcome } from "../lib/solvers/types";
import { useLang } from "../i18n/LanguageContext";
import { SolverResultCard } from "./SolverResultCard";
import type { SubjectId } from "../types";

/**
 * The structured way in: for a student whose question the chat could not
 * read, or who wants to work a formula through step by step.
 */
export function SolveView({ subjectId, chapterId }: { subjectId: SubjectId; chapterId: string }) {
  return (
    <div className="space-y-4">
      <FreeText subjectId={subjectId} chapterId={chapterId} />
      {chapterId === "math-mensuration" && <MensurationForm />}
      {subjectId === "physics" && <FormulaForm chapterId={chapterId} />}
    </div>
  );
}

function FreeText({ subjectId, chapterId }: { subjectId: SubjectId; chapterId: string }) {
  const { t, lang } = useLang();
  const [text, setText] = useState("");
  const [outcome, setOutcome] = useState<SolveOutcome | null>(null);
  const examples = subjectId === "mathematics"
    ? [...MATH_PROBLEM_TYPES.filter((p) => p.chapterId === chapterId), ...MATH_PROBLEM_TYPES.filter((p) => p.chapterId !== chapterId)]
    : [];

  function run(q: string) {
    setOutcome(subjectId === "mathematics" ? solveMaths(q, lang) : solvePhysics(q, lang, chapterId));
  }

  return (
    <section className="space-y-2">
      {subjectId === "mathematics" && <p className="text-xs text-paper/70">{t.solveMathIntro}</p>}
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) run(text); }} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.solvePlaceholder}
          className="min-w-0 flex-1 rounded-card border border-white/10 bg-night px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-signal/50 focus:outline-none"
        />
        <button className="rounded-card bg-signal px-3 py-2 text-xs font-semibold text-night">{t.solveButton}</button>
      </form>
      {examples.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {examples.map((p) => (
            <button
              key={p.id}
              onClick={() => { setText(p.example[lang === "fr" ? 1 : 0]); setOutcome(null); }}
              title={p.example[lang === "fr" ? 1 : 0]}
              className={`rounded-card border px-2 py-1 text-[0.65rem] transition-colors hover:border-signal/50 hover:text-paper ${p.chapterId === chapterId ? "border-signal/30 text-paper/85" : "border-white/10 text-muted"}`}
            >
              {p.name[lang === "fr" ? 1 : 0]}
            </button>
          ))}
        </div>
      )}
      {outcome && <SolverResultCard outcome={outcome} />}
    </section>
  );
}

const SHAPES = Object.keys(SHAPE_DIMENSIONS) as Shape[];

function MensurationForm() {
  const { t, lang } = useLang();
  const say = sayIn(lang);
  const [shape, setShape] = useState<Shape>("circle");
  const [quantity, setQuantity] = useState<Quantity>("area");
  const [dimSet, setDimSet] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [unit, setUnit] = useState("cm");
  const [outcome, setOutcome] = useState<SolveOutcome | null>(null);
  const sets = SHAPE_DIMENSIONS[shape];
  const dims = sets[Math.min(dimSet, sets.length - 1)];

  function solve() {
    const d = Object.fromEntries(dims.map((n) => [n, Number(values[n]?.replace(",", "."))]));
    setOutcome(measure(shape, quantity, d, unit, say));
  }

  return (
    <section className="space-y-2 rounded-card border border-white/5 bg-night-surface/60 px-3 py-3">
      <p className="mono-label">{t.solveMensuration}</p>
      <div className="flex flex-wrap gap-2">
        <Select label={t.solveShape} value={shape} onChange={(v) => { setShape(v as Shape); setQuantity(SHAPE_QUANTITIES[v as Shape][0]); setDimSet(0); setOutcome(null); }}
          options={SHAPES.map((s) => [s, shapeName(s, say)])} />
        <Select label={t.solveQuantity} value={quantity} onChange={(v) => { setQuantity(v as Quantity); setOutcome(null); }}
          options={SHAPE_QUANTITIES[shape].map((q) => [q, quantityName(q, shape, say)])} />
        {sets.length > 1 && (
          <Select label="" value={String(dimSet)} onChange={(v) => setDimSet(Number(v))}
            options={sets.map((set, i) => [String(i), set.map((n) => say(...DIMENSION_NAMES[n])).join(" + ")])} />
        )}
        <Select label={t.solveUnit} value={unit} onChange={setUnit} options={["mm", "cm", "m", "km"].map((u) => [u, u])} />
      </div>
      <div className="flex flex-wrap gap-2">
        {dims.map((n) => (
          <NumberField key={n} label={say(...DIMENSION_NAMES[n])} value={values[n] ?? ""} onChange={(v) => setValues((x) => ({ ...x, [n]: v }))} />
        ))}
        <button onClick={solve} className="self-end rounded-card bg-signal px-3 py-2 text-xs font-semibold text-night">{t.solveButton}</button>
      </div>
      {outcome && <SolverResultCard outcome={outcome} />}
    </section>
  );
}

function FormulaForm({ chapterId }: { chapterId: string }) {
  const { t, lang } = useLang();
  const say = sayIn(lang);
  const formulas = useMemo(() => [...FORMULAS.filter((f) => f.chapterId === chapterId), ...FORMULAS.filter((f) => f.chapterId !== chapterId)], [chapterId]);
  const [formulaId, setFormulaId] = useState(formulas[0].id);
  const formula = formulas.find((f) => f.id === formulaId) ?? formulas[0];
  const askable = formula.vars.filter((v) => formula.solve[v.sym]);
  const [target, setTarget] = useState(askable[0].sym);
  const [values, setValues] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<SolveOutcome | null>(null);
  const goal = askable.some((v) => v.sym === target) ? target : askable[0].sym;

  function pickFormula(id: string) {
    const f = FORMULAS.find((x) => x.id === id)!;
    setFormulaId(id);
    setTarget(f.vars.find((v) => f.solve[v.sym])!.sym);
    setValues({});
    setUnits({});
    setOutcome(null);
  }

  function solve() {
    const knowns: Record<string, Known> = {};
    for (const v of formula.vars) {
      if (v.sym === goal) continue;
      const raw = values[v.sym] ?? (v.default ? String(v.default.value) : "");
      const num = Number(raw.replace(",", "."));
      if (raw.trim() === "" || !Number.isFinite(num)) {
        setOutcome({ kind: "invalid", problemType: `physics.${formula.id}`, reason: t.solveEnterValues });
        return;
      }
      const unit = unitsFor(v.quantity).find((u) => u.symbol === units[v.sym]) ?? unitsFor(v.quantity)[0];
      knowns[v.sym] = { value: num * unit.factor, quantity: v.quantity, raw: `${raw} ${unit.symbol}`, unit, index: 0, note: !values[v.sym] && v.default ? say(...v.default.note) : undefined };
    }
    setOutcome(solveFormula(formula, goal, knowns, say));
  }

  return (
    <section className="space-y-2 rounded-card border border-white/5 bg-night-surface/60 px-3 py-3">
      <p className="text-xs text-paper/70">{t.solvePhysicsIntro}</p>
      <div className="flex flex-wrap gap-2">
        <Select label={t.solveFormula} value={formula.id} onChange={pickFormula}
          options={formulas.map((f) => [f.id, `${say(...f.name)} — ${f.equation}`])} />
        <Select label={t.solveQuantity} value={goal} onChange={(v) => { setTarget(v); setOutcome(null); }}
          options={askable.map((v) => [v.sym, `${v.sym} — ${say(...v.name)}`])} />
      </div>
      <div className="flex flex-wrap gap-2">
        {formula.vars.filter((v) => v.sym !== goal).map((v) => (
          <div key={v.sym} className="flex items-end gap-1">
            <NumberField label={`${v.sym} — ${say(...v.name)}`} value={values[v.sym] ?? ""} placeholder={v.default ? String(v.default.value) : undefined} onChange={(x) => setValues((s) => ({ ...s, [v.sym]: x }))} />
            {unitsFor(v.quantity).length > 1 && (
              <Select label="" value={units[v.sym] ?? unitsFor(v.quantity)[0].symbol} onChange={(u) => setUnits((s) => ({ ...s, [v.sym]: u }))}
                options={unitsFor(v.quantity).map((u) => [u.symbol, u.symbol])} />
            )}
            {unitsFor(v.quantity).length === 1 && unitsFor(v.quantity)[0].symbol && <span className="pb-2 text-xs text-muted">{unitsFor(v.quantity)[0].symbol}</span>}
          </div>
        ))}
        <button onClick={solve} className="self-end rounded-card bg-signal px-3 py-2 text-xs font-semibold text-night">{t.solveButton}</button>
      </div>
      {outcome && <SolverResultCard outcome={outcome} />}
    </section>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="flex min-w-0 max-w-full flex-col gap-0.5 text-[0.65rem] text-muted">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="max-w-full rounded-card border border-white/10 bg-night px-2 py-2 text-xs text-paper">
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </label>
  );
}

function NumberField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex w-28 flex-col gap-0.5 text-[0.65rem] text-muted">
      {label}
      <input inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="rounded-card border border-white/10 bg-night px-2 py-2 text-sm text-paper placeholder:text-muted/60 focus:border-signal/50 focus:outline-none" />
    </label>
  );
}
