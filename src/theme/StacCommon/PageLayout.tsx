import React from 'react';
import {translate} from '@docusaurus/Translate';

import type {StacNode} from '../../types.js';
import StacSidebar from '../StacSidebar/index.js';
import {LatestAliasPill, TypeBadge} from './index.js';

/**
 * The shared page scaffold used by every STAC page (Catalog, Collection,
 * Item): an optional sidebar next to a `<main>` content column, with the exact
 * same container/utility classes toggled on whether the sidebar is enabled.
 * Kept in its own module (rather than `StacCommon/index`) so importing
 * `StacSidebar` here doesn't create a cycle with the sidebar's own imports
 * from `StacCommon/index`.
 */
export function PageShell({
  sidebarEnabled,
  activeRoutePath,
  children,
}: {
  sidebarEnabled: boolean;
  activeRoutePath: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      className={
        sidebarEnabled ? 'container margin-vert--lg stac-shell' : undefined
      }
    >
      {sidebarEnabled && <StacSidebar activeRoutePath={activeRoutePath} />}
      <main
        className={
          sidebarEnabled
            ? 'stac-page stac-shell__main'
            : 'container margin-vert--lg stac-page'
        }
      >
        {children}
      </main>
    </div>
  );
}

/**
 * The shared page header: type badge, an optional "moving tag" pill for
 * `/latest` aliases, the title, and the id (shown only when it differs from
 * the title). Items additionally surface their parent collection id.
 */
export function PageHeader({
  node,
  collection,
}: {
  node: StacNode;
  collection?: string;
}): React.JSX.Element {
  return (
    <header className="stac-header">
      <TypeBadge type={node.type} />
      {node.isLatestAlias && <LatestAliasPill />}
      <h1 className="stac-title">{node.title}</h1>
      {node.id !== node.title && <code className="stac-id">{node.id}</code>}
      {collection && (
        <span
          className="stac-collection-ref"
          title={translate({
            id: 'stac.item.collectionTitle',
            message: 'Collection',
          })}
        >
          {collection}
        </span>
      )}
    </header>
  );
}
