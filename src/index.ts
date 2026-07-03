import path from 'node:path';
import {fileURLToPath} from 'node:url';

import type {LoadContext, Plugin} from '@docusaurus/types';
import {normalizeUrl} from '@docusaurus/utils';

import {walkCatalog} from './catalog-walker.js';
import {normalizeOptions} from './options.js';
import {buildNavTree, buildSearchIndex} from './nav.js';
import {buildDataset} from './jsonld.js';
import {isHttp} from './utils.js';
import type {
  StacContent,
  StacGlobalData,
  StacNode,
  StacPageData,
  StacPluginOptions,
} from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOG_PREFIX = '[docusaurus-plugin-stac]';

function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`${LOG_PREFIX} ${message}`);
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

export default function pluginStac(
  context: LoadContext,
  rawOptions: StacPluginOptions,
): Plugin<StacContent> {
  const options = normalizeOptions(rawOptions);
  const rootIsHttp = isHttp(options.path);
  const rootSource = rootIsHttp
    ? options.path
    : path.resolve(context.siteDir, options.path);

  const siteUrl = context.siteConfig?.url ?? '';
  // We link agents to the *upstream* STAC source rather than re-emitting our
  // (link-rewritten) copy. Only http(s) sources are web-addressable; local
  // filesystem catalogs get no JSON link (serve them over http to enable it).
  const remoteJsonHref = (node: StacNode): string | undefined =>
    isHttp(node.sourceHref) ? node.sourceHref : undefined;

  return {
    name: 'docusaurus-plugin-stac',

    async loadContent() {
      log(`Crawling STAC catalog at ${rootSource}…`);
      const startedAt = Date.now();

      // Throttled progress: for large or remote catalogs the crawl can run for
      // minutes with no output, which looks like a hang. Emit a heartbeat at
      // most every 5s (and never for tiny local catalogs that finish first).
      // Each heartbeat reports the running elapsed time and crawl rate so a
      // long build reads as steady progress rather than a stall.
      const PROGRESS_INTERVAL_MS = 5000;
      let lastLoggedAt = startedAt;
      let lastLoggedCount = 0;

      const content = await walkCatalog(rootSource, {
        routeBasePath: options.routeBasePath,
        maxDepth: options.maxDepth,
        maxItemsPerCollection: options.maxItemsPerCollection,
        onNode: ({count, remote}) => {
          if (!remote) return;
          const now = Date.now();
          if (now - lastLoggedAt >= PROGRESS_INTERVAL_MS && count > lastLoggedCount) {
            const seconds = (now - startedAt) / 1000;
            const rate = (count / seconds).toFixed(1);
            log(
              `  …crawled ${count} nodes so far ` +
                `(${seconds.toFixed(0)}s elapsed, ${rate} nodes/s)`,
            );
            lastLoggedAt = now;
            lastLoggedCount = count;
          }
        },
      });

      const counts = {Catalog: 0, Collection: 0, Item: 0};
      let lazy = 0;
      for (const node of content.nodes) {
        counts[node.type]++;
        lazy += node.lazyChildren.length;
      }
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      log(
        `Crawled ${content.nodes.length} nodes in ${elapsed}s ` +
          `(${counts.Catalog} catalog(s), ${counts.Collection} collection(s), ` +
          `${counts.Item} item(s)` +
          (lazy > 0 ? `, ${lazy} lazy item(s)` : '') +
          ').',
      );
      return content;
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
        sidebar: options.sidebar,
        tree: buildNavTree(content),
        index: buildSearchIndex(content),
        notFoundHint: options.notFoundHint,
      };
      setGlobalData(globalData);

      log(`Generating ${content.nodes.length} static route(s)…`);
      for (const node of content.nodes) {
        const jsonHref = remoteJsonHref(node);
        const jsonLd = jsonHref
          ? (buildDataset(node, {
              pageUrl: normalizeUrl([siteUrl, context.baseUrl, node.routePath]),
              jsonUrl: jsonHref,
            }) as unknown as Record<string, unknown>)
          : undefined;

        const pageData: StacPageData = {
          node,
          routeBasePath: options.routeBasePath,
          map: options.map,
          itemsPerPage: options.itemsPerPage,
          searchEnabled: options.search,
          sidebarEnabled: options.sidebar,
          jsonHref,
          jsonLd,
        };
        const dataPath = await createData(
          `stac-${node.routePath.replace(/[^a-z0-9]+/gi, '_')}.json`,
          JSON.stringify(pageData),
        );

        addRoute({
          // `node.routePath` is baseUrl-relative (used as-is by `<Link>`,
          // which prepends baseUrl itself). The router that matches routes
          // against the actual browser pathname needs the baseUrl-inclusive
          // path, matching the convention used by Docusaurus's own content
          // plugins (see @docusaurus/plugin-content-pages). Omitting this
          // causes a client-side route-matching mismatch after hydration
          // (page renders fine from the server, then flips to "Page Not
          // Found" once React takes over).
          path: normalizeUrl([context.baseUrl, node.routePath]),
          component: componentForType(node.type),
          modules: {data: dataPath},
          exact: true,
        });
      }
      log(`Registered ${content.nodes.length} route(s).`);
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
  StacNotFoundHintOptions,
  StacNotFoundHintLink,
} from './types.js';
