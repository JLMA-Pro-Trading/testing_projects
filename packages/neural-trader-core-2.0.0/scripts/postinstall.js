#!/usr/bin/env node
/**
 * Post-install script for @neural-trader/core
 *
 * Verifies that the correct native addon is available for the current platform.
 * Provides helpful error messages if the addon is missing.
 */

const { platform, arch } = require('os');
const { existsSync } = require('fs');
const { join } = require('path');

const PLATFORM_MAP = {
  'linux-x64': 'linux-x64-gnu',
  'darwin-x64': 'darwin-x64',
  'darwin-arm64': 'darwin-arm64',
  'win32-x64': 'win32-x64-msvc',
};

const platformKey = `${platform()}-${arch()}`;
const triple = PLATFORM_MAP[platformKey];

console.log(`\n🔧 Neural Trader Post-Install Check`);
console.log(`   Platform: ${platformKey}`);

if (!triple) {
  console.warn(`\n⚠️  Warning: Unsupported platform: ${platformKey}`);
  console.warn(`   Supported platforms: ${Object.keys(PLATFORM_MAP).join(', ')}`);
  console.warn(`\n   Neural Trader may not work on this platform.`);
  console.warn(`   Please check the documentation or open an issue:\n`);
  console.warn(`   https://github.com/ruvnet/neural-trader/issues\n`);
  process.exit(0); // Don't fail install, just warn
}

// Check if native addon is available
const packageName = `@neural-trader/${triple}`;
let addonFound = false;

try {
  require.resolve(packageName);
  addonFound = true;
  console.log(`   ✅ Native addon found: ${packageName}`);
} catch (err) {
  // Check local build
  const localPath = join(__dirname, '..', `neural-trader.${triple}.node`);
  if (existsSync(localPath)) {
    addonFound = true;
    console.log(`   ✅ Local native addon found`);
  }
}

if (!addonFound) {
  console.warn(`\n⚠️  Warning: Native addon not found for ${platformKey}`);
  console.warn(`   Expected package: ${packageName}`);
  console.warn(`\n   This might happen if:`);
  console.warn(`   1. The package is not published yet for this platform`);
  console.warn(`   2. Installation failed`);
  console.warn(`   3. You're using an unsupported platform`);
  console.warn(`\n   To build from source, run:`);
  console.warn(`   npm run build\n`);

  // Don't fail the install - allow users to build from source
  process.exit(0);
}

console.log(`   ✅ Installation successful!\n`);
console.log(`   Try it out: npx neural-trader --version\n`);
