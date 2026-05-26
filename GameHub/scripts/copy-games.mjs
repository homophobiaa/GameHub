/**
 * Copies ../Games into public/Games so Vite can serve the standalone
 * game HTML files as static assets at /Games/{folder}/index.html.
 *
 * Run automatically via `predev` and `prebuild` npm scripts.
 */

import { cpSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, '../../Games');
const dest = resolve(__dirname, '../public/Games');

if (!existsSync(src)) {
  console.warn('[copy-games] ../Games folder not found — skipping copy.');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true, force: true });
console.log('[copy-games] Copied ../Games → public/Games ✓');
