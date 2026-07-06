// Regenerates `src/stac-extension-titles.ts` from the `extensions` map in
// `@radiantearth/stac-fields`'s `fields.json` — the same field-metadata
// registry STAC Browser itself uses to render friendly extension names. We
// copy the data into a plain TS module (rather than importing the JSON
// directly from theme code) so it's usable everywhere this plugin's theme
// components run (client bundle, SSR bundle, plain Node) with no import-
// attribute/module-format concerns. Re-run this (`npm run sync:extensions`)
// after bumping the `@radiantearth/stac-fields` dependency to pick up newly
// registered extensions.
import {createRequire} from 'node:module';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const root = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(root, '..', 'src', 'stac-extension-titles.ts');

const {extensions} = require('@radiantearth/stac-fields/fields.json');
const {version} = require('@radiantearth/stac-fields/package.json');

const header = `// AUTO-GENERATED — do not edit by hand.
// Source: @radiantearth/stac-fields@${version} fields.json "extensions" map
// (Apache-2.0, https://github.com/stac-utils/stac-fields), the same
// field-metadata registry STAC Browser uses to render extension names.
// Regenerate with \`npm run sync:extensions\` after bumping that dependency.
`;

const body = `export type StacExtensionSpec = string | {label: string; explain?: string};

/** Short field-name prefix (e.g. "eo", "proj") -> friendly title (+ optional
 * longer description). */
export const STAC_EXTENSION_TITLES: Record<string, StacExtensionSpec> =
${JSON.stringify(extensions, null, 2)};
`;

await fs.writeFile(outFile, header + '\n' + body);
console.log(`wrote ${path.relative(path.join(root, '..'), outFile)} (from stac-fields@${version})`);
