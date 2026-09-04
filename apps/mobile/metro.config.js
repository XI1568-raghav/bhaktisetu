/**
 * Metro config for pnpm monorepo. Without this, Metro can't find
 * `@poojly/*` workspace packages — pnpm hoists them into a flat
 * `node_modules/.pnpm/` layout that Metro's default resolver doesn't
 * walk. We tell Metro: (1) watch the whole monorepo so file changes
 * trigger rebuilds, and (2) search the root node_modules in addition
 * to apps/mobile/node_modules.
 *
 * Pattern: https://docs.expo.dev/guides/monorepos/
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const fs = require('node:fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the monorepo root for file changes (catches edits in
//    packages/ui, packages/shared, packages/api-client, etc.)
config.watchFolders = [monorepoRoot];

// 2. Resolve modules from both the local + root node_modules. Required
//    because pnpm hoists deps to the root .pnpm store; the local
//    node_modules only contains symlinks.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Don't crawl into other apps/* directories — Metro otherwise tries
//    to bundle apps/web's React 19 alongside apps/mobile's React 18 and
//    spits out duplicate-module errors.
// 3b. Honour the `exports` field in package.json. Metro on SDK 52 ships with
//     this OFF, so an exports-only package resolves via `main` — and for
//     `uuid@14` (a transitive dep of expo-notifications) `main` is undefined,
//     which failed the Android bundle at 1672 modules with
//     "specifies a `main` module field that could not be resolved".
//     Expo SDK 53 turns this on by default, so this is forward-compatible.
config.resolver.unstable_enablePackageExports = true;

config.resolver.blockList = [
  /apps\/web\/.*/,
  /apps\/api\/.*/,
  /apps\/admin\/.*/,
  /apps\/medusa-store\/.*/,
];

// 4. Workspace packages (@poojly/*) use NodeNext-style ".js" import
//    specifiers on .ts source. Next/tsc resolve these; Metro doesn't.
//    Rewrite "./client.js" -> "./client.ts" (or .tsx) when the .ts
//    source actually exists on disk.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('.') &&
    (moduleName.endsWith('.js') || moduleName.endsWith('.jsx'))
  ) {
    const baseDir = path.dirname(context.originModulePath);
    for (const ext of ['.ts', '.tsx']) {
      const candidate = moduleName.replace(/\.jsx?$/, ext);
      if (fs.existsSync(path.resolve(baseDir, candidate))) {
        return context.resolveRequest(context, candidate, platform);
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
