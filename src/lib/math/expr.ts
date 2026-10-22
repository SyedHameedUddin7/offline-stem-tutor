import { Fraction, formatNumber } from "./fraction";

/**
 * A small, closed parser for school algebra.
 *
 * Student input never reaches eval() or Function(): this recognises numbers,
 * single-letter variables, + - × ÷ ^, brackets and implicit multiplication,
 * and nothing else. Anything outside that grammar is a ParseError, which the
 * caller turns into "I can't read this as an equation" rather than a guess.
 */

export type Node =
  | { k: "num"; v: Fraction }
  | { k: "var"; name: string }
  | { k: "neg"; a: Node }
  | { k: "bin"; op: "+" | "-" | "*" | "/"; a: Node; b: Node }
  | { k: "pow"; a: Node; e: number };

export class ParseError extends Error {}

type Token =
  | { t: "num"; v: string }
  | { t: "var"; v: string }
  | { t: "op"; v: "+" | "-" | "*" | "/" | "^" }
  | { t: "(" }
  | { t: ")" };

/**
 * Typographic variants students and models write, mapped to one form.
 *
 * `x` is the hard case: a variable in "3x + 2" and a times sign in
 * "3 x 4". With `algebra` on, an x with spaces on both sides between two
 * numbers is multiplication and every other x is the variable; with it off
 * (pure arithmetic), every x is multiplication.
 */
export function normalise(text: string, algebra: boolean): string {
  let s = text
    .replace(/[×·∙⋅]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/\*\*/g, "^")
    .replace(/[[{]/g, "(")
    .replace(/[\]}]/g, ")");
  s = algebra ? s.replace(/(\d|\))\s+x\s+(?=[\d(])/g, "$1 * ") : s.replace(/x/gi, "*");
  return s;
}

function tokenize(s: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/\d|\./.test(c)) {
      const m = s.slice(i).match(/^\d*\.?\d+/);
      if (!m) throw new ParseError(`bad number near "${s.slice(i, i + 5)}"`);
      out.push({ t: "num", v: m[0] });
      i += m[0].length;
    } else if (/[a-z]/i.test(c)) {
      // Variables are single letters. A run of letters is a word, and a word
      // means this is not a pure expression.
      if (/[a-z]/i.test(s[i + 1] ?? "")) throw new ParseError("words are not part of an expression");
      out.push({ t: "var", v: c.toLowerCase() });
      i++;
    } else if ("+-*/^".includes(c)) {
      out.push({ t: "op", v: c as "+" | "-" | "*" | "/" | "^" });
      i++;
    } else if (c === "(" || c === ")") {
      out.push({ t: c });
      i++;
    } else {
      throw new ParseError(`unexpected "${c}"`);
    }
  }
  return out;
}

/**
 * Precedence, lowest first: + -, then × ÷ (and implicit ×), then unary minus,
 * then ^. So -x^2 is -(x^2) and 2x^2 is 2·(x^2), as on paper.
 */
export function parse(text: string, { algebra = true } = {}): Node {
  const toks = tokenize(normalise(text, algebra));
  if (toks.length === 0) throw new ParseError("empty expression");
  let pos = 0;
  const peek = () => toks[pos];
  const next = () => toks[pos++];

  function expr(): Node {
    let left = term();
    while (peek()?.t === "op" && (peek() as { v: string }).v.match(/[+-]/)) {
      const op = (next() as { v: "+" | "-" }).v;
      left = { k: "bin", op, a: left, b: term() };
    }
    return left;
  }

  function term(): Node {
    let left = unary();
    for (;;) {
      const tok = peek();
      if (tok?.t === "op" && (tok.v === "*" || tok.v === "/")) {
        next();
        left = { k: "bin", op: tok.v, a: left, b: unary() };
      } else if (tok && (tok.t === "var" || tok.t === "(" || (tok.t === "num" && endsOperand(left)))) {
        // Implicit multiplication: 3x, 2(x + 1), (x + 1)(x - 1), x(2).
        left = { k: "bin", op: "*", a: left, b: power() };
      } else {
        return left;
      }
    }
  }

  function unary(): Node {
    const tok = peek();
    if (tok?.t === "op" && (tok.v === "-" || tok.v === "+")) {
      next();
      const inner = unary();
      return tok.v === "-" ? { k: "neg", a: inner } : inner;
    }
    return power();
  }

  function power(): Node {
    const base = atom();
    if (peek()?.t === "op" && (peek() as { v: string }).v === "^") {
      next();
      const exponent = unary();
      const e = evaluate(exponent);
      if (!e.isInteger() || e.n < 0 || e.n > 12) throw new ParseError("powers must be whole numbers from 0 to 12");
      return { k: "pow", a: base, e: e.n };
    }
    return base;
  }

  function atom(): Node {
    const tok = next();
    if (!tok) throw new ParseError("expression ends too early");
    if (tok.t === "num") return { k: "num", v: Fraction.parse(tok.v.startsWith(".") ? `0${tok.v}` : tok.v) };
    if (tok.t === "var") return { k: "var", name: tok.v };
    if (tok.t === "(") {
      const inner = expr();
      if (next()?.t !== ")") throw new ParseError("a bracket is not closed");
      return inner;
    }
    throw new ParseError("expected a number, a letter or a bracket");
  }

  const tree = expr();
  if (pos !== toks.length) throw new ParseError("could not read the whole expression");
  return tree;
}

