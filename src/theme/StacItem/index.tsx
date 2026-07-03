import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';

import type {StacItem as StacItemType, StacPageData} from '../../types.js';
import {
  AssetList,
  Breadcrumbs,
  PropertiesTable,
  SourceJsonLink,
  StacHead,
} from '../StacCommon/index.js';
import {PageHeader, PageShell} from '../StacCommon/PageLayout.js';
import StacMap from '../StacMap/index.js';

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
      <PageShell sidebarEnabled={sidebarEnabled} activeRoutePath={node.routePath}>
        <Breadcrumbs node={node} routeBasePath={routeBasePath} />
        <PageHeader node={node} collection={stac.collection} />
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
      </PageShell>
    </Layout>
  );
}
