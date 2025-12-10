// @neural-trader/features - Technical indicators package
// Re-exports indicator functionality from the main NAPI bindings

const { loadNativeBinary } = require('./load-binary');
const nativeBindings = loadNativeBinary();

const {
  calculateSma,
  calculateRsi,
  calculateIndicator
} = nativeBindings;

module.exports = {
  calculateSma,
  calculateRsi,
  calculateIndicator
};
