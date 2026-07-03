// @ts-check
// Minimal Docusaurus site to exercise docusaurus-plugin-stac.

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'docusaurus-plugin-stac demo',
  tagline: 'Static HTML pages for a STAC catalog',
  url: 'https://example.com',
  baseUrl: '/',
  favicon: undefined,
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

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

  plugins: [
    [
      'docusaurus-plugin-stac',
      /** @type {import('docusaurus-plugin-stac').StacPluginOptions} */
      ({
        path: './stac/catalog.json',
        routeBasePath: '/stac',
        // Map is enabled by default. To point at real Overture PMTiles, set
        // `pmtilesUrl`. To disable maps entirely, set `map: false`.
        map: {
          // pmtilesUrl: 'https://overturemaps-tiles-us-west-2-beta.s3.amazonaws.com/2024-.../base.pmtiles',
          height: 380,
        },
      }),
    ],
  ],

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