/** A node that a following number could multiply implicitly: (x+1)2 is odd but legal. */
function endsOperand(n: Node): boolean {
  return n.k === "bin" || n.k === "pow" || n.k === "var";
}

export function hasVariables(n: Node): boolean {
  switch (n.k) {
    case "num":
      return false;
    case "var":
      return true;
    case "neg":
    case "pow":
      return hasVariables(n.a);
    case "bin":
      return hasVariables(n.a) || hasVariables(n.b);
  }
}

/** Exact value of a variable-free tree, optionally logging each operation in the order done. */
export function evaluate(n: Node, env: Record<string, Fraction> = {}, log?: string[]): Fraction {
  switch (n.k) {
    case "num":
      return n.v;
    case "var": {
      const v = env[n.name];
      if (!v) throw new ParseError(`no value for ${n.name}`);
      return v;
    }
    case "neg":
      return evaluate(n.a, env, log).neg();
    case "pow": {
      const base = evaluate(n.a, env, log);
      const out = base.pow(n.e);
      log?.push(`${paren(base)}^${n.e} = ${out}`);
      return out;
    }
    case "bin": {
      const a = evaluate(n.a, env, log);
      const b = evaluate(n.b, env, log);
      const out = n.op === "+" ? a.add(b) : n.op === "-" ? a.sub(b) : n.op === "*" ? a.mul(b) : a.div(b);
      const sym = n.op === "*" ? "×" : n.op === "/" ? "÷" : n.op;
      log?.push(`${paren(a)} ${sym} ${paren(b)} = ${out}`);
      return out;
    }
  }
}

/** The same tree in plain floating point — a second, independent route to the value. */
export function evaluateFloat(n: Node, env: Record<string, number> = {}): number {
  switch (n.k) {
    case "num":
      return n.v.value();
    case "var":
      return env[n.name];
    case "neg":
      return -evaluateFloat(n.a, env);
    case "pow":
      return evaluateFloat(n.a, env) ** n.e;
    case "bin": {
      const a = evaluateFloat(n.a, env);
      const b = evaluateFloat(n.b, env);
      return n.op === "+" ? a + b : n.op === "-" ? a - b : n.op === "*" ? a * b : a / b;
    }
  }
}

function paren(f: Fraction): string {
  return f.n < 0 || !f.isInteger() ? `(${f})` : String(f);
}

/* ------------------------------------------------------------------ *
 * Polynomials
 * ------------------------------------------------------------------ */

/** Monomial key: variables with exponents, sorted, e.g. "x^2*y". "" is the constant. */
export type Poly = Map<string, Fraction>;

function monoKey(m: Record<string, number>): string {
  return Object.keys(m)
    .filter((v) => m[v] > 0)
    .sort()
    .map((v) => (m[v] === 1 ? v : `${v}^${m[v]}`))
    .join("*");
}

export function monoOf(key: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (!key) return out;
  for (const part of key.split("*")) {
    const [v, e] = part.split("^");
    out[v] = e ? Number(e) : 1;
  }
  return out;
}

function clean(p: Poly): Poly {
  for (const [k, v] of p) if (v.isZero()) p.delete(k);
  return p;
}

export function constPoly(f: Fraction): Poly {
  return clean(new Map([["", f]]));
}

export function addPoly(a: Poly, b: Poly, sign = 1): Poly {
  const out = new Map(a);
  for (const [k, v] of b) out.set(k, (out.get(k) ?? new Fraction(0)).add(sign < 0 ? v.neg() : v));
  return clean(out);
}

export function mulPoly(a: Poly, b: Poly): Poly {
  const out: Poly = new Map();
  for (const [ka, va] of a) {
    for (const [kb, vb] of b) {
      const ma = monoOf(ka);
      const mb = monoOf(kb);
      for (const [v, e] of Object.entries(mb)) ma[v] = (ma[v] ?? 0) + e;
      const key = monoKey(ma);
      out.set(key, (out.get(key) ?? new Fraction(0)).add(va.mul(vb)));
    }
  }
  return clean(out);
}

export function scalePoly(a: Poly, f: Fraction): Poly {
  return clean(new Map([...a].map(([k, v]) => [k, v.mul(f)])));
}

