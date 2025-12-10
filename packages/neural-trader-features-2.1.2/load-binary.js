// Platform-aware binary loader for Neural Trader NAPI bindings
// Automatically detects and loads the correct native binary for the current platform

const os = require('os');
const path = require('path');
const fs = require('fs');

/**
 * Detect libc type on Linux systems (glibc vs musl)
 * Falls back to glibc if detection fails
 */
function detectLibc() {
  try {
    // Try using detect-libc package if available
    const detectLibc = require('detect-libc');
    const family = detectLibc.familySync();
    return family === 'musl' ? 'musl' : 'gnu';
  } catch (err) {
    // Fallback: check for Alpine-specific files
    if (fs.existsSync('/etc/alpine-release')) {
      return 'musl';
    }
    // Default to glibc
    return 'gnu';
  }
}

/**
 * Get the platform-specific binary filename
 * @returns {string} Binary filename (e.g., 'neural-trader.linux-x64-gnu.node')
 */
function getPlatformBinary() {
  const platform = os.platform();
  const arch = os.arch();

  // Map platform + architecture to binary names
  let binaryName;

  if (platform === 'linux') {
    if (arch === 'x64') {
      const libc = detectLibc();
      binaryName = `neural-trader.linux-x64-${libc}.node`;
    } else if (arch === 'arm64') {
      binaryName = 'neural-trader.linux-arm64-gnu.node';
    } else {
      throw new Error(`Unsupported Linux architecture: ${arch}`);
    }
  } else if (platform === 'darwin') {
    if (arch === 'x64') {
      binaryName = 'neural-trader.darwin-x64.node';
    } else if (arch === 'arm64') {
      binaryName = 'neural-trader.darwin-arm64.node';
    } else {
      throw new Error(`Unsupported macOS architecture: ${arch}`);
    }
  } else if (platform === 'win32') {
    if (arch === 'x64') {
      binaryName = 'neural-trader.win32-x64-msvc.node';
    } else {
      throw new Error(`Unsupported Windows architecture: ${arch}`);
    }
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return binaryName;
}

/**
 * Load the platform-specific native binary
 * @returns {object} Loaded native module
 */
function loadNativeBinary() {
  const binaryName = getPlatformBinary();

  // Try loading from native/ directory first (v2.1.1+)
  const nativePath = path.join(__dirname, 'native', binaryName);
  if (fs.existsSync(nativePath)) {
    return require(nativePath);
  }

  // Fallback: try loading from package root (v2.1.0 compatibility)
  const rootPath = path.join(__dirname, binaryName);
  if (fs.existsSync(rootPath)) {
    return require(rootPath);
  }

  // Fallback: try old naming convention (v2.1.0 compatibility)
  const legacyPath = path.join(__dirname, '..', '..', 'neural-trader.linux-x64-gnu.node');
  if (fs.existsSync(legacyPath)) {
    return require(legacyPath);
  }

  // No binary found - throw helpful error
  const platform = os.platform();
  const arch = os.arch();
  throw new Error(
    `Neural Trader native binary not found for ${platform}-${arch}\n` +
    `Expected: ${binaryName}\n` +
    `Searched in:\n` +
    `  - ${nativePath}\n` +
    `  - ${rootPath}\n` +
    `  - ${legacyPath}\n\n` +
    `Platform Support:\n` +
    `  ✅ Linux x64 (glibc) - v2.1.0+\n` +
    `  ✅ Linux x64 (musl) - v2.1.1+\n` +
    `  ✅ macOS Intel - v2.2.0+\n` +
    `  ✅ macOS ARM64 - v2.2.0+\n` +
    `  ✅ Windows x64 - v2.2.0+\n` +
    `  ✅ Linux ARM64 - v2.3.0+\n\n` +
    `Please ensure you're using a compatible Neural Trader version.\n` +
    `See: https://github.com/ruvnet/neural-trader/blob/main/neural-trader-rust/docs/PLATFORM_COMPATIBILITY.md`
  );
}

module.exports = { loadNativeBinary, getPlatformBinary, detectLibc };
