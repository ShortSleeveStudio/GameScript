import * as esbuild from 'esbuild';
import { mkdirSync, existsSync, cpSync, rmSync } from 'fs';
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
    // Clean target first to remove stale hashed files from previous builds
    if (existsSync(targetUiPath)) {
      rmSync(targetUiPath, { recursive: true });
    }
    mkdirSync(targetUiPath, { recursive: true });
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
  // pg is plain JavaScript and is bundled here: shipping it in node_modules left out its own
  // dependencies (pg-pool, pg-types, ...), so Postgres failed to load from a packaged .vsix.
  // pg-native is pg's optional native binding, never used. @vscode/sqlite3 is native and ships
  // in node_modules (package-extension.mjs).
  external: ['vscode', '@vscode/sqlite3', 'pg-native'],
  format: 'esm',
  // Bundled CommonJS (pg) calls require for Node built-ins; ESM output needs one defined.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
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
