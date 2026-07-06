import React from 'react';
import Layout from '@theme/Layout';
import Translate from '@docusaurus/Translate';

import type {StacLink, StacPageData} from '../../types.js';
import {
  Breadcrumbs,
  ChildList,
  ExtensionsList,
  LazyChildList,
  LicenseValue,
  SourceJsonLink,
  StacHead,
  Thumbnail,
  licenseLinks,
} from '../StacCommon/index.js';
import {PageHeader, PageShell} from '../StacCommon/PageLayout.js';
import StacSearch from '../StacSearch/index.js';

export default function StacCatalog({
  data,
}: {
  data: StacPageData;
}): React.JSX.Element {
  const {node, routeBasePath, itemsPerPage, searchEnabled, sidebarEnabled, jsonHref, jsonLd} =
    data;
  const stac = node.stac as {
    description?: string;
    license?: string;
    links?: StacLink[];
    stac_extensions?: string[];
  };
  const isRoot = node.routePath === routeBasePath;
  const hasLicense = Boolean(stac.license) || licenseLinks(stac.links).length > 0;

  return (
    <Layout title={node.title} description={stac.description}>
      <StacHead jsonHref={jsonHref} jsonLd={jsonLd} />
      <PageShell sidebarEnabled={sidebarEnabled} activeRoutePath={node.routePath}>
        <Breadcrumbs node={node} routeBasePath={routeBasePath} rootTitle={node.title} />
        <PageHeader node={node} />
        <SourceJsonLink jsonHref={jsonHref} />
        <Thumbnail stac={stac} alt={node.title} />
        {stac.description && <p className="stac-description">{stac.description}</p>}
        {hasLicense && <LicenseValue license={stac.license} links={stac.links} />}
        <ExtensionsList extensions={stac.stac_extensions} />

        {isRoot && searchEnabled && <StacSearch pluginId="default" />}

        <h2 className="stac-section-title">
          <Translate
            id="stac.catalog.contents"
            values={{count: node.children.length}}
          >
            {'Contents ({count})'}
          </Translate>
        </h2>
        <ChildList children={node.children} itemsPerPage={itemsPerPage} />
        <LazyChildList lazyChildren={node.lazyChildren} batchSize={itemsPerPage} />
      </PageShell>
    </Layout>
  );
}
