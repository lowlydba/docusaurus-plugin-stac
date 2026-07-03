import React from 'react';

function interpolate(
  template: string,
  values?: Record<string, unknown>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in values ? String(values[k]) : `{${k}}`,
  );
}

export default function Translate({
  children,
  message,
  values,
}: {
  id?: string;
  message?: string;
  values?: Record<string, unknown>;
  children?: string;
}): React.JSX.Element {
  const template = children ?? message ?? '';
  return <>{interpolate(template, values)}</>;
}

export function translate(
  opts: {id?: string; message: string},
  values?: Record<string, unknown>,
): string {
  return interpolate(opts.message, values);
}
