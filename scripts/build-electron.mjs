import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'dist-electron');

await mkdir(outDir, { recursive: true });

const sharedOptions = {
  bundle: true,
  format: 'esm',
  legalComments: 'none',
  minify: process.env.NODE_ENV === 'production',
  platform: 'node',
  sourcemap: true,
  target: 'node20',
};

await Promise.all([
  build({
    ...sharedOptions,
    entryPoints: [path.join(rootDir, 'electron/main/index.js')],
    outfile: path.join(outDir, 'main/index.js'),
    external: ['electron'],
  }),
  build({
    ...sharedOptions,
    entryPoints: [path.join(rootDir, 'electron/preload/index.js')],
    outfile: path.join(outDir, 'preload/index.js'),
    external: ['electron'],
  }),
]);
