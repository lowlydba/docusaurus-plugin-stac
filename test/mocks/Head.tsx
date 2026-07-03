import React from 'react';

/**
 * Test stub for `@docusaurus/Head`. The real component portals children into
 * `<head>`; for unit tests we render them inline so assertions can find the
 * emitted `<link>` / `<script>` tags in the container.
 */
export default function Head({
  children,
}: {
  children?: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
