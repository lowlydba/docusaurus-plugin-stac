import React from 'react';
import Translate, {translate} from '@docusaurus/Translate';

import {JsonBlock} from './JsonBlock.js';
import {CopyTextButton} from './CopyButton.js';

const PLACEHOLDER_RE = /\{([^{}\s]+)\}/g;

/**
 * Resolve a storage-extension `platform` template (e.g.
 * `https://{bucket}.s3.{region}.amazonaws.com`) against sibling properties in
 * the same scheme object. Placeholders without a matching sibling value are
 * left as-is rather than silently dropped, so a partially-resolvable
 * template is still recognizable.
 */
export function resolvePlatformUri(
  scheme: Record<string, unknown>,
): string | undefined {
  const {platform} = scheme;
  if (typeof platform !== 'string') return undefined;
  return platform.replace(PLACEHOLDER_RE, (match, name: string) => {
    const value = scheme[name];
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : match;
  });
}

function isSchemeObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Renders the STAC storage extension's `storage:schemes` property as a list
 * of resolved, copyable URIs (e.g.
 * `https://overturemapswestus2.blob.core.windows.net/`) rather than the raw
 * `{bucket}`/`{region}`-templated JSON — that's what a reader actually wants
 * to grab. The raw definition (prefix, requester_pays, etc.) is still
 * available, collapsed behind a disclosure, for anyone who needs it.
 */
export function StorageSchemesValue({
  value,
}: {
  value: Record<string, unknown>;
}): React.JSX.Element {
  const schemes = Object.entries(value).filter((entry): entry is [
    string,
    Record<string, unknown>,
  ] => isSchemeObject(entry[1]));

  return (
    <div className="stac-storage-schemes">
      <ul className="stac-storage-schemes__list">
        {schemes.map(([id, scheme]) => {
          const uri = resolvePlatformUri(scheme);
          return (
            <li key={id} className="stac-storage-schemes__item">
              <div className="stac-storage-schemes__head">
                <span className="stac-storage-schemes__id">{id}</span>
                {typeof scheme.type === 'string' && (
                  <span className="stac-storage-schemes__type">
                    {scheme.type}
                  </span>
                )}
              </div>
              {uri ? (
                <div className="stac-storage-schemes__uri">
                  <code>{uri}</code>
                  <CopyTextButton
                    text={uri}
                    label={translate(
                      {
                        id: 'stac.storage.copy',
                        message: 'Copy {id} storage URI',
                        description:
                          'Label for the button that copies a resolved storage-scheme URI',
                      },
                      {id},
                    )}
                  />
                </div>
              ) : (
                typeof scheme.platform === 'string' && (
                  <code className="stac-storage-schemes__uri-raw">
                    {scheme.platform}
                  </code>
                )
              )}
            </li>
          );
        })}
      </ul>
      <details className="stac-storage-schemes__raw">
        <summary>
          <Translate id="stac.storage.rawToggle">Show raw JSON</Translate>
        </summary>
        <JsonBlock value={value} />
      </details>
    </div>
  );
}
