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

/** @type {import('@lowlydba/docusaurus-plugin-stac').StacMapOptions} */
const map = {height: 380};
// Point the basemap at real Overture PMTiles when provided; the archive is read
// directly in the browser via HTTP range requests (no tile server). Omit to
// draw footprints over a plain background.
if (pmtilesUrl) {
  map.pmtilesUrl = pmtilesUrl;
}

/** @type {import('@lowlydba/docusaurus-plugin-stac').StacPluginOptions} */
const stacOptions = {
  path: catalogPath,
  routeBasePath: '/stac',
  // Page size for the demo; small enough that the 12-item sample still
  // exercises pagination, large enough to show a useful list at a glance.
  itemsPerPage: 6,
  search: true,
  map,
  // Overture-specific 404 content: this plugin has no built-in opinion about
  // *why* a page might be gone (that's the point — see NotFoundHint.tsx),
  // but Overture's own data retention policy (GDPR "right to be forgotten"
  // compliance) removes dated releases after 60 days, which is exactly the
  // kind of dead link a demo pointed at Overture's live catalog will hit.
  notFoundHint: {
    title: 'Looking for a previous release?',
    description:
      "Overture Maps only keeps the last two monthly data releases publicly available (60 days), removing older ones to comply with GDPR's " +
      "\"right to be forgotten\". If you followed a link to a dated release that's gone, the data has likely aged out rather than moved.",
    links: [
      {
        label: "Overture's data retention policy",
        href: 'https://docs.overturemaps.org/release-calendar/#data-retention-policy',
      },
      {
        label: 'Browse the latest release instead',
        href: '/stac',
      },
    ],
  },
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
  // GitHub Pages redirects directory-style URLs (e.g. `/stac`) to their
  // trailing-slash form (`/stac/`). Without this, Docusaurus's client router
  // can fail to match the trailing-slash URL after hydration and render a
  // NotFound page even though the server-rendered HTML was correct.
  trailingSlash: true,
  // Deliberately non-fatal: when pointed at Overture's live catalog (see
  // deploy-demo.yml), STAC_MAX_ITEMS caps items per collection so the build
  // stays bounded. Items beyond the cap are lazy-loaded client-side rather
  // than statically rendered, so some pagination/breadcrumb links can point
  // at pages that don't exist as static routes. That's expected here, not a
  // bug — warn instead of failing the build.
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
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  plugins: [['@lowlydba/docusaurus-plugin-stac', stacOptions]],

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
        copyright: `Built with <a href="https://github.com/lowlydba/docusaurus-plugin-stac">docusaurus-plugin-stac</a>.`,
      },
    }),
};

module.exports = config;
