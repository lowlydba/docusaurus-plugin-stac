import path from 'node:path';
import {fileURLToPath} from 'node:url';

import type {LoadContext, Plugin} from '@docusaurus/types';

import {walkCatalog} from './catalog-walker.js';
import type {
  NormalizedStacMapOptions,
  NormalizedStacPluginOptions,
  StacContent,
  StacNode,
  StacPageData,
  StacPluginOptions,
} from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_ROUTE_BASE = '/stac';
const DEFAULT_MAP_HEIGHT = 360;
const DEFAULT_FOOTPRINT_COLOR = '#e0114a';

function normalizeRouteBase(routeBasePath: string): string {
  let base = routeBasePath.trim();
  if (!base.startsWith('/')) base = `/${base}`;
  if (base.length > 1 && base.endsWith('/')) base = base.replace(/\/+$/, '');
  return base;
}

function normalizeMap(
  map: StacPluginOptions['map'],
): NormalizedStacMapOptions {
  if (map === false) {
    return {
      enabled: false,
      height: DEFAULT_MAP_HEIGHT,
      footprintColor: DEFAULT_FOOTPRINT_COLOR,
    };
  }
  const m = map ?? {};
  return {
    enabled: m.enabled ?? true,
    pmtilesUrl: m.pmtilesUrl,
    style: m.style,
    attribution: m.attribution,
    height: m.height ?? DEFAULT_MAP_HEIGHT,
    footprintColor: m.footprintColor ?? DEFAULT_FOOTPRINT_COLOR,
  };
}

function normalizeOptions(
  options: StacPluginOptions,
): NormalizedStacPluginOptions {
  if (!options || !options.path) {
    throw new Error(
      "docusaurus-plugin-stac: the `path` option (root STAC catalog path or URL) is required.",
    );
  }
  return {
    path: options.path,
    routeBasePath: normalizeRouteBase(options.routeBasePath ?? DEFAULT_ROUTE_BASE),
    id: options.id ?? 'default',
    title: options.title,
    maxDepth: options.maxDepth ?? Number.POSITIVE_INFINITY,
    map: normalizeMap(options.map),
  };
}

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

interface NavNode {
  id: string;
  type: StacNode['type'];
  title: string;
  routePath: string;
  children: NavNode[];
}

function buildNavTree(content: StacContent): NavNode {
  const byRoute = new Map<string, StacNode>();
  for (const n of content.nodes) byRoute.set(n.routePath, n);

  function toNav(node: StacNode): NavNode {
    return {
      id: node.id,
      type: node.type,
      title: node.title,
      routePath: node.routePath,
      children: node.children
        .map((c) => byRoute.get(c.routePath))
        .filter((n): n is StacNode => Boolean(n))
        .map(toNav),
    };
  }

  return toNav(content.root);
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
      });
    },

    async contentLoaded({content, actions}) {
      if (!content) return;
      const {createData, addRoute, setGlobalData} = actions;

      const navTree = buildNavTree(content);
      setGlobalData({
        routeBasePath: options.routeBasePath,
        title: options.title ?? content.root.title,
        map: options.map,
        tree: navTree,
      });

      for (const node of content.nodes) {
        const pageData: StacPageData = {
          node,
          routeBasePath: options.routeBasePath,
          map: options.map,
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
} from './types.js';