/** Expand a tree into a polynomial. Division is only by a number. */
export function toPoly(n: Node): Poly {
  switch (n.k) {
    case "num":
      return constPoly(n.v);
    case "var":
      return new Map([[n.name, new Fraction(1)]]);
    case "neg":
      return scalePoly(toPoly(n.a), new Fraction(-1));
    case "pow": {
      let out = constPoly(new Fraction(1));
      const base = toPoly(n.a);
      for (let i = 0; i < n.e; i++) out = mulPoly(out, base);
      return out;
    }
    case "bin": {
      const a = toPoly(n.a);
      const b = toPoly(n.b);
      if (n.op === "+") return addPoly(a, b);
      if (n.op === "-") return addPoly(a, b, -1);
      if (n.op === "*") return mulPoly(a, b);
      if (b.size > 1 || (b.size === 1 && !b.has(""))) {
        throw new ParseError("dividing by an expression with a letter in it is not supported");
      }
      const d = b.get("");
      if (!d) throw new RangeError("division by zero");
      return scalePoly(a, new Fraction(1).div(d));
    }
  }
}

export function variablesOf(p: Poly): string[] {
  const vars = new Set<string>();
  for (const k of p.keys()) for (const v of Object.keys(monoOf(k))) vars.add(v);
  return [...vars].sort();
}

/** Total degree of the polynomial in `v` (or overall when omitted). */
export function degreeOf(p: Poly, v?: string): number {
  let d = 0;
  for (const k of p.keys()) {
    const m = monoOf(k);
    d = Math.max(d, v ? (m[v] ?? 0) : Object.values(m).reduce((a, e) => a + e, 0));
  }
  return d;
}

export function coeff(p: Poly, key: string): Fraction {
  return p.get(key) ?? new Fraction(0);
}

/** Least common multiple of every coefficient's denominator. */
export function denominatorLcm(p: Poly): number {
  let l = 1;
  for (const v of p.values()) l = (l * v.d) / gcdInt(l, v.d);
  return l;
}

function gcdInt(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Highest power first, then alphabetical: x² + 2x - 15, 2x + 3y. */
export function formatPoly(p: Poly): string {
  if (p.size === 0) return "0";
  // Graded order: higher total degree first; within a degree, higher powers
  // of the alphabetically first letter first — a² + 2ab + b², not 2ab + a² + b².
  const letters = variablesOf(p);
  const terms = [...p.entries()].sort(([ka], [kb]) => {
    const ma = monoOf(ka);
    const mb = monoOf(kb);
    const da = Object.values(ma).reduce((s, e) => s + e, 0);
    const db = Object.values(mb).reduce((s, e) => s + e, 0);
    if (da !== db) return db - da;
    for (const v of letters) if ((ma[v] ?? 0) !== (mb[v] ?? 0)) return (mb[v] ?? 0) - (ma[v] ?? 0);
    return 0;
  });
  return terms
    .map(([k, v], i) => {
      const sign = v.n < 0 ? "-" : "+";
      const abs = v.n < 0 ? v.neg() : v;
      const mono = formatMono(k);
      const c = mono && abs.equals(new Fraction(1)) ? "" : abs.isInteger() ? String(abs) : mono ? `(${abs})` : String(abs);
      const body = `${c}${mono}`;
      return i === 0 ? (sign === "-" ? `-${body}` : body) : ` ${sign} ${body}`;
    })
    .join("");
}

function formatMono(key: string): string {
  if (!key) return "";
  return key
    .split("*")
    .map((part) => {
      const [v, e] = part.split("^");
      return e ? `${v}${superscript(Number(e))}` : v;
    })
    .join("");
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
function superscript(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUP[Number(d)])
    .join("");
}

/** Render a parsed tree back as tidy text (for echoing what was understood). */
export function formatNode(n: Node): string {
  switch (n.k) {
    case "num":
      return n.v.toString();
    case "var":
      return n.name;
    case "neg":
      return `-${wrap(n.a)}`;
    case "pow":
      return `${wrap(n.a)}${superscript(n.e)}`;
    case "bin": {
      const sym = n.op === "*" ? (isImplicit(n) ? "" : " × ") : n.op === "/" ? " ÷ " : ` ${n.op} `;
      return `${n.op === "*" || n.op === "/" ? wrap(n.a) : formatNode(n.a)}${sym}${
        n.op === "+" ? formatNode(n.b) : wrap(n.b)
      }`;
    }
  }
}

function isImplicit(n: Node & { k: "bin" }): boolean {
  return n.a.k === "num" && (n.b.k === "var" || n.b.k === "pow");
}

function wrap(n: Node): string {
  return n.k === "bin" || n.k === "neg" ? `(${formatNode(n)})` : formatNode(n);
}

export { formatNumber };
