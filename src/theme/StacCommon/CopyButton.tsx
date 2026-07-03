import React, {useState} from 'react';
import {translate} from '@docusaurus/Translate';

export function CopyIcon({className}: {className?: string}): React.JSX.Element {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

export function CheckIcon({className}: {className?: string}): React.JSX.Element {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * A small button that copies an arbitrary piece of text to the clipboard.
 * Unlike `CopyLinkButton`, `text` is copied verbatim — it isn't resolved
 * against the current page URL — which is what's wanted for values like a
 * resolved storage-scheme URI rather than a same-site download link.
 */
export function CopyTextButton({
  text,
  label,
}: {
  text: string;
  label: string;
}): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const copiedLabel = translate({
    id: 'stac.copyLink.copied',
    message: 'Copied',
    description: 'Confirmation shown after copying a value',
  });

  const onCopy = (): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {
          /* clipboard unavailable — ignore */
        });
    }
  };

  return (
    <button
      type="button"
      className={`stac-copy${copied ? ' stac-copy--copied' : ''}`}
      onClick={onCopy}
      aria-label={label}
      title={label}
    >
      {copied ? (
        <CheckIcon className="stac-copy__icon" />
      ) : (
        <CopyIcon className="stac-copy__icon" />
      )}
      <span className="stac-copy__text" aria-hidden="true">
        {copied
          ? copiedLabel
          : translate({
              id: 'stac.copyText.action',
              message: 'Copy',
              description: 'Label for a generic copy-value button',
            })}
      </span>
    </button>
  );
}
