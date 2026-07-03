// Copy non-TypeScript theme assets (CSS, etc.) from src/ into lib/ after tsc,
// preserving directory structure. tsc only emits .js/.d.ts, so static assets
// referenced by getThemePath()/getClientModules() must be copied manually.
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(root, '..', 'src');
const libDir = path.join(root, '..', 'lib');

const ASSET_EXTENSIONS = new Set(['.css', '.svg', '.png', '.jpg', '.jpeg', '.gif']);

async function copyAssets(dir) {
  const entries = await fs.readdir(dir, {withFileTypes: true});
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await copyAssets(abs);
    } else if (ASSET_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      const rel = path.relative(srcDir, abs);
      const dest = path.join(libDir, rel);
      await fs.mkdir(path.dirname(dest), {recursive: true});
      await fs.copyFile(abs, dest);
      console.log(`copied ${rel}`);
    }
  }
}

await copyAssets(srcDir);
