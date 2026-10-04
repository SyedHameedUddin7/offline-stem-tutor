import type { z } from "zod";

/**
 * Read persisted records defensively.
 *
 * The rule this enforces: ONE BAD ROW MUST NOT TAKE DOWN A QUERY. A corrupt
 * message from an interrupted write, or a row left by a version of the app
 * that stored a field differently, should cost the student that one row —
 * not their whole chat history, and certainly not a blank screen.
 *
 * Quarantine rather than delete. A row that fails validation is counted and
 * reported but left in the database, because "I could not read this" is a
 * recoverable state and "I deleted your work because I could not read it"
 * is not. A later version with a wider schema may well read it fine.
 */

export interface SafeReadResult<T> {
  valid: T[];
  /** Rows that failed validation, with just enough to debug them. */
  rejected: Array<{ id: unknown; reason: string }>;
}

export function safeParseAll<T>(
  schema: z.ZodType<T>,
  rows: unknown[],
  label: string
): SafeReadResult<T> {
  const valid: T[] = [];
  const rejected: SafeReadResult<T>["rejected"] = [];

  for (const row of rows) {
    const result = schema.safeParse(row);
    if (result.success) {
      valid.push(result.data);
      continue;
    }
    const id = (row as { id?: unknown } | null)?.id;
    rejected.push({
      id,
      reason: result.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; "),
    });
  }

  if (rejected.length > 0) {
    // Logged once per read with a count, not once per row: a corrupted table
    // should not produce ten thousand console lines on a phone.
    console.warn(
      `[storage] ${rejected.length} unreadable ${label} record(s) skipped`,
      rejected.slice(0, 5)
    );
  }

  return { valid, rejected };
}

/** Single-record variant; returns null rather than throwing. */
export function safeParseOne<T>(
  schema: z.ZodType<T>,
  row: unknown,
  label: string
): T | null {
  const result = schema.safeParse(row);
  if (result.success) return result.data;
  console.warn(`[storage] unreadable ${label} record skipped`, result.error.issues[0]);
  return null;
}
