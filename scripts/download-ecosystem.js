#!/usr/bin/env node
/**
 * Download and install neural-trader ecosystem packages
 * These separate packages may contain the actual ML functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'https://raw.githubusercontent.com/JLMA-Pro-Trading/ruv_downloads/main/npmjs/00_tgz';

// Key packages that may contain ML functionality
const PACKAGES = [
  'neural-trader-neural-2.6.0.tgz',
  'neural-trader-predictor-0.1.0.tgz',
  'neural-trader-features-2.1.2.tgz',
  'neural-trader-core-2.0.0.tgz',
  'neural-trader-backtesting-2.6.0.tgz',
  'neural-trader-strategies-2.6.0.tgz'
];

const DOWNLOAD_DIR = path.join(__dirname, '..', 'packages');
const NODE_MODULES = path.join(__dirname, '..', 'node_modules');

async function downloadAndExtract(packageName) {
  const url = `${BASE_URL}/${packageName}`;
  const tgzPath = path.join(DOWNLOAD_DIR, packageName);
  const extractDir = path.join(DOWNLOAD_DIR, packageName.replace('.tgz', ''));

  // Download
  console.log(`   📥 Downloading ${packageName}...`);
  try {
    execSync(`curl -sL -o "${tgzPath}" "${url}"`, { stdio: 'pipe' });
  } catch (e) {
    console.log(`      ❌ Download failed`);
    return false;
  }

  // Check file size
  const stats = fs.statSync(tgzPath);
  if (stats.size < 1000) {
    console.log(`      ❌ File too small (${stats.size} bytes)`);
    return false;
  }

  // Extract
  console.log(`      📦 Extracting...`);
  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir, { recursive: true });
  }

  try {
    execSync(`tar -xzf "${tgzPath}" -C "${extractDir}" --strip-components=1`, { stdio: 'pipe' });
    console.log(`      ✅ Done (${(stats.size / 1024).toFixed(1)} KB)`);
    return true;
  } catch (e) {
    console.log(`      ❌ Extract failed: ${e.message}`);
    return false;
  }
}

async function analyzePackage(packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  const indexPath = path.join(packageDir, 'index.js');
  const srcDir = path.join(packageDir, 'src');
  const distDir = path.join(packageDir, 'dist');

  const info = { name: path.basename(packageDir) };

  // Read package.json
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    info.version = pkg.version;
    info.main = pkg.main;
    info.dependencies = Object.keys(pkg.dependencies || {});
  }

  // Check for source files
  info.hasIndex = fs.existsSync(indexPath);
  info.hasSrc = fs.existsSync(srcDir);
  info.hasDist = fs.existsSync(distDir);

  // List exports if index.js exists
  if (info.hasIndex) {
    const content = fs.readFileSync(indexPath, 'utf8');
    const exports = content.match(/exports\.(\w+)/g) || [];
    info.exports = [...new Set(exports.map(e => e.replace('exports.', '')))];
  }

  return info;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🔧 Downloading Neural Trader Ecosystem Packages');
  console.log('═'.repeat(60));

  // Create download directory
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  // Download and extract each package
  console.log('\n📦 Downloading packages:\n');
  const results = [];
  for (const pkg of PACKAGES) {
    const success = await downloadAndExtract(pkg);
    results.push({ name: pkg, success });
  }

  // Analyze extracted packages
  console.log('\n\n📊 Package Analysis:\n');
  for (const result of results) {
    if (!result.success) continue;

    const extractDir = path.join(DOWNLOAD_DIR, result.name.replace('.tgz', ''));
    if (fs.existsSync(extractDir)) {
      const info = await analyzePackage(extractDir);
      console.log(`\n   📁 ${info.name}`);
      console.log(`      Version: ${info.version || 'unknown'}`);
      console.log(`      Main: ${info.main || 'index.js'}`);
      console.log(`      Has src/: ${info.hasSrc}`);
      console.log(`      Has dist/: ${info.hasDist}`);
      if (info.exports?.length > 0) {
        console.log(`      Exports: ${info.exports.slice(0, 10).join(', ')}${info.exports.length > 10 ? '...' : ''}`);
      }
      if (info.dependencies?.length > 0) {
        console.log(`      Dependencies: ${info.dependencies.join(', ')}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Download complete!');
  console.log('   Packages extracted to: ' + DOWNLOAD_DIR);
  console.log('═'.repeat(60));
}

main().catch(console.error);
