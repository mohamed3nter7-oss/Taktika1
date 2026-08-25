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
