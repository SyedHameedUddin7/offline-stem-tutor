/**
 * Exact rational arithmetic.
 *
 * Solving 3x + 1/3 = 2 in floating point gives x = 0.5555555555555556, which
 * a student copies down and a teacher marks wrong. Fractions keep every step
 * exact, so the worked solution says 5/9 and the substitution check compares
 * equal values rather than "close enough" ones.
 *
 * Plain numbers rather than BigInt: school problems stay far inside 2^53,
 * and anything that does not throws rather than silently losing precision.
 */

export class Fraction {
  readonly n: number;
  readonly d: number;

  constructor(n: number, d = 1) {
    if (!Number.isInteger(n) || !Number.isInteger(d)) throw new RangeError("fraction parts must be integers");
    if (d === 0) throw new RangeError("division by zero");
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) throw new RangeError("number too large");
    const g = gcd(Math.abs(n), Math.abs(d)) || 1;
    const sign = d < 0 ? -1 : 1;
    this.n = (sign * n) / g + 0; // + 0 turns -0 into 0
    this.d = Math.abs(d) / g;
  }

  /** "2.5" → 5/2, "-3" → -3/1. Exact for any decimal a student can type. */
  static parse(text: string): Fraction {
    const m = text.trim().match(/^(-?)(\d+)(?:[.,](\d+))?$/);
    if (!m) throw new SyntaxError(`not a number: ${text}`);
    const [, sign, whole, frac = ""] = m;
    const d = 10 ** frac.length;
    const n = Number(whole + frac) * (sign ? -1 : 1);
    return new Fraction(n, d);
  }

  static of(value: number | Fraction): Fraction {
    if (value instanceof Fraction) return value;
    if (Number.isInteger(value)) return new Fraction(value);
    return Fraction.parse(String(value));
  }

  add(o: Fraction): Fraction {
    return new Fraction(safe(this.n * o.d + o.n * this.d), safe(this.d * o.d));
  }
  sub(o: Fraction): Fraction {
    return this.add(o.neg());
  }
  mul(o: Fraction): Fraction {
    return new Fraction(safe(this.n * o.n), safe(this.d * o.d));
  }
  div(o: Fraction): Fraction {
    if (o.n === 0) throw new RangeError("division by zero");
    return new Fraction(safe(this.n * o.d), safe(this.d * o.n));
  }
  neg(): Fraction {
    return new Fraction(-this.n, this.d);
  }
  /** Integer powers only; a fractional power is not exact. */
  pow(k: number): Fraction {
    if (!Number.isInteger(k)) throw new RangeError("only whole-number powers are exact");
    if (k < 0) return new Fraction(1).div(this.pow(-k));
    let out = new Fraction(1);
    for (let i = 0; i < k; i++) out = out.mul(this);
    return out;
  }

  isZero(): boolean {
    return this.n === 0;
  }
  isInteger(): boolean {
    return this.d === 1;
  }
  equals(o: Fraction): boolean {
    return this.n === o.n && this.d === o.d;
  }
  value(): number {
    return this.n / this.d;
  }

  /** "5/9", "-3", "7/2". */
  toString(): string {
    return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`;
  }

  /** "5/9 (≈ 0.556)" for a non-integer, "3" otherwise. */
  pretty(): string {
    if (this.d === 1) return String(this.n);
    const decimal = this.value();
    // A terminating decimal with few digits reads better as itself: 2.5, not 5/2.
    const exact = Number(decimal.toFixed(6));
    if (isTerminating(this.d) && exact === decimal && String(exact).length <= 8) {
      return `${this} = ${formatNumber(decimal)}`;
    }
    return `${this} ≈ ${formatNumber(decimal, 3)}`;
  }
}

export function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : Math.abs((a / gcd(a, b)) * b);
}

function safe(x: number): number {
  if (!Number.isSafeInteger(x)) throw new RangeError("number too large");
  return x;
}

/** Denominators of 2s and 5s only give terminating decimals. */
function isTerminating(d: number): boolean {
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}

/**
 * A number as a student would write it: no float noise, no exponent for
 * everyday sizes, at most `digits` decimal places.
 */
export function formatNumber(x: number, digits = 4): string {
  if (!Number.isFinite(x)) return String(x);
  if (x !== 0 && (Math.abs(x) >= 1e7 || Math.abs(x) < 1e-4)) {
    const [mant, exp] = x.toExponential(3).split("e");
    return `${Number(mant)} × 10^${Number(exp)}`;
  }
  return String(Number(x.toFixed(digits)));
}
