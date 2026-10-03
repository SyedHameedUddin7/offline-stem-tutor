import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import {
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
  clearFacilitatorPin,
  getLockoutStatus,
  hasFacilitatorPin,
  setFacilitatorPin,
  validatePinFormat,
  verifyFacilitatorPin,
} from "./facilitator";

const GOOD_PIN = "135792";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("validatePinFormat", () => {
  it("accepts a reasonable PIN", () => {
    expect(validatePinFormat(GOOD_PIN)).toBeNull();
  });

  it("rejects non-digits", () => {
    expect(validatePinFormat("12ab56")).toBe("digits-only");
  });

  it("enforces the length bounds", () => {
    expect(validatePinFormat("1".repeat(PIN_MIN_LENGTH - 1))).toBe("length");
    expect(validatePinFormat("1234567890".slice(0, PIN_MAX_LENGTH + 1))).toBe("length");
  });

  /**
   * Six is the minimum because the cost was measured, not guessed: at ~11ms
   * per PBKDF2 derivation, four digits is ~2 minutes of offline guessing and
   * six is ~3 hours. Length is the lever; iteration count is a multiplier.
   */
  it("requires at least six digits", () => {
    expect(PIN_MIN_LENGTH).toBe(6);
    expect(validatePinFormat("1234")).toBe("length");
  });

  it("rejects the patterns that collapse the search space", () => {
    expect(validatePinFormat("111111")).toBe("repeated");
    expect(validatePinFormat("123456")).toBe("sequential");
    expect(validatePinFormat("654321")).toBe("sequential");
    expect(validatePinFormat("456789")).toBe("sequential");
  });
});

describe("setFacilitatorPin", () => {
  it("reports that a PIN exists afterwards", async () => {
    expect(await hasFacilitatorPin()).toBe(false);
    await setFacilitatorPin(GOOD_PIN);
    expect(await hasFacilitatorPin()).toBe(true);
  });

  /** The whole point of hashing: the PIN itself must not be recoverable. */
  it("never stores the PIN, in any field", async () => {
    await setFacilitatorPin(GOOD_PIN);
    const dumped = JSON.stringify(await db.appSettings.toArray());
    expect(dumped).not.toContain(GOOD_PIN);
  });

  it("salts, so the same PIN stores differently on two devices", async () => {
    await setFacilitatorPin(GOOD_PIN);
    const first = await db.appSettings.get("facilitator:credential");
    await db.appSettings.clear();
    await setFacilitatorPin(GOOD_PIN);
    const second = await db.appSettings.get("facilitator:credential");

    const a = first!.value as { saltB64: string; hashB64: string };
    const b = second!.value as { saltB64: string; hashB64: string };
    expect(a.saltB64).not.toBe(b.saltB64);
    expect(a.hashB64).not.toBe(b.hashB64);
  });

  it("records the iteration count so it can be raised later", async () => {
    await setFacilitatorPin(GOOD_PIN);
    const row = await db.appSettings.get("facilitator:credential");
    expect((row!.value as { iterations: number }).iterations).toBeGreaterThanOrEqual(150_000);
  });

  it("refuses a PIN that fails validation", async () => {
    await expect(setFacilitatorPin("1234")).rejects.toThrow();
    expect(await hasFacilitatorPin()).toBe(false);
  });
});

describe("verifyFacilitatorPin", () => {
  beforeEach(async () => {
    await setFacilitatorPin(GOOD_PIN);
  });

  it("accepts the right PIN", async () => {
    expect((await verifyFacilitatorPin(GOOD_PIN)).success).toBe(true);
  });

  it("rejects the wrong PIN", async () => {
    expect((await verifyFacilitatorPin("999999")).success).toBe(false);
  });

  it("fails closed when no PIN has been set", async () => {
    await db.appSettings.clear();
    expect((await verifyFacilitatorPin(GOOD_PIN)).success).toBe(false);
  });

  it("resets the failure count after a success", async () => {
    await verifyFacilitatorPin("999999");
    await verifyFacilitatorPin("999999");
    expect((await getLockoutStatus()).attemptsLeft).toBe(3);

    await verifyFacilitatorPin(GOOD_PIN);
    expect((await getLockoutStatus()).attemptsLeft).toBe(5);
  });
});

/**
 * The lockout is what actually closes the UI path. PBKDF2 alone does not:
 * ~11ms per guess means a six-digit PIN is hours offline, but thousands of
 * guesses through a form has to be impossible, not merely slow.
 */
describe("lockout", () => {
  beforeEach(async () => {
    await setFacilitatorPin(GOOD_PIN);
  });

  it("counts down the remaining attempts", async () => {
    for (let i = 1; i <= 4; i++) {
      const result = await verifyFacilitatorPin("999999");
      expect(result.attemptsLeft).toBe(5 - i);
      expect(result.lockedOut).toBeFalsy();
    }
  });

  it("locks out on the fifth consecutive failure", async () => {
    for (let i = 0; i < 4; i++) await verifyFacilitatorPin("999999");
    const fifth = await verifyFacilitatorPin("999999");
    expect(fifth.lockedOut).toBe(true);
    expect(fifth.remainingMs).toBeGreaterThan(0);
  });

  it("rejects even the correct PIN while locked out", async () => {
    for (let i = 0; i < 5; i++) await verifyFacilitatorPin("999999");
    const during = await verifyFacilitatorPin(GOOD_PIN);
    expect(during.success).toBe(false);
    expect(during.lockedOut).toBe(true);
  });

  it("accepts the correct PIN once the cooldown has passed", async () => {
    for (let i = 0; i < 5; i++) await verifyFacilitatorPin("999999");
    const later = Date.now() + 60_000;
    expect((await verifyFacilitatorPin(GOOD_PIN, later)).success).toBe(true);
  });

  it("doubles the cooldown each time the limit is hit", async () => {
    const lockOut = async (now: number) => {
      for (let i = 0; i < 5; i++) await verifyFacilitatorPin("999999", now);
      return (await getLockoutStatus(now)).remainingMs;
    };

    const first = await lockOut(0);
    // Wait out the first cooldown, then trip it again.
    const second = await lockOut(first + 1);
    expect(second).toBeGreaterThan(first);
  });

  /**
   * Persisted rather than held in memory, so reloading the page is not a way
   * to clear the counter and keep guessing.
   */
  it("survives a reload", async () => {
    for (let i = 0; i < 5; i++) await verifyFacilitatorPin("999999");
    db.close();
    await db.open();
    expect((await getLockoutStatus()).remainingMs).toBeGreaterThan(0);
  });
});

describe("clearFacilitatorPin", () => {
  beforeEach(async () => {
    await setFacilitatorPin(GOOD_PIN);
  });

  it("needs the current PIN", async () => {
    expect(await clearFacilitatorPin("999999")).toBe(false);
    expect(await hasFacilitatorPin()).toBe(true);
  });

  it("clears when given the current PIN", async () => {
    expect(await clearFacilitatorPin(GOOD_PIN)).toBe(true);
    expect(await hasFacilitatorPin()).toBe(false);
  });
});
