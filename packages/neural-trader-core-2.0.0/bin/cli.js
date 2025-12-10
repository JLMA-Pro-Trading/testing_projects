#!/usr/bin/env node
/**
 * Neural Trader CLI
 *
 * Command-line interface for the Neural Trading platform.
 * Provides quick access to trading operations, backtesting, and strategy management.
 */

const { version } = require('../package.json');

// Parse CLI arguments
const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
Neural Trader v${version} - AI-Powered Trading Platform

USAGE:
  npx neural-trader <command> [options]

COMMANDS:
  version               Show version information
  help                  Show this help message
  list-strategies       List available trading strategies
  list-brokers          List supported brokers and data sources
  init [path]          Initialize a new trading project
  backtest <strategy>  Run backtesting on a strategy
  live                 Start live trading (paper/real)
  optimize <strategy>  Optimize strategy parameters
  analyze <symbol>     Analyze market data for symbol

OPTIONS:
  --config <file>      Use custom configuration file
  --paper              Use paper trading mode (default)
  --real               Use real trading mode (requires confirmation)
  --verbose            Enable verbose output
  --debug              Enable debug mode

EXAMPLES:
  # Initialize new project
  npx neural-trader init my-trading-bot

  # Run backtest
  npx neural-trader backtest --config strategies/momentum.json

  # Start paper trading
  npx neural-trader live --paper --config config.json

  # Optimize strategy
  npx neural-trader optimize momentum --symbol AAPL

DOCUMENTATION:
  https://github.com/ruvnet/neural-trader

For more information, visit: https://neural-trader.io
`);
}

function showVersion() {
  try {
    const { getVersionInfo } = require('..');
    const versionInfo = getVersionInfo();
    console.log(`Neural Trader v${version}`);
    console.log(`Rust Core: v${versionInfo.rustCore}`);
    console.log(`NAPI Bindings: v${versionInfo.napiBindings}`);
    console.log(`Rust Compiler: ${versionInfo.rustCompiler}`);
  } catch (err) {
    console.log(`Neural Trader v${version}`);
    console.log(`Note: Native module not available on this platform`);
    if (process.env.DEBUG) {
      console.error('Error:', err.message);
    }
  }
}

function initProject(projectPath = './neural-trader-project') {
  console.log(`Initializing Neural Trader project at: ${projectPath}`);
  console.log(`\nThis feature is coming soon!`);
  console.log(`\nFor now, please see the documentation at:`);
  console.log(`https://github.com/ruvnet/neural-trader\n`);
}

function listStrategies() {
  console.log(`\nAvailable Trading Strategies:\n`);
  console.log(`1. Momentum Strategy`);
  console.log(`   - Follows price momentum trends`);
  console.log(`   - Best for: Trending markets`);
  console.log(`   - Risk: Medium to High\n`);

  console.log(`2. Mean Reversion Strategy`);
  console.log(`   - Trades price reversals to mean`);
  console.log(`   - Best for: Range-bound markets`);
  console.log(`   - Risk: Low to Medium\n`);

  console.log(`3. Arbitrage Strategy`);
  console.log(`   - Exploits price differences`);
  console.log(`   - Best for: Multi-exchange trading`);
  console.log(`   - Risk: Low\n`);

  console.log(`4. Market Making Strategy`);
  console.log(`   - Provides liquidity for profit`);
  console.log(`   - Best for: High-volume assets`);
  console.log(`   - Risk: Medium\n`);

  console.log(`5. Pairs Trading Strategy`);
  console.log(`   - Trades correlated assets`);
  console.log(`   - Best for: Statistical arbitrage`);
  console.log(`   - Risk: Medium\n`);

  console.log(`6. Neural Network Strategy (AI)`);
  console.log(`   - Uses ML for predictions`);
  console.log(`   - Best for: Complex patterns`);
  console.log(`   - Risk: High\n`);

  console.log(`Use: npx neural-trader backtest <strategy> --symbol AAPL\n`);
}

function listBrokers() {
  console.log(`\nSupported Brokers & Data Sources:\n`);

  console.log(`1. Alpaca Markets ✅`);
  console.log(`   - Commission-free trading`);
  console.log(`   - Paper trading available`);
  console.log(`   - Real-time market data`);
  console.log(`   - Status: Fully supported\n`);

  console.log(`2. Interactive Brokers 🔄`);
  console.log(`   - Professional trading platform`);
  console.log(`   - Global market access`);
  console.log(`   - Advanced order types`);
  console.log(`   - Status: In development\n`);

  console.log(`3. Binance 🔄`);
  console.log(`   - Cryptocurrency exchange`);
  console.log(`   - High liquidity`);
  console.log(`   - Futures & spot trading`);
  console.log(`   - Status: In development\n`);

  console.log(`4. Polygon.io ✅`);
  console.log(`   - Market data provider`);
  console.log(`   - Real-time & historical data`);
  console.log(`   - Wide coverage`);
  console.log(`   - Status: Data only\n`);

  console.log(`5. Kraken 📋`);
  console.log(`   - Cryptocurrency exchange`);
  console.log(`   - Secure platform`);
  console.log(`   - Status: Planned\n`);

  console.log(`Configuration: Set credentials in config.json or environment\n`);
}

// Main CLI router
switch (command) {
  case 'version':
  case '--version':
  case '-v':
    showVersion();
    break;

  case 'help':
  case '--help':
  case '-h':
  case undefined:
    showHelp();
    break;

  case 'init':
    initProject(args[1]);
    break;

  case 'list-strategies':
    listStrategies();
    break;

  case 'list-brokers':
    listBrokers();
    break;

  case 'backtest':
  case 'live':
  case 'optimize':
  case 'analyze':
    console.log(`\n⚠️  The '${command}' command is not yet implemented.`);
    console.log(`\nNeural Trader is under active development.`);
    console.log(`Check the repository for updates: https://github.com/ruvnet/neural-trader\n`);
    break;

  default:
    console.error(`\n❌ Unknown command: ${command}\n`);
    showHelp();
    process.exit(1);
}
