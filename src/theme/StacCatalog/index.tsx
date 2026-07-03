import React from 'react';
import Layout from '@theme/Layout';
import Translate from '@docusaurus/Translate';

import type {StacPageData} from '../../types.js';
import {
  Breadcrumbs,
  ChildList,
  LazyChildList,
  SourceJsonLink,
  StacHead,
  TypeBadge,
} from '../StacCommon/index.js';
import StacSearch from '../StacSearch/index.js';

export default function StacCatalog({
  data,
}: {
  data: StacPageData;
}): React.JSX.Element {
  const {node, routeBasePath, itemsPerPage, searchEnabled, jsonHref, jsonLd} =
    data;
  const stac = node.stac as {description?: string};
  const isRoot = node.routePath === routeBasePath;

  return (
    <Layout title={node.title} description={stac.description}>
      <StacHead jsonHref={jsonHref} jsonLd={jsonLd} />
      <main className="container margin-vert--lg stac-page">
        <Breadcrumbs node={node} routeBasePath={routeBasePath} rootTitle={node.title} />
        <header className="stac-header">
          <TypeBadge type={node.type} />
          <h1 className="stac-title">{node.title}</h1>
          {node.id !== node.title && (
            <code className="stac-id">{node.id}</code>
          )}
        </header>
        <SourceJsonLink jsonHref={jsonHref} />
        {stac.description && <p className="stac-description">{stac.description}</p>}

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
      </main>
    </Layout>
  );
}
