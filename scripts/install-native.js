#!/usr/bin/env node
/**
 * Install neural-trader-core package with NeuralModel class
 * This is the package that has REAL ML functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'https://raw.githubusercontent.com/JLMA-Pro-Trading/ruv_downloads/main/npmjs/00_tgz';
const NODE_MODULES = path.join(__dirname, '..', 'node_modules');

// neural-trader-core is the package with real NeuralModel
const PACKAGE_NAME = 'neural-trader-core-2.0.0';
const PACKAGE_TGZ = `${PACKAGE_NAME}.tgz`;
const INSTALL_DIR = path.join(NODE_MODULES, '@neural-trader', 'core');

async function downloadFile(url, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  try {
    execSync(`curl -sL -o "${dest}" "${url}"`, { stdio: 'pipe' });
    return fs.existsSync(dest) && fs.statSync(dest).size > 1000;
  } catch (error) {
    return false;
  }
}

async function installNeuralTraderCore() {
  console.log('═'.repeat(60));
  console.log('🔧 Installing neural-trader-core with NeuralModel');
  console.log('═'.repeat(60));

  // Check if already installed
  const binaryPath = path.join(INSTALL_DIR, 'neural-trader.linux-x64-gnu.node');
  if (fs.existsSync(binaryPath)) {
    const stats = fs.statSync(binaryPath);
    if (stats.size > 1000000) {  // Should be ~1.8 MB
      console.log('\n✅ neural-trader-core already installed');
      console.log(`   Binary size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      return true;
    }
  }

  // Download tgz
  const tgzPath = path.join(__dirname, PACKAGE_TGZ);
  console.log(`\n📥 Downloading ${PACKAGE_TGZ}...`);

  if (!await downloadFile(`${BASE_URL}/${PACKAGE_TGZ}`, tgzPath)) {
    console.error('❌ Download failed');
    return false;
  }

  const tgzStats = fs.statSync(tgzPath);
  console.log(`   Downloaded: ${(tgzStats.size / 1024).toFixed(1)} KB`);

  // Extract to @neural-trader/core
  console.log(`\n📦 Installing to ${INSTALL_DIR}...`);

  if (!fs.existsSync(INSTALL_DIR)) {
    fs.mkdirSync(INSTALL_DIR, { recursive: true });
  }

  try {
    execSync(`tar -xzf "${tgzPath}" -C "${INSTALL_DIR}" --strip-components=1`, { stdio: 'pipe' });
  } catch (e) {
    console.error('❌ Extract failed:', e.message);
    return false;
  }

  // Verify installation
  if (fs.existsSync(binaryPath)) {
    const stats = fs.statSync(binaryPath);
    console.log(`   ✅ Binary installed: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.error('❌ Binary not found after extraction');
    return false;
  }

  // Also install to node_modules/neural-trader-core for direct require
  const directPath = path.join(NODE_MODULES, 'neural-trader-core');
  if (!fs.existsSync(directPath)) {
    fs.mkdirSync(directPath, { recursive: true });
  }
  execSync(`tar -xzf "${tgzPath}" -C "${directPath}" --strip-components=1`, { stdio: 'pipe' });
  console.log('   ✅ Also installed as neural-trader-core');

  // Cleanup
  fs.unlinkSync(tgzPath);

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Installation complete!');
  console.log('');
  console.log('   Usage:');
  console.log("     const { NeuralModel } = require('@neural-trader/core');");
  console.log('     const model = new NeuralModel({ modelType: "lstm_attention", ... });');
  console.log('═'.repeat(60));

  return true;
}

// Check platform
if (process.platform !== 'linux' || process.arch !== 'x64') {
  console.log(`⚠️  Warning: Binary is for linux-x64, your platform: ${process.platform}-${process.arch}`);
}

installNeuralTraderCore().catch(console.error);
