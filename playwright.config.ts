import {defineConfig, devices} from '@playwright/test';

/**
 * Playwright config for visual QA of the example Docusaurus site built with
 * docusaurus-plugin-stac. The webServer builds the plugin + example and serves
 * the static output; specs capture full-page screenshots (uploaded as CI
 * artifacts) and assert that content is server-rendered (crawlable).
 */
const PORT = Number(process.env.STAC_E2E_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', {open: 'never'}]] : 'list',
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome']}},
  ],
  webServer: {
    // The plugin + example are built by the `pretest:e2e` script (or the CI
    // build step); here we only need to serve the already-built site.
    command: `npm run serve --workspace example -- --port ${PORT} --no-open`,
    url: `${baseURL}/stac`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
