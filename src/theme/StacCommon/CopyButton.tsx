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
 * The shared copy-to-clipboard button used by `CopyTextButton` and
 * `CopyLinkButton`. `getText` is called lazily on click so callers can resolve
 * the value against client-only state (e.g. the current page URL) that isn't
 * available during SSR. Shows a transient "Copied" confirmation on success.
 */
export function CopyButton({
  getText,
  label,
  actionLabel,
}: {
  getText: () => string;
  label: string;
  actionLabel: string;
}): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const onCopy = (): void => {
    const clipboard =
      typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) return;
    clipboard
      .writeText(getText())
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        /* clipboard unavailable — ignore */
      });
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
          ? translate({
              id: 'stac.copyLink.copied',
              message: 'Copied',
              description: 'Confirmation shown after copying a value',
            })
          : actionLabel}
      </span>
    </button>
  );
}

/**
 * Copies an arbitrary piece of text to the clipboard verbatim — it isn't
 * resolved against the current page URL — which is what's wanted for values
 * like a resolved storage-scheme URI rather than a same-site download link.
 */
export function CopyTextButton({
  text,
  label,
  actionLabel,
}: {
  text: string;
  label: string;
  actionLabel?: string;
}): React.JSX.Element {
  return (
    <CopyButton
      getText={() => text}
      label={label}
      actionLabel={
        actionLabel ??
        translate({
          id: 'stac.copyText.action',
          message: 'Copy',
          description: 'Label for a generic copy-value button',
        })
      }
    />
  );
}

/**
 * Copies a (resolved, absolute) link to the clipboard, so a reader can grab
 * the URL instead of triggering a download. The href is resolved against the
 * current page URL at click time.
 */
export function CopyLinkButton({
  href,
  label,
}: {
  href: string;
  label: string;
}): React.JSX.Element {
  return (
    <CopyButton
      getText={() => {
        try {
          if (typeof window !== 'undefined') {
            return new URL(href, window.location.href).href;
          }
        } catch {
          /* fall back to the raw href */
        }
        return href;
      }}
      label={label}
      actionLabel={translate({
        id: 'stac.copyLink.action',
        message: 'Copy link',
        description: 'Label for the button that copies a download link',
      })}
    />
  );
}
