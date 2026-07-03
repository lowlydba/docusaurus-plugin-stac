import {describe, it, expect} from 'vitest';

import {tokenizeJson} from '../../src/theme/StacCommon/JsonBlock.js';

function kindOf(tokens: ReturnType<typeof tokenizeJson>, text: string) {
  return tokens.find((t) => t.text === text)?.kind;
}

describe('tokenizeJson', () => {
  it('classifies keys, strings, numbers, booleans and null', () => {
    const json = JSON.stringify(
      {name: 'x', count: 3, ok: true, missing: null},
      null,
      2,
    );
    const tokens = tokenizeJson(json);
    expect(kindOf(tokens, '"name"')).toBe('key');
    expect(kindOf(tokens, '"x"')).toBe('string');
    expect(kindOf(tokens, '3')).toBe('number');
    expect(kindOf(tokens, 'true')).toBe('boolean');
    expect(kindOf(tokens, 'null')).toBe('null');
  });

  it('splits {placeholder} tokens out of string values', () => {
    const json = JSON.stringify(
      {platform: 'https://{bucket}.s3.{region}.example.com'},
      null,
      2,
    );
    const tokens = tokenizeJson(json);
    const placeholders = tokens
      .filter((t) => t.kind === 'placeholder')
      .map((t) => t.text);
    expect(placeholders).toEqual(['{bucket}', '{region}']);
    // The surrounding literal text stays a normal string token.
    expect(tokens.some((t) => t.kind === 'string' && t.text.includes('.s3.'))).toBe(
      true,
    );
  });

  it('does not treat a key as a placeholder', () => {
    const json = JSON.stringify({'{weird}': 1}, null, 2);
    const tokens = tokenizeJson(json);
    // The key keeps its quotes and is classified as a key, not a placeholder.
    expect(tokens.some((t) => t.kind === 'placeholder')).toBe(false);
    expect(tokens.some((t) => t.kind === 'key' && t.text === '"{weird}"')).toBe(
      true,
    );
  });

  it('round-trips the original text', () => {
    const json = JSON.stringify(
      {a: 'https://{x}/y', b: [1, 2], c: {d: false}},
      null,
      2,
    );
    const joined = tokenizeJson(json)
      .map((t) => t.text)
      .join('');
    expect(joined).toBe(json);
  });
});
