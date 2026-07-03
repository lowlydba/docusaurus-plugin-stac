import React from 'react';

export default function NotFoundContent({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <main data-testid="original-not-found-content" className={className}>
      Page Not Found
    </main>
  );
}
