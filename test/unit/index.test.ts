import {describe, it, expect, vi} from 'vitest';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import pluginStac from '../../src/index.js';
import type {StacContent} from '../../src/types.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(dir, '../fixtures/catalog');

function makeContext(siteDir: string): any {
  return {siteDir, generatedFilesDir: siteDir};
}

describe('pluginStac', () => {
  it('throws when the path option is missing', () => {
    expect(() => pluginStac(makeContext(fixtureDir), {} as never)).toThrow(
      /path/,
    );
  });

  it('exposes theme paths and client modules', () => {
    const plugin = pluginStac(makeContext(fixtureDir), {
      path: 'catalog.json',
    });
    expect(plugin.name).toBe('docusaurus-plugin-stac');
    expect(plugin.getThemePath!()).toMatch(/theme$/);
    expect(plugin.getTypeScriptThemePath!()).toMatch(/theme$/);
    expect(plugin.getClientModules!()[0]).toMatch(/stac\.css$/);
  });

  it('loads content and registers routes + global data', async () => {
    const plugin = pluginStac(makeContext(fixtureDir), {
      path: 'catalog.json',
      title: 'Fixture',
      itemsPerPage: 5,
    });

    const content = (await plugin.loadContent!()) as StacContent;
    expect(content.nodes.length).toBeGreaterThan(0);

    const created: Record<string, string> = {};
    const routes: {path: string; component: string}[] = [];
    let globalData: any;
    const actions: any = {
      createData: vi.fn(async (name: string, data: string) => {
        created[name] = data;
        return `/data/${name}`;
      }),
      addRoute: vi.fn((r: {path: string; component: string}) => {
        routes.push(r);
      }),
      setGlobalData: vi.fn((d: unknown) => {
        globalData = d;
      }),
    };

    await plugin.contentLoaded!({content, actions} as never);

    // One route per node, mapped to the right component per type.
    expect(routes.length).toBe(content.nodes.length);
    const components = new Set(routes.map((r) => r.component));
    expect(components.has('@theme/StacCatalog')).toBe(true);
    expect(components.has('@theme/StacCollection')).toBe(true);
    expect(components.has('@theme/StacItem')).toBe(true);

    // Global data carries the nav tree + search index.
    expect(globalData.title).toBe('Fixture');
    expect(globalData.tree.routePath).toBe('/stac');
    expect(globalData.index.length).toBe(content.nodes.length);
    expect(globalData.itemsPerPage).toBe(5);
  });

  it('returns early from contentLoaded when there is no content', async () => {
    const plugin = pluginStac(makeContext(fixtureDir), {path: 'catalog.json'});
    const actions: any = {
      createData: vi.fn(),
      addRoute: vi.fn(),
      setGlobalData: vi.fn(),
    };
    await plugin.contentLoaded!({content: undefined, actions} as never);
    expect(actions.addRoute).not.toHaveBeenCalled();
    expect(actions.setGlobalData).not.toHaveBeenCalled();
  });

  it('uses an http path as the root source directly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          JSON.stringify({type: 'Catalog', id: 'remote', links: []}),
      })),
    );
    const plugin = pluginStac(makeContext(fixtureDir), {
      path: 'https://remote.test/catalog.json',
    });
    const content = (await plugin.loadContent!()) as StacContent;
    expect(content.root.id).toBe('remote');
    vi.restoreAllMocks();
  });
});
