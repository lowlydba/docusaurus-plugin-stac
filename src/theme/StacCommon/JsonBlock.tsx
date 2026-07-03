import React from 'react';

/**
 * A token in a highlighted JSON string, tagged with the CSS-class suffix that
 * styles it. Exported so it can be unit-tested without a DOM render.
 */
export interface JsonToken {
  text: string;
  /** `undefined` for plain punctuation/whitespace. */
  kind?: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'placeholder';
}

const TOKEN_RE =
  /"(?:\\.|[^"\\])*"(\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

const PLACEHOLDER_RE = /\{[^{}\s]+\}/g;

/**
 * Split a JSON string value into placeholder / literal tokens. STAC templates
 * (e.g. the storage extension's `platform: "https://{bucket}.s3.{region}…"`)
 * embed `{name}` placeholders we want to visually distinguish.
 */
function splitPlaceholders(
  text: string,
  kind: 'key' | 'string',
): JsonToken[] {
  if (kind === 'key' || !text.includes('{')) return [{text, kind}];
  const out: JsonToken[] = [];
  let last = 0;
  for (const m of text.matchAll(PLACEHOLDER_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push({text: text.slice(last, start), kind});
    out.push({text: m[0], kind: 'placeholder'});
    last = start + m[0].length;
  }
  if (last < text.length) out.push({text: text.slice(last), kind});
  return out;
}

/** Tokenize pretty-printed JSON for lightweight, dependency-free highlighting. */
export function tokenizeJson(json: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let last = 0;
  for (const m of json.matchAll(TOKEN_RE)) {
    const start = m.index ?? 0;
    if (start > last) tokens.push({text: json.slice(last, start)});

    const raw = m[0];
    if (m[1] !== undefined) {
      // A key: the match includes the trailing `:` (and any space). Split so the
      // punctuation stays un-highlighted.
      const colon = raw.indexOf(':', raw.lastIndexOf('"'));
      tokens.push(...splitPlaceholders(raw.slice(0, colon).trimEnd(), 'key'));
      tokens.push({text: raw.slice(raw.lastIndexOf('"') + 1)});
    } else if (raw.startsWith('"')) {
      tokens.push(...splitPlaceholders(raw, 'string'));
    } else if (raw === 'true' || raw === 'false') {
      tokens.push({text: raw, kind: 'boolean'});
    } else if (raw === 'null') {
      tokens.push({text: raw, kind: 'null'});
    } else {
      tokens.push({text: raw, kind: 'number'});
    }
    last = start + raw.length;
  }
  if (last < json.length) tokens.push({text: json.slice(last)});
  return tokens;
}

/**
 * Render a value as a pretty-printed, syntax-highlighted JSON code block.
 * Placeholders like `{bucket}` inside string values are called out distinctly.
 */
export function JsonBlock({value}: {value: unknown}): React.JSX.Element {
  const json = JSON.stringify(value, null, 2);
  const tokens = tokenizeJson(json);
  return (
    <pre className="stac-json">
      <code>
        {tokens.map((t, i) =>
          t.kind ? (
            <span key={i} className={`stac-json__${t.kind}`}>
              {t.text}
            </span>
          ) : (
            <React.Fragment key={i}>{t.text}</React.Fragment>
          ),
        )}
      </code>
    </pre>
  );
}
