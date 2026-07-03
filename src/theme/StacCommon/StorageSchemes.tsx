import React from 'react';
import Translate, {translate} from '@docusaurus/Translate';

import {JsonBlock} from './JsonBlock.js';
import {CopyTextButton} from './CopyButton.js';
import {ProviderIcon, type StorageProviderKind} from './ProviderIcons.js';
import {isPlainObject} from '../../utils.js';

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


/**
 * Best-effort detection of which major cloud provider a storage scheme
 * belongs to, so a recognizable brand icon can be shown next to it. The STAC
 * storage extension only standardizes `type` values for AWS (`aws-s3`) and
 * Azure (`ms-azure`) — GCP has no documented `type`, so it's inferred from
 * the id/platform instead. `custom-s3` is the extension's documented type
 * for generic/non-AWS S3-compatible stores (MinIO, Wasabi, etc.) and is
 * checked first so it's never mistaken for AWS.
 */
export function detectStorageProvider(
  id: string,
  scheme: Record<string, unknown>,
  resolvedUri: string | undefined,
): StorageProviderKind {
  const type =
    typeof scheme.type === 'string' ? scheme.type.toLowerCase() : '';
  if (type === 'custom-s3') return 'generic';

  const platform =
    resolvedUri ?? (typeof scheme.platform === 'string' ? scheme.platform : '');
  const haystack = `${id} ${type} ${platform}`.toLowerCase();

  if (/\baws\b|aws-s3|amazonaws\.com/.test(haystack)) return 'aws';
  if (/azure|\.windows\.net/.test(haystack)) return 'azure';
  if (/\bgcp\b|\bgcs\b|google|googleapis\.com/.test(haystack)) return 'gcp';
  return 'generic';
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
  ] => isPlainObject(entry[1]));

  return (
    <div className="stac-storage-schemes">
      <ul className="stac-storage-schemes__list">
        {schemes.map(([id, scheme]) => {
          const uri = resolvePlatformUri(scheme);
          const provider = detectStorageProvider(id, scheme, uri);
          return (
            <li key={id} className="stac-storage-schemes__item">
              <div className="stac-storage-schemes__head">
                <span className="stac-storage-schemes__id">{id}</span>
                <ProviderIcon provider={provider} />
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
