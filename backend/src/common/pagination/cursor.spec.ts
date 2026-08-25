import { decodeNameIdCursor, encodeNameIdCursor } from './cursor';

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
