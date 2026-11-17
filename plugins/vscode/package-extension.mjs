#!/usr/bin/env node
/**
 * Package the VS Code extension as one universal .vsix that runs SQLite on every platform listed in
 * SQLITE_TARGETS.
 *
 * @vscode/sqlite3 is a native module: its vscode-sqlite3.node only loads on the OS and CPU it was
 * built for, and can't be cross-compiled. So each platform's binary is built once on that platform
 * (see "Building a binary" below), and this script packs all of them into the extension under
 * node_modules/@vscode/sqlite3/build/<platform>-<arch>/, with a loader that picks the running one.
 * Everything else is plain JavaScript and is bundled into dist/extension.js by build.mjs (pg too).
 *
 * Usage:
 *   node package-extension.mjs --sqlite-binaries <dir> [--allow-missing]
 *
 *   <dir> holds <platform>-<arch>/vscode-sqlite3.node for each target, e.g.
 *     <dir>/darwin-arm64/vscode-sqlite3.node
 *     <dir>/win32-x64/vscode-sqlite3.node
 *   The binary built for this machine by pnpm install (node_modules/@vscode/sqlite3/build/Release)
 *   is used for this machine's target when <dir> lacks it. --allow-missing packages without the
 *   targets that have no binary; SQLite then says it isn't available there. Postgres works on all.
 *
 * Building a binary (on the platform itself; needs Node, Python and a C++ toolchain):
 *   npm install --no-save --prefix <tmp> @vscode/sqlite3@<version in pnpm-lock.yaml>
 *   -> <tmp>/node_modules/@vscode/sqlite3/build/Release/vscode-sqlite3.node
 *
 * Works the same on macOS, Linux and Windows: Node file APIs only, and vsce for the zip.
 */
import { execSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** The platforms the .vsix must run SQLite on. */
const SQLITE_TARGETS = ['darwin-arm64', 'win32-x64'];
const SQLITE = '@vscode/sqlite3';
const BINARY = 'vscode-sqlite3.node';

function parseArgs(argv) {
  const out = { binaries: null, allowMissing: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--sqlite-binaries') out.binaries = argv[++i];
    else if (argv[i] === '--allow-missing') out.allowMissing = true;
    else throw new Error(`Unexpected argument: ${argv[i]}`);
  }
  return out;
}

function run(cmd, cwd = __dirname) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

// Replaces lib/sqlite3-binding.js, which loads ../build/Release/vscode-sqlite3.node.
const BINDING_LOADER = `// Written by GameScript's package-extension.mjs: one binary per platform, picked at run time.
const path = require('path');
const target = process.platform + '-' + process.arch;
const file = path.join(__dirname, '..', 'build', target, '${BINARY}');
let binding;
try {
  binding = require(file);
} catch (error) {
  if (error && error.code === 'MODULE_NOT_FOUND') {
    throw new Error('GameScript has no SQLite support built for ' + target + '. PostgreSQL works on every platform.');
  }
  throw error;
}
module.exports = exports = binding;
`;

/** The file names in a zip (a .vsix), read from its central directory. */
function zipEntries(file) {
  const buf = readFileSync(file);
  // The end-of-central-directory record is the last 22 bytes, plus a comment of up to 64 KiB.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`${file} is not a zip`);
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  const names = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(at) !== 0x02014b50) throw new Error(`${file}: bad central directory`);
    const nameLength = buf.readUInt16LE(at + 28);
    const extraLength = buf.readUInt16LE(at + 30);
    const commentLength = buf.readUInt16LE(at + 32);
    names.push(buf.toString('utf8', at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}

const opts = parseArgs(process.argv.slice(2));
const stage = mkdtempSync(join(tmpdir(), 'gamescript-vsix-'));

try {
  // Step 1: the extension bundle (pg included) and the UI.
  console.log('\n=== Step 1: Building extension ===');
  run('node build.mjs');

  // Step 2: find a binary for every target.
  console.log('\n=== Step 2: Collecting SQLite binaries ===');
  const sqliteDir = dirname(require.resolve(`${SQLITE}/package.json`));
  const hostTarget = `${process.platform}-${process.arch}`;
  const binaries = new Map();
  for (const target of SQLITE_TARGETS) {
    const given = opts.binaries ? join(opts.binaries, target, BINARY) : null;
    const host = target === hostTarget ? join(sqliteDir, 'build', 'Release', BINARY) : null;
    const found = [given, host].find((p) => p && existsSync(p));
    if (found) {
      binaries.set(target, found);
      console.log(`  ${target}: ${found}`);
    } else if (opts.allowMissing) {
      console.log(`  ${target}: none (SQLite won't be available there)`);
    } else {
      throw new Error(`No ${BINARY} for ${target}. Build it on that platform (see this file's header), or pass --allow-missing.`);
    }
  }

  // Step 3: stage the extension. Only what ships: package.json, dist/, and @vscode/sqlite3's runtime.
  console.log('\n=== Step 3: Staging ===');
  const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
  const sqliteVersion = JSON.parse(readFileSync(join(sqliteDir, 'package.json'), 'utf8')).version;
  delete packageJson.scripts;
  delete packageJson.devDependencies;
  // Everything but the native module is in dist/extension.js. vsce's dependency mode (npm list)
  // then includes exactly node_modules/@vscode/sqlite3.
  packageJson.dependencies = { [SQLITE]: sqliteVersion };
  delete packageJson.bundledDependencies;
  writeFileSync(join(stage, 'package.json'), JSON.stringify(packageJson, null, 2));
  cpSync(join(__dirname, 'dist'), join(stage, 'dist'), { recursive: true });

  const stagedSqlite = join(stage, 'node_modules', SQLITE);
  mkdirSync(join(stagedSqlite, 'lib'), { recursive: true });
  for (const file of ['sqlite3.js', 'trace.js']) {
    cpSync(join(sqliteDir, 'lib', file), join(stagedSqlite, 'lib', file), { dereference: true });
  }
  writeFileSync(join(stagedSqlite, 'lib', 'sqlite3-binding.js'), BINDING_LOADER);
  cpSync(join(sqliteDir, 'LICENSE'), join(stagedSqlite, 'LICENSE'), { dereference: true });
  // Its build-time dependencies (node-addon-api, tar) aren't needed at run time, and npm list would
  // report them missing.
  const sqlitePackage = JSON.parse(readFileSync(join(sqliteDir, 'package.json'), 'utf8'));
  delete sqlitePackage.dependencies;
  delete sqlitePackage.devDependencies;
  delete sqlitePackage.scripts;
  writeFileSync(join(stagedSqlite, 'package.json'), JSON.stringify(sqlitePackage, null, 2));
  for (const [target, file] of binaries) {
    mkdirSync(join(stagedSqlite, 'build', target), { recursive: true });
    cpSync(file, join(stagedSqlite, 'build', target, BINARY), { dereference: true });
  }
  writeFileSync(join(stage, '.vscodeignore'), ['**/*.ts', '**/*.md', 'node_modules/**/*.d.ts'].join('\n'));

  // Step 4: package. --skip-license: the extension has never shipped a LICENSE file.
  console.log('\n=== Step 4: Packaging with vsce ===');
  const vsixName = `${packageJson.name}-${packageJson.version}.vsix`;
  run(`npx --yes @vscode/vsce@3 package --skip-license --out "${vsixName}"`, stage);

  // Step 5: check what went in, then move it next to this script.
  console.log('\n=== Step 5: Checking the package ===');
  const vsixPath = join(stage, vsixName);
  const entries = new Set(zipEntries(vsixPath));
  const expect = [
    'extension/dist/extension.js',
    `extension/node_modules/${SQLITE}/lib/sqlite3-binding.js`,
    ...[...binaries.keys()].map((t) => `extension/node_modules/${SQLITE}/build/${t}/${BINARY}`),
  ];
  const missing = expect.filter((e) => !entries.has(e));
  const strays = [...entries].filter(
    (e) => e.startsWith('extension/node_modules/') && !e.startsWith(`extension/node_modules/${SQLITE}/`)
  );
  if (missing.length) throw new Error(`The package lacks: ${missing.join(', ')}`);
  if (strays.length) throw new Error(`Unexpected modules in the package: ${strays.slice(0, 5).join(', ')}`);
  console.log(`  ${entries.size} files; extension.js, the loader and ${binaries.size} binaries present; no other modules`);

  const outPath = join(__dirname, vsixName);
  rmSync(outPath, { force: true });
  cpSync(vsixPath, outPath);
  console.log(`\nPackaged ${vsixName} with SQLite for: ${[...binaries.keys()].join(', ') || 'no platform'}`);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
