import React from 'react';

export default function Link({
  to,
  href,
  children,
  ...rest
}: {
  to?: string;
  href?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}): React.JSX.Element {
  return (
    <a href={to ?? href ?? '#'} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  );
}
