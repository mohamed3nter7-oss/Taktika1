/**
 * Opaque keyset cursors (CLAUDE.md §5: keyset everywhere, no OFFSET).
 *
 * A cursor is the base64url-encoded JSON of the ordering tuple of the last row
 * on the previous page — currently `[name, id]` for reference lists ordered by
 * `(nameEn ASC, id ASC)`. Opaque on purpose: clients must treat it as a token,
 * so the ordering columns can change without an API break.
 *
 * Decoding is deliberately forgiving in mechanism and strict in outcome:
 * base64 decoding never throws, so the only trustworthy validation is the
 * JSON parse plus a shape check. Garbage in → `null` out; the caller maps
 * that to 400 VALIDATION_ERROR.
 */

export interface NameIdCursor {
  name: string;
  id: number;
}

export function encodeNameIdCursor(cursor: NameIdCursor): string {
  return Buffer.from(JSON.stringify([cursor.name, cursor.id]), 'utf8').toString(
    'base64url',
  );
}

export function decodeNameIdCursor(raw: string): NameIdCursor | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length !== 2) return null;

  const [name, id] = parsed as unknown[];
  if (typeof name !== 'string') return null;
  if (typeof id !== 'number' || !Number.isSafeInteger(id)) return null;

  return { name, id };
}

// =============================================================================
// (timestamp, uuid) — the follows keyset, and the template for posts/feed/search
// =============================================================================

/**
 * The ordering tuple for a `(created_at DESC, <uuid> DESC)` keyset.
 *
 * `createdAt` is a STRING, and that is the entire point of this type.
 *
 * `follows.created_at` is `timestamptz(6)` — microsecond precision. A JavaScript
 * `Date` is millisecond precision, so `new Date(row.createdAt).toISOString()`
 * truncates DOWNWARD: a row written at `…123789Z` encodes as `…123000Z`. On the
 * next page the predicate asks for rows `< (…123000Z, id)`, and a sibling row at
 * `…123456Z` is GREATER than that — it fails the comparison on this page and on
 * every page after it. The row is never returned by anyone, and nothing in the
 * response says so.
 *
 * That failure is a silent OMISSION, not a duplicate, and it is invisible to a
 * boundary-collision test: truncation preserves equality, so rows sharing one
 * timestamp still page correctly. Only distinct sub-millisecond values expose it.
 *
 * So the timestamp is carried as the exact text Postgres rendered
 * (`created_at::text`) and handed straight back to Postgres for a
 * `::timestamptz` cast. It never becomes a `Date` in either direction.
 */
export interface TimeUuidCursor {
  /** Postgres `timestamptz` text, e.g. `2026-08-26 12:34:56.123456+00`. */
  createdAt: string;
  id: string;
}

/**
 * `YYYY-MM-DD HH:MM:SS[.ffffff][+HH[:MM]]`, which is what `timestamptz::text`
 * emits. Also accepts the ISO `T` separator and a `Z` zone so a hand-built
 * cursor is not gratuitously rejected.
 *
 * This is validated BEFORE the value reaches SQL. The value is a bound
 * parameter either way — this is not an injection guard — but an unparseable
 * string would fail the `::timestamptz` cast inside Postgres and surface as a
 * 500 on what is really a malformed-input 400.
 */
const PG_TIMESTAMPTZ =
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}(:?\d{2})?|Z)?$/;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeTimeUuidCursor(cursor: TimeUuidCursor): string {
  return Buffer.from(
    JSON.stringify([cursor.createdAt, cursor.id]),
    'utf8',
  ).toString('base64url');
}

export function decodeTimeUuidCursor(raw: string): TimeUuidCursor | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length !== 2) return null;

  const [createdAt, id] = parsed as unknown[];
  if (typeof createdAt !== 'string' || !PG_TIMESTAMPTZ.test(createdAt)) {
    return null;
  }
  if (typeof id !== 'string' || !UUID.test(id)) return null;

  return { createdAt, id };
}
