import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';

import type {StacItem as StacItemType, StacPageData} from '../../types.js';
import {
  AssetList,
  Breadcrumbs,
  LatestAliasPill,
  PropertiesTable,
  SourceJsonLink,
  StacHead,
  TypeBadge,
} from '../StacCommon/index.js';
import StacMap from '../StacMap/index.js';
import StacSidebar from '../StacSidebar/index.js';

export default function StacItem({
  data,
}: {
  data: StacPageData;
}): React.JSX.Element {
  const {node, routeBasePath, map, sidebarEnabled, jsonHref, jsonLd} = data;
  const stac = node.stac as StacItemType;
  const properties = stac.properties ?? {};

  return (
    <Layout title={node.title} description={String(properties.description ?? '')}>
      <StacHead jsonHref={jsonHref} jsonLd={jsonLd} />
      <div className={sidebarEnabled ? 'container margin-vert--lg stac-shell' : undefined}>
        {sidebarEnabled && <StacSidebar activeRoutePath={node.routePath} />}
        <main
          className={
            sidebarEnabled ? 'stac-page stac-shell__main' : 'container margin-vert--lg stac-page'
          }
        >
          <Breadcrumbs node={node} routeBasePath={routeBasePath} />
          <header className="stac-header">
            <TypeBadge type={node.type} />
            {node.isLatestAlias && <LatestAliasPill />}
            <h1 className="stac-title">{node.title}</h1>
            {node.id !== node.title && (
              <code className="stac-id">{node.id}</code>
            )}
            {stac.collection && (
              <span
                className="stac-collection-ref"
                title={translate({
                  id: 'stac.item.collectionTitle',
                  message: 'Collection',
                })}
              >
                {stac.collection}
              </span>
            )}
          </header>
          <SourceJsonLink jsonHref={jsonHref} />

          <section
            className="stac-map-section"
            aria-label={translate({id: 'stac.item.map', message: 'Footprint map'})}
          >
            <StacMap node={node} map={map} />
          </section>

          <PropertiesTable
            caption={translate({id: 'stac.item.properties', message: 'Properties'})}
            properties={properties}
          />

          <AssetList assets={stac.assets} />

          {node.parentRoutePath && (
            <p className="stac-parent-link">
              <Link to={node.parentRoutePath}>
                <Translate id="stac.item.backToParent">← Back to parent</Translate>
              </Link>
            </p>
          )}
        </main>
      </div>
    </Layout>
  );
}
