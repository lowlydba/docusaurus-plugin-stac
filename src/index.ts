import path from 'node:path';
import {fileURLToPath} from 'node:url';

import type {LoadContext, Plugin} from '@docusaurus/types';

import {walkCatalog} from './catalog-walker.js';
import {normalizeOptions} from './options.js';
import {buildNavTree, buildSearchIndex} from './nav.js';
import type {
  StacContent,
  StacGlobalData,
  StacNode,
  StacPageData,
  StacPluginOptions,
} from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function componentForType(type: StacNode['type']): string {
  switch (type) {
    case 'Collection':
      return '@theme/StacCollection';
    case 'Item':
      return '@theme/StacItem';
    case 'Catalog':
    default:
      return '@theme/StacCatalog';
  }
}

export default function pluginStac(
  context: LoadContext,
  rawOptions: StacPluginOptions,
): Plugin<StacContent> {
  const options = normalizeOptions(rawOptions);
  const isHttp = /^https?:\/\//i.test(options.path);
  const rootSource = isHttp
    ? options.path
    : path.resolve(context.siteDir, options.path);

  return {
    name: 'docusaurus-plugin-stac',

    async loadContent() {
      return walkCatalog(rootSource, {
        routeBasePath: options.routeBasePath,
        maxDepth: options.maxDepth,
        maxItemsPerCollection: options.maxItemsPerCollection,
      });
    },

    async contentLoaded({content, actions}) {
      if (!content) return;
      const {createData, addRoute, setGlobalData} = actions;

      const globalData: StacGlobalData = {
        routeBasePath: options.routeBasePath,
        title: options.title ?? content.root.title,
        map: options.map,
        itemsPerPage: options.itemsPerPage,
        search: options.search,
        tree: buildNavTree(content),
        index: buildSearchIndex(content),
      };
      setGlobalData(globalData);

      for (const node of content.nodes) {
        const pageData: StacPageData = {
          node,
          routeBasePath: options.routeBasePath,
          map: options.map,
          itemsPerPage: options.itemsPerPage,
          searchEnabled: options.search,
        };
        const dataPath = await createData(
          `stac-${node.routePath.replace(/[^a-z0-9]+/gi, '_')}.json`,
          JSON.stringify(pageData),
        );

        addRoute({
          path: node.routePath,
          component: componentForType(node.type),
          modules: {data: dataPath},
          exact: true,
        });
      }
    },

    getThemePath() {
      return path.join(__dirname, 'theme');
    },

    getTypeScriptThemePath() {
      return path.join(__dirname, '..', 'src', 'theme');
    },

    getClientModules() {
      return [path.join(__dirname, 'theme', 'stac.css')];
    },
  };
}

export type {
  StacPluginOptions,
  StacMapOptions,
  StacNode,
  StacContent,
  StacPageData,
  StacGlobalData,
  StacSearchEntry,
} from './types.js';
