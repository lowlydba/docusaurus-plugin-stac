import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';

import type {StacItem as StacItemType, StacPageData} from '../../types.js';
import {
  AssetList,
  Breadcrumbs,
  LicenseValue,
  PropertiesTable,
  SourceJsonLink,
  StacHead,
  Thumbnail,
  licenseLinks,
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
  // Items rarely repeat `license`/license links (STAC scopes that to the
  // Collection by default), but the spec allows overriding it per Item, and
  // some catalogs (e.g. Overture) attach it here too — surface it if present,
  // separately from `properties.license`, which the table below already
  // shows generically.
  const hasLinkLicense = licenseLinks(stac.links).length > 0;

  return (
    <Layout title={node.title} description={String(properties.description ?? '')}>
      <StacHead jsonHref={jsonHref} jsonLd={jsonLd} />
      <PageShell sidebarEnabled={sidebarEnabled} activeRoutePath={node.routePath}>
        <Breadcrumbs node={node} routeBasePath={routeBasePath} />
        <PageHeader node={node} collection={stac.collection} />
        <SourceJsonLink jsonHref={jsonHref} />
        {hasLinkLicense && <LicenseValue links={stac.links} />}
        <Thumbnail stac={stac} alt={node.title} />

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
