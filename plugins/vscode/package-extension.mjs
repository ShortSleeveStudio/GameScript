#!/usr/bin/env node
/**
 * Package the VS Code extension using pnpm deploy to handle native modules.
 *
 * This script:
 * 1. Runs the standard build (esbuild + UI copy)
 * 2. Uses `pnpm deploy --prod` to create a staging folder with dependencies
 * 3. Selectively copies only the native modules we need from .pnpm
 * 4. Copies the built dist/ into the deploy folder
 * 5. Runs vsce package with --no-dependencies (node_modules whitelisted)
 * 6. Moves the .vsix back to the plugin directory
 *
 * Key insight: pnpm v10+ creates complex symlink structures in .pnpm that can't
 * be fully flattened with cp -rL (cycles, broken links). Instead, we selectively
 * copy only the native modules that must be bundled at runtime.
 */
import { execSync } from 'child_process';
import {
  existsSync,
  cpSync,
  rmSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Deploy to /tmp to avoid symlink cycles (pnpm can create symlinks pointing back into the repo)
const deployDir = '/tmp/vscode-gamescript-package';

// Native modules that must be included at runtime (not bundled by esbuild)
const nativeModules = ['@vscode/sqlite3', 'pg'];

// Packages bundled by esbuild (removed from deps, don't need in node_modules)
const bundledByEsbuild = ['@gamescript/shared'];

function run(cmd, cwd = __dirname) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function cleanup() {
  if (existsSync(deployDir)) {
    rmSync(deployDir, { recursive: true });
  }
}

/**
 * Find a package in pnpm's .pnpm directory structure.
 * pnpm stores packages as: .pnpm/<package-name>@<version>/node_modules/<package-name>
 */
function findPackageInPnpm(pnpmDir, packageName) {
  if (!existsSync(pnpmDir)) return null;

  const entries = readdirSync(pnpmDir);
  // Convert @scope/name to @scope+name for pnpm directory naming
  const pnpmName = packageName.replace('/', '+');

  for (const entry of entries) {
    if (entry.startsWith(pnpmName + '@')) {
      const packagePath = join(pnpmDir, entry, 'node_modules', packageName);
      if (existsSync(packagePath)) {
        return packagePath;
      }
    }
  }
  return null;
}

try {
  // Clean up any previous staging directory
  cleanup();

  // Step 1: Run the standard build
  console.log('\n=== Step 1: Building extension ===');
  run('node build.mjs');

  // Step 2: Use pnpm deploy with --prod to keep the VSIX small
  console.log('\n=== Step 2: Creating deployment with pnpm deploy ===');
  run(`pnpm deploy --filter=./plugins/vscode --prod --legacy "${deployDir}"`, join(__dirname, '../..'));

  // Step 2b: Selectively copy native modules from .pnpm to top-level node_modules
  console.log('\n=== Step 2b: Extracting native modules from pnpm store ===');
  const nodeModulesDir = join(deployDir, 'node_modules');
  const pnpmDir = join(nodeModulesDir, '.pnpm');

  // Create fresh node_modules with only the packages we need
  const tempNodeModules = join(deployDir, 'node_modules_clean');
  mkdirSync(tempNodeModules, { recursive: true });

  for (const moduleName of nativeModules) {
    const sourcePath = findPackageInPnpm(pnpmDir, moduleName);
    if (!sourcePath) {
      throw new Error(`Could not find ${moduleName} in pnpm store at ${pnpmDir}`);
    }

    // Determine target path (handle scoped packages)
    let targetPath;
    if (moduleName.startsWith('@')) {
      const [scope, name] = moduleName.split('/');
      mkdirSync(join(tempNodeModules, scope), { recursive: true });
      targetPath = join(tempNodeModules, scope, name);
    } else {
      targetPath = join(tempNodeModules, moduleName);
    }

    // Copy with symlink dereferencing
    console.log(`  Copying ${moduleName}...`);
    execSync(`cp -rL "${sourcePath}" "${targetPath}"`);
  }

  // Replace original node_modules with our clean version
  rmSync(nodeModulesDir, { recursive: true });
  execSync(`mv "${tempNodeModules}" "${nodeModulesDir}"`);

  console.log('  Native modules extracted successfully');

  // Remove pnpm-lock.yaml from staging (vsce doesn't need it)
  const pnpmLock = join(deployDir, 'pnpm-lock.yaml');
  if (existsSync(pnpmLock)) {
    rmSync(pnpmLock);
  }

  // Step 3: Sync built artifacts
  console.log('\n=== Step 3: Updating staging with built artifacts ===');
  const distSource = join(__dirname, 'dist');
  const distTarget = join(deployDir, 'dist');

  // Remove the source dist from deploy (it has unbuilt .ts files)
  rmSync(distTarget, { recursive: true, force: true });

  // Copy our built dist
  cpSync(distSource, distTarget, { recursive: true });

  // Step 3b: Update staged package.json
  console.log('\n=== Step 3b: Updating package.json ===');
  const stagedPackageJsonPath = join(deployDir, 'package.json');
  const packageJson = JSON.parse(readFileSync(stagedPackageJsonPath, 'utf8'));

  // Remove vscode:prepublish to prevent re-running build
  delete packageJson.scripts['vscode:prepublish'];

  // Remove bundled-by-esbuild packages from dependencies
  for (const pkg of bundledByEsbuild) {
    if (packageJson.dependencies?.[pkg]) {
      delete packageJson.dependencies[pkg];
      console.log(`  Removed ${pkg} from dependencies (bundled by esbuild)`);
    }
  }

  writeFileSync(stagedPackageJsonPath, JSON.stringify(packageJson, null, 2));

  // Step 3c: Create .vscodeignore that whitelists node_modules
  // With --no-dependencies, vsce ignores node_modules by default.
  // We need to explicitly include it via .vscodeignore whitelist.
  console.log('\n=== Step 3c: Creating .vscodeignore whitelist ===');
  const vscodeignoreContent = `
# Source files (bundled in dist/)
src/**
*.ts
tsconfig.json

# Build tools
build.mjs
package-extension.mjs

# Dev files
.gitignore
.eslintrc*
.vscode/**
test/**
test_workspace/**

# Package manager
pnpm-lock.yaml

# Trim node_modules bloat
node_modules/**/*.md
node_modules/**/*.ts
node_modules/**/test/**
node_modules/**/tests/**
node_modules/**/.github/**
node_modules/**/docs/**
node_modules/**/src/**
`;
  writeFileSync(join(deployDir, '.vscodeignore'), vscodeignoreContent.trim());

  // Step 4: Run vsce package with --no-dependencies
  // We use --no-dependencies because npm list will fail on our selective node_modules
  console.log('\n=== Step 4: Packaging with vsce ===');
  run('npx @vscode/vsce package --no-dependencies', deployDir);

  // Step 4b: Manually inject node_modules into the VSIX
  // vsce --no-dependencies completely ignores node_modules, so we must add it manually
  console.log('\n=== Step 4b: Injecting node_modules into VSIX ===');
  const vsixFile = readdirSync(deployDir).find((f) => f.endsWith('.vsix'));
  if (!vsixFile) {
    throw new Error('No .vsix file found after vsce package');
  }
  const vsixPath = join(deployDir, vsixFile);

  // VSIX is a zip file. We need to add node_modules under extension/
  // Use zip command to add node_modules to the existing vsix
  execSync(`cd "${deployDir}" && zip -r "${vsixPath}" node_modules -x "*.md" -x "*.ts" -x "*/test/*" -x "*/tests/*" -x "*/.github/*" -x "*/docs/*" -x "*/src/*"`, {
    cwd: deployDir,
  });

  // The files need to be under extension/ in the vsix, not at root
  // Let's fix this by extracting, moving, and re-zipping
  const extractDir = join(deployDir, 'vsix_extracted');
  if (existsSync(extractDir)) {
    rmSync(extractDir, { recursive: true });
  }
  mkdirSync(extractDir, { recursive: true });
  execSync(`unzip -q "${vsixPath}" -d "${extractDir}"`);

  // Move node_modules into extension/
  const extensionDir = join(extractDir, 'extension');
  // Remove any existing node_modules in extension/ first
  const targetNodeModules = join(extensionDir, 'node_modules');
  if (existsSync(targetNodeModules)) {
    rmSync(targetNodeModules, { recursive: true });
  }
  if (existsSync(join(extractDir, 'node_modules'))) {
    execSync(`mv "${join(extractDir, 'node_modules')}" "${extensionDir}/"`);
  }
  // Also copy from deployDir if not already there
  if (!existsSync(join(extensionDir, 'node_modules'))) {
    execSync(`cp -r "${nodeModulesDir}" "${extensionDir}/"`);
  }

  // Re-create the vsix
  rmSync(vsixPath);
  execSync(`cd "${extractDir}" && zip -r "${vsixPath}" .`);
  rmSync(extractDir, { recursive: true });

  console.log('  node_modules injected successfully');

  // Step 5: Move .vsix back to the plugin directory
  console.log('\n=== Step 5: Moving .vsix to plugin directory ===');
  const vsixFiles = readdirSync(deployDir).filter((f) => f.endsWith('.vsix'));
  if (vsixFiles.length === 0) {
    throw new Error('No .vsix file found after packaging');
  }

  const vsixSource = join(deployDir, vsixFiles[0]);
  const vsixTarget = join(__dirname, vsixFiles[0]);

  // Remove old vsix if exists
  if (existsSync(vsixTarget)) {
    rmSync(vsixTarget);
  }

  cpSync(vsixSource, vsixTarget);
  console.log(`\nPackaged: ${vsixFiles[0]}`);

  // Cleanup staging directory
  cleanup();

  console.log('\n=== Done! ===');
} catch (error) {
  console.error('\nPackaging failed:', error.message);
  cleanup();
  process.exit(1);
}
