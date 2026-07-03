import {test, expect, type Page} from '@playwright/test';
import path from 'node:path';

const shotDir = 'screenshots';

const CATALOG = '/stac';
const COLLECTION = '/stac/sentinel-2-sample';
const ITEM = '/stac/sentinel-2-sample/s2-sf-20210615';
const OLD_ITEM = '/stac/sentinel-2-sample/s2-sj-20210610';

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({path: path.join(shotDir, `${name}.png`), fullPage: true});
}

test.describe('docusaurus-plugin-stac example site', () => {
  test('catalog root renders and is crawlable', async ({page}) => {
    await page.goto(CATALOG, {waitUntil: 'networkidle'});
    await expect(page.getByRole('heading', {name: 'Demo STAC Catalog'})).toBeVisible();
    // Search box present at the root.
    await expect(page.getByPlaceholder('Search the catalog…')).toBeVisible();
    // Child collection link is in the server-rendered HTML.
    await expect(page.getByRole('link', {name: /Sentinel-2 Sample/})).toBeVisible();
    await shot(page, 'catalog');
  });

  test('catalog search filters results', async ({page}) => {
    await page.goto(CATALOG, {waitUntil: 'networkidle'});
    await page.getByPlaceholder('Search the catalog…').fill('sentinel');
    // Scope the assertion to the search results panel.
    const results = page.locator('.stac-search__results');
    await expect(results.getByRole('link', {name: /Sentinel-2 Sample/})).toBeVisible();
    await shot(page, 'catalog-search');
  });

  test('collection page paginates its items', async ({page}) => {
    await page.goto(COLLECTION, {waitUntil: 'networkidle'});
    await expect(page.getByRole('heading', {name: 'Sentinel-2 Sample'})).toBeVisible();
    // itemsPerPage=3 with 4 items → pagination controls appear.
    await expect(page.getByText(/Page 1 of 2/)).toBeVisible();
    await shot(page, 'collection');

    await page.getByRole('button', {name: 'Next'}).click();
    await expect(page.getByText(/Page 2 of 2/)).toBeVisible();
    await shot(page, 'collection-page2');
  });

  test('collection lists every item in the DOM (crawlable pagination)', async ({page}) => {
    await page.goto(COLLECTION, {waitUntil: 'networkidle'});
    // All four items are present in the markup even though only three show.
    const items = page.locator('.stac-child-list__item');
    await expect(items).toHaveCount(4);
  });

  test('item page renders properties, assets and a footprint map', async ({page}) => {
    await page.goto(ITEM, {waitUntil: 'networkidle'});
    await expect(page.locator('h1.stac-title')).toBeVisible();
    // Extension-aware label from the field registry.
    await expect(page.getByText('Cloud cover')).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Assets'})).toBeVisible();
    // The map section is mounted.
    await expect(page.locator('.stac-map-section')).toBeVisible();
    await shot(page, 'item');
  });

  test('legacy 0.8.1 item still renders', async ({page}) => {
    await page.goto(OLD_ITEM, {waitUntil: 'networkidle'});
    await expect(page.locator('h1.stac-title')).toBeVisible();
    await shot(page, 'item-legacy');
  });
});
