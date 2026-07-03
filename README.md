# docusaurus-plugin-stac

A [Docusaurus](https://docusaurus.io) plugin that ingests a static
[STAC](https://stacspec.org) (SpatioTemporal Asset Catalog) and generates **real,
crawlable static HTML pages** for every Catalog, Collection and Item at build time.

The STAC spec deliberately keeps HTML rendering out of scope, and the community
[STAC Browser](https://github.com/radiantearth/stac-browser) is a client-rendered
SPA — so catalog content isn't visible to crawlers before JavaScript executes.
This plugin closes that gap: each node becomes a static route with server-rendered
metadata, plus an optional interactive map.

## Demo

A live demo built from [Overture Maps](https://overturemaps.org)' STAC catalog is
deployed on every merge to `main`:

**https://lowlydba.github.io/docusaurus-plugin-stac/**

Because Overture's collections hold hundreds of Items each, the demo sets
`maxItemsPerCollection` to keep the build bounded — see
[Options](#options).

## Features

- Walks `child` / `item` links from a root catalog (local path **or** `http(s)` URL),
  resolving relative hrefs and guarding against cycles.
- Emits one static HTML route per Catalog / Collection / Item under a configurable
  base path (default `/stac`).
- Server-renders titles, descriptions, metadata tables, extents, providers and
  assets — fully crawlable without JS.
- Optional [MapLibre GL](https://maplibre.org) + [PMTiles](https://github.com/protomaps/PMTiles)
  footprint map on Item pages, reading Overture (or any) PMTiles directly in the
  browser via HTTP range requests — **no tile server required**.
- The map is **fully toggleable** and degrades to a text-only footprint when
  disabled or unavailable.

## Install

```bash
npm install docusaurus-plugin-stac
```

`maplibre-gl` and `pmtiles` ship as dependencies; `@docusaurus/core`, `react` and
`react-dom` are peer dependencies provided by your site.

## Usage

```js
// docusaurus.config.js
module.exports = {
  plugins: [
    [
      'docusaurus-plugin-stac',
      {
        // Required: path or URL to the root catalog/collection JSON.
        path: './stac/catalog.json',
        // Optional: base route for all generated pages (default '/stac').
        routeBasePath: '/stac',
        // Optional: map configuration (see below), or `false` to disable maps.
        map: {
          pmtilesUrl:
            'https://overturemaps-tiles-us-west-2-beta.s3.amazonaws.com/2024-.../base.pmtiles',
          height: 380,
        },
      },
    ],
  ],
};
```

## Options

| Option          | Type                          | Default      | Description                                                                 |
| --------------- | ----------------------------- | ------------ | --------------------------------------------------------------------------- |
| `path`          | `string` (**required**)       | —            | Root STAC catalog/collection JSON. Local paths resolve to the site dir; `http(s)` URLs are fetched. |
| `routeBasePath` | `string`                      | `'/stac'`    | Base route all generated pages live under.                                  |
| `id`            | `string`                      | `'default'`  | Instance id for multi-instance use.                                         |
| `title`         | `string`                      | catalog title| Nav/root title override.                                                    |
| `maxDepth`      | `number`                      | `Infinity`   | Max depth to walk from the root (root = 0).                                 |
| `maxItemsPerCollection` | `number`              | `Infinity`   | Cap on the number of Items materialized per parent. Child/sub-catalog links are always followed; only Item links past the cap are skipped (not fetched). Use for API-scale catalogs (e.g. Overture) where a full walk would generate tens of thousands of pages. |
| `itemsPerPage`  | `number`                      | `10`         | Page size for paginated child lists.                                        |
| `search`        | `boolean`                     | `true`       | Build a client-side search index + search UI.                               |
| `map`           | `object \| false`             | enabled      | Map configuration, or `false` to disable maps entirely.                     |

### `map` options

| Option           | Type                          | Default     | Description                                                                            |
| ---------------- | ----------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `enabled`        | `boolean`                     | `true`      | Master toggle.                                                                         |
| `pmtilesUrl`     | `string`                      | —           | URL to a PMTiles archive read in-browser via range requests. Omit to skip basemap tiles. |
| `style`          | `string \| object`            | —           | A MapLibre style URL or inline style object; takes precedence over the built-in style.   |
| `attribution`    | `string`                      | Overture    | Attribution string for the basemap source.                                            |
| `height`         | `number`                      | `360`       | Map height in CSS pixels.                                                              |
| `footprintColor` | `string`                      | `'#e0114a'` | Color of the footprint outline.                                                        |

**Disabling maps.** Set `map: false` for users who don't have PMTiles access or
don't want to build them — Item pages then render a text-only bounding-box footprint:

```js
['docusaurus-plugin-stac', {path: './stac/catalog.json', map: false}]
```

If `map` is enabled but no `pmtilesUrl` / `style` is given, the map still draws the
Item footprint over a plain background.

## Theme components

The plugin ships swizzle-able theme components you can override in your site:
`StacCatalog`, `StacCollection`, `StacItem`, `StacMap`, and shared bits in
`StacCommon`.

## Example

A runnable demo lives in [`example/`](./example):

```bash
npm install          # installs the workspace (root plugin + example)
npm run build        # builds the plugin
npm run build --workspace example   # builds the demo site into example/build
```

Then open `example/build/stac/index.html` (or `npm run serve --workspace example`).

## How it works

1. `loadContent` walks the catalog from `path`, following `child`/`item` links into
   a flattened, route-assigned node tree.
2. `contentLoaded` writes each node's data with `createData` and registers a route
   with `addRoute`, choosing a component by node type.
3. Theme components server-render the metadata; the map mounts client-side only
   (via `BrowserOnly`), keeping the HTML crawlable.

## License

MIT © John McCall
