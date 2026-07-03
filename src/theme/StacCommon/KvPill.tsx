import React from 'react';

/**
 * A compact two-segment "key : value" pill (shields.io-style): a muted label
 * segment butted against a monospace value segment. Used to surface a single
 * scalar fact — e.g. a storage scheme's `requester_pays` flag — as a neutral,
 * scannable tag rather than free-form prose. Kept in its own module so it can
 * be shared without creating an import cycle through `StacCommon/index`.
 */
export function KvPill({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <span className="stac-kv-pill">
      <span className="stac-kv-pill__key">{label}</span>
      <span className="stac-kv-pill__val">{value}</span>
    </span>
  );
}
