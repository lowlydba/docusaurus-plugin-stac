import React from 'react';
import Layout from '@theme/Layout';

import type {StacPageData} from '../../types.js';
import {Breadcrumbs, ChildList, TypeBadge} from '../StacCommon/index.js';

export default function StacCatalog({
  data,
}: {
  data: StacPageData;
}): React.JSX.Element {
  const {node, routeBasePath} = data;
  const stac = node.stac as {description?: string};

  return (
    <Layout title={node.title} description={stac.description}>
      <main className="container margin-vert--lg stac-page">
        <Breadcrumbs node={node} routeBasePath={routeBasePath} rootTitle={node.title} />
        <header className="stac-header">
          <TypeBadge type={node.type} />
          <h1 className="stac-title">{node.title}</h1>
          <code className="stac-id">{node.id}</code>
        </header>
        {stac.description && <p className="stac-description">{stac.description}</p>}

        <h2 className="stac-section-title">
          Contents ({node.children.length})
        </h2>
        <ChildList children={node.children} />
      </main>
    </Layout>
  );
}
