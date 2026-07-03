import {defineConfig} from 'vitest/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const stub = (p: string) => path.resolve(dir, p);

/**
 * The source is authored for TypeScript NodeNext, so relative imports carry a
 * `.js` extension. This scoped plugin rewrites those back to the real `.ts` /
 * `.tsx` source when the importer lives under `src/`, without touching
 * node_modules.
 */
function resolveNodeNextJs() {
  return {
    name: 'stac-resolve-nodenext-js',
    enforce: 'pre' as const,
    async resolveId(source: string, importer: string | undefined) {
      if (
        importer &&
        /[\\/]src[\\/]/.test(importer) &&
        /^\.{1,2}\//.test(source) &&
        source.endsWith('.js')
      ) {
        const base = source.slice(0, -3);
        for (const ext of ['.ts', '.tsx']) {
          // @ts-expect-error rollup plugin context is available at runtime
          const resolved = await this.resolve(base + ext, importer, {
            skipSelf: true,
          });
          if (resolved) return resolved.id;
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveNodeNextJs()],
  resolve: {
    alias: [
      {find: '@theme/Layout', replacement: stub('test/mocks/Layout.tsx')},
      {find: '@docusaurus/Head', replacement: stub('test/mocks/Head.tsx')},
      {find: '@docusaurus/Link', replacement: stub('test/mocks/Link.tsx')},
      {find: '@docusaurus/Translate', replacement: stub('test/mocks/Translate.tsx')},
      {
        find: '@docusaurus/BrowserOnly',
        replacement: stub('test/mocks/BrowserOnly.tsx'),
      },
      {
        find: '@docusaurus/useGlobalData',
        replacement: stub('test/mocks/useGlobalData.tsx'),
      },
      {
        find: '@theme-init/NotFound/Content',
        replacement: stub('test/mocks/NotFoundContent.tsx'),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/**/*.d.ts', 'src/types.ts'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 85,
      },
    },
  },
});
