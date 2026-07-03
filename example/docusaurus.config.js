// @ts-check
// Minimal Docusaurus site to exercise docusaurus-plugin-stac.
//
// Env-driven so the same site works for (a) fast local/CI verification against
// the bundled sample catalog and (b) the deployed GitHub Pages demo pointed at
// Overture's live STAC catalog:
//   STAC_CATALOG_URL  STAC root (default: bundled ./stac/catalog.json)
//   STAC_MAX_ITEMS    per-collection Item cap (default: plugin default of 100)
//   STAC_PMTILES_URL  PMTiles basemap archive read in-browser (default: none)
//   DOCS_URL          site URL   (default: https://example.com)
//   DOCS_BASE_URL     base path  (default: /)

const catalogPath = process.env.STAC_CATALOG_URL || './stac/catalog.json';
const maxItemsEnv = process.env.STAC_MAX_ITEMS;
const maxItemsPerCollection = maxItemsEnv ? Number(maxItemsEnv) : undefined;
const pmtilesUrl = process.env.STAC_PMTILES_URL || undefined;

/** @type {import('docusaurus-plugin-stac').StacMapOptions} */
const map = {height: 380};
// Point the basemap at real Overture PMTiles when provided; the archive is read
// directly in the browser via HTTP range requests (no tile server). Omit to
// draw footprints over a plain background.
if (pmtilesUrl) {
  map.pmtilesUrl = pmtilesUrl;
}

/** @type {import('docusaurus-plugin-stac').StacPluginOptions} */
const stacOptions = {
  path: catalogPath,
  routeBasePath: '/stac',
  // Small page size so the demo exercises pagination with only a few items.
  itemsPerPage: 3,
  search: true,
  map,
};
if (maxItemsPerCollection !== undefined) {
  stacOptions.maxItemsPerCollection = maxItemsPerCollection;
}

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'docusaurus-plugin-stac demo',
  tagline: 'Static HTML pages for a STAC catalog',
  url: process.env.DOCS_URL || 'https://example.com',
  baseUrl: process.env.DOCS_BASE_URL || '/',
  favicon: undefined,
  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: false,
        blog: false,
        theme: {},
      }),
    ],
  ],

  plugins: [['docusaurus-plugin-stac', stacOptions]],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'STAC demo',
        items: [
          {to: '/stac', label: 'Catalog', position: 'left'},
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Built with docusaurus-plugin-stac.`,
      },
    }),
};

module.exports = config;
