import * as esbuild from 'esbuild';
import { mkdirSync, existsSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

// Ensure dist directory exists
if (!existsSync(join(__dirname, 'dist'))) {
  mkdirSync(join(__dirname, 'dist'), { recursive: true });
}

// Copy UI dist to extension dist
const uiDistPath = join(__dirname, '../../ui/dist');
const targetUiPath = join(__dirname, 'dist/ui');

function copyUiDist() {
  if (existsSync(uiDistPath)) {
    if (!existsSync(targetUiPath)) {
      mkdirSync(targetUiPath, { recursive: true });
    }
    cpSync(uiDistPath, targetUiPath, { recursive: true });
    console.log('Copied UI dist to extension');
  } else {
    console.warn('UI dist not found, skipping copy. Run `pnpm build` in packages/ui first.');
  }
}

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode', '@vscode/sqlite3', 'pg'],
  format: 'esm',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: !isWatch,
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');

  // Initial copy
  copyUiDist();
} else {
  await esbuild.build(buildOptions);
  copyUiDist();
  console.log('Build complete');
}
