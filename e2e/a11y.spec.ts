import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG 2.2 AA automated accessibility checks for the example site, covering
 * the three generated page types (catalog, collection, item) plus the
 * interactive sidebar tree and search widget, in both color-scheme themes.
 * axe-core covers a meaningful subset of WCAG success criteria automatically
 * (contrast, labeling, landmarks, ARIA misuse, etc.) — it's not a full manual
 * audit, but it catches regressions cheaply in CI.
 */
const CATALOG = '/stac';
const COLLECTION = '/stac/sentinel-2-sample';
const ITEM = '/stac/sentinel-2-sample/s2-sf-20210615';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// The MapLibre canvas widget is a third-party vendor component we don't
// control the internals of; exclude it so its own a11y posture doesn't fail
// checks against *our* generated markup.
const VENDOR_EXCLUDE = '.maplibregl-map';

test.describe('accessibility (WCAG 2.2 AA)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`${theme} theme`, () => {
      test.use({colorScheme: theme});

      test(`catalog root has no violations (${theme})`, async ({page}) => {
        await page.goto(CATALOG, {waitUntil: 'networkidle'});
        const results = await new AxeBuilder({page})
          .withTags(WCAG_TAGS)
          .exclude(VENDOR_EXCLUDE)
          .analyze();
        expect(results.violations).toEqual([]);
      });

      test(`catalog search results have no violations (${theme})`, async ({page}) => {
        await page.goto(CATALOG, {waitUntil: 'networkidle'});
        await page.getByPlaceholder('Search the catalog…').fill('sentinel');
        await expect(page.locator('.stac-search__results')).toBeVisible();
        const results = await new AxeBuilder({page})
          .withTags(WCAG_TAGS)
          .exclude(VENDOR_EXCLUDE)
          .analyze();
        expect(results.violations).toEqual([]);
      });

      test(`collection page has no violations (${theme})`, async ({page}) => {
        await page.goto(COLLECTION, {waitUntil: 'networkidle'});
        const results = await new AxeBuilder({page})
          .withTags(WCAG_TAGS)
          .exclude(VENDOR_EXCLUDE)
          .analyze();
        expect(results.violations).toEqual([]);
      });

      test(`item page has no violations (${theme})`, async ({page}) => {
        await page.goto(ITEM, {waitUntil: 'networkidle'});
        const results = await new AxeBuilder({page})
          .withTags(WCAG_TAGS)
          .exclude(VENDOR_EXCLUDE)
          .analyze();
        expect(results.violations).toEqual([]);
      });

      test(`sidebar tree (expanded) has no violations (${theme})`, async ({page}) => {
        await page.goto(ITEM, {waitUntil: 'networkidle'});
        // Expand every collapsed branch so the scan covers the fuller tree,
        // not just the ancestor path that's expanded by default.
        const toggles = page.locator('.stac-tree__toggle[aria-expanded="false"]');
        const count = await toggles.count();
        for (let i = 0; i < count; i += 1) {
          await toggles.nth(0).click();
        }
        const results = await new AxeBuilder({page})
          .include('.stac-tree')
          .withTags(WCAG_TAGS)
          .analyze();
        expect(results.violations).toEqual([]);
      });
    });
  }
});
