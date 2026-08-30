import {
  decodeNameIdCursor,
  decodeTimeUuidCursor,
  encodeNameIdCursor,
  encodeTimeUuidCursor,
} from './cursor';

describe('name/id keyset cursor', () => {
  it('round-trips a tuple', () => {
    const token = encodeNameIdCursor({ name: 'Zamalek SC', id: 42 });
    expect(decodeNameIdCursor(token)).toEqual({ name: 'Zamalek SC', id: 42 });
  });

  it('round-trips Arabic names', () => {
    const token = encodeNameIdCursor({ name: 'الأهلي', id: 1 });
    expect(decodeNameIdCursor(token)).toEqual({ name: 'الأهلي', id: 1 });
  });

  it('produces URL-safe output', () => {
    // '?' and '~' push base64 into the +/ range; base64url must not.
    const token = encodeNameIdCursor({ name: '~?~?~?', id: 999_999 });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['not base64 json', 'garbage!!!'],
    ['valid json, not an array', Buffer.from('{"a":1}').toString('base64url')],
    ['wrong arity', Buffer.from('["x"]').toString('base64url')],
    ['swapped types', Buffer.from('[1,"x"]').toString('base64url')],
    ['float id', Buffer.from('["x",1.5]').toString('base64url')],
    [
      'unsafe integer id',
      Buffer.from('["x",9007199254740993]').toString('base64url'),
    ],
    ['empty string', ''],
  ])('rejects %s', (_label, raw) => {
    expect(decodeNameIdCursor(raw)).toBeNull();
  });
});

describe('time/uuid keyset cursor', () => {
  const ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  const TS = '2026-08-26 12:34:56.123456+00';

  it('round-trips a tuple', () => {
    expect(
      decodeTimeUuidCursor(encodeTimeUuidCursor({ createdAt: TS, id: ID })),
    ).toEqual({ createdAt: TS, id: ID });
  });

  /**
   * The regression this codec exists for. A Date round-trip silently drops the
   * trailing `456`, and the row those microseconds belong to then falls outside
   * every subsequent page. Asserted on the digits themselves, not on a Date.
   */
  it('preserves microseconds exactly', () => {
    const token = encodeTimeUuidCursor({ createdAt: TS, id: ID });
    const back = decodeTimeUuidCursor(token);

    expect(back?.createdAt).toBe(TS);
    expect(back?.createdAt).toContain('.123456');
    // What a Date round-trip would have produced instead.
    expect(back?.createdAt).not.toContain('.123000');
    expect(new Date(TS).toISOString()).toContain('.123');
  });

  it('accepts the ISO T separator and a Z zone', () => {
    const iso = '2026-08-26T12:34:56.123Z';
    expect(
      decodeTimeUuidCursor(encodeTimeUuidCursor({ createdAt: iso, id: ID })),
    ).toEqual({ createdAt: iso, id: ID });
  });

  it('produces URL-safe output', () => {
    const token = encodeTimeUuidCursor({ createdAt: TS, id: ID });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['not base64 json', 'garbage!!!'],
    ['valid json, not an array', Buffer.from('{"a":1}').toString('base64url')],
    [
      'wrong arity',
      Buffer.from('["2026-08-26 12:34:56+00"]').toString('base64url'),
    ],
    ['swapped types', Buffer.from(`[1,"${ID}"]`).toString('base64url')],
    [
      'timestamp that is not a timestamp',
      Buffer.from(`["tomorrow","${ID}"]`).toString('base64url'),
    ],
    [
      'id that is not a uuid',
      Buffer.from('["2026-08-26 12:34:56+00","../../etc/passwd"]').toString(
        'base64url',
      ),
    ],
    [
      'sql fragment in the timestamp',
      Buffer.from(`["2026-08-26'; DROP TABLE follows--","${ID}"]`).toString(
        'base64url',
      ),
    ],
    ['empty string', ''],
  ])('rejects %s', (_label, raw) => {
    expect(decodeTimeUuidCursor(raw)).toBeNull();
  });
});
