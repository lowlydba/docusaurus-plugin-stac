import React from 'react';

/**
 * Test double for @docusaurus/BrowserOnly. Renders the children function so that
 * browser-only components (e.g. the map) can be exercised in jsdom.
 */
export default function BrowserOnly({
  children,
}: {
  children: () => React.ReactNode;
  fallback?: React.ReactNode;
}): React.JSX.Element {
  return <>{children()}</>;
}
