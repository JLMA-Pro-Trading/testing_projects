const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

/**
 * Binance Futures Testnet Exchange Connector
 * Uses curl via child_process to avoid DNS issues with Node.js fetch
 */
class BinanceExchange {
  constructor() {
    this.apiKey = process.env.BINANCE_DEMO_API_KEY;
    this.apiSecret = process.env.BINANCE_DEMO_SECRET;
    this.baseUrl = 'https://testnet.binancefuture.com';

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API credentials not found in environment variables');
    }
  }

  /**
   * Generate HMAC SHA256 signature for Binance API
   * @param {string} queryString - The query string to sign
   * @returns {string} The signature
   */
  generateSignature(queryString) {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Execute curl command and parse JSON response
   * @param {string} curlCommand - The curl command to execute
   * @returns {Promise<Object>} Parsed JSON response
   */
  async executeCurl(curlCommand) {
    try {
      const { stdout, stderr } = await execPromise(curlCommand);

      if (stderr && !stderr.includes('% Total') && !stderr.includes('Dload')) {
        console.error('Curl stderr:', stderr);
      }

      if (!stdout || stdout.trim() === '') {
        throw new Error('Empty response from API');
      }

      const response = JSON.parse(stdout);

      // Check for Binance API errors
      if (response.code && response.code !== 200) {
        throw new Error(`Binance API Error: ${response.msg || response.message || 'Unknown error'} (Code: ${response.code})`);
      }

      return response;
    } catch (error) {
      if (error.message.includes('Unexpected token')) {
        throw new Error(`Failed to parse API response: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Make authenticated GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   */
  async authenticatedGet(endpoint, params = {}) {
    const timestamp = Date.now();
    const queryString = new URLSearchParams({
      ...params,
      timestamp
    }).toString();

    const signature = this.generateSignature(queryString);
    const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    const curlCommand = `curl -s -X GET "${url}" -H "X-MBX-APIKEY: ${this.apiKey}"`;
    return this.executeCurl(curlCommand);
  }

  /**
   * Make authenticated POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} API response
   */
  async authenticatedPost(endpoint, params = {}) {
    const timestamp = Date.now();
    const queryString = new URLSearchParams({
      ...params,
      timestamp
    }).toString();

    const signature = this.generateSignature(queryString);
    const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    const curlCommand = `curl -s -X POST "${url}" -H "X-MBX-APIKEY: ${this.apiKey}"`;
    return this.executeCurl(curlCommand);
  }

  /**
   * Make authenticated DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} API response
   */
  async authenticatedDelete(endpoint, params = {}) {
    const timestamp = Date.now();
    const queryString = new URLSearchParams({
      ...params,
      timestamp
    }).toString();

    const signature = this.generateSignature(queryString);
    const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    const curlCommand = `curl -s -X DELETE "${url}" -H "X-MBX-APIKEY: ${this.apiKey}"`;
    return this.executeCurl(curlCommand);
  }

  /**
   * Make public GET request (no authentication)
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} API response
   */
  async publicGet(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `${this.baseUrl}${endpoint}?${queryString}`
      : `${this.baseUrl}${endpoint}`;

    const curlCommand = `curl -s -X GET "${url}"`;
    return this.executeCurl(curlCommand);
  }

  /**
   * Get account balance
   * @returns {Promise<Array>} Array of balance objects
   */
  async getAccountBalance() {
    try {
      const response = await this.authenticatedGet('/fapi/v2/balance');
      return response;
    } catch (error) {
      throw new Error(`Failed to get account balance: ${error.message}`);
    }
  }

  /**
   * Get position information for a symbol
   * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
   * @returns {Promise<Array>} Array of position objects
   */
  async getPosition(symbol) {
    try {
      const params = symbol ? { symbol } : {};
      const response = await this.authenticatedGet('/fapi/v2/positionRisk', params);
      return response;
    } catch (error) {
      throw new Error(`Failed to get position: ${error.message}`);
    }
  }

  /**
   * Place a market order
   * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
   * @param {string} side - Order side ('BUY' or 'SELL')
   * @param {number} quantity - Order quantity
   * @returns {Promise<Object>} Order response
   */
  async placeMarketOrder(symbol, side, quantity) {
    try {
      const params = {
        symbol: symbol.toUpperCase(),
        side: side.toUpperCase(),
        type: 'MARKET',
        quantity: quantity.toString()
      };

      const response = await this.authenticatedPost('/fapi/v1/order', params);
      return response;
    } catch (error) {
      throw new Error(`Failed to place market order: ${error.message}`);
    }
  }

  /**
   * Place a limit order
   * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
   * @param {string} side - Order side ('BUY' or 'SELL')
   * @param {number} price - Limit price
   * @param {number} quantity - Order quantity
   * @returns {Promise<Object>} Order response
   */
  async placeLimitOrder(symbol, side, price, quantity) {
    try {
      const params = {
        symbol: symbol.toUpperCase(),
        side: side.toUpperCase(),
        type: 'LIMIT',
        timeInForce: 'GTC',  // Good Till Cancel
        price: price.toString(),
        quantity: quantity.toString()
      };

      const response = await this.authenticatedPost('/fapi/v1/order', params);
      return response;
    } catch (error) {
      throw new Error(`Failed to place limit order: ${error.message}`);
    }
  }

  /**
   * Cancel an order
   * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
   * @param {number} orderId - Order ID to cancel
   * @returns {Promise<Object>} Cancellation response
   */
  async cancelOrder(symbol, orderId) {
    try {
      const params = {
        symbol: symbol.toUpperCase(),
        orderId: orderId.toString()
      };

      const response = await this.authenticatedDelete('/fapi/v1/order', params);
      return response;
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  /**
   * Get open orders for a symbol
   * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT'). If omitted, returns all open orders.
   * @returns {Promise<Array>} Array of open order objects
   */
  async getOpenOrders(symbol) {
    try {
      const params = symbol ? { symbol: symbol.toUpperCase() } : {};
      const response = await this.authenticatedGet('/fapi/v1/openOrders', params);
      return response;
    } catch (error) {
      throw new Error(`Failed to get open orders: ${error.message}`);
    }
  }

  /**
   * Get current price for a symbol
   * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
   * @returns {Promise<Object>} Price object with symbol and price
   */
  async getCurrentPrice(symbol) {
    try {
      const params = { symbol: symbol.toUpperCase() };
      const response = await this.publicGet('/fapi/v1/ticker/price', params);
      return response;
    } catch (error) {
      throw new Error(`Failed to get current price: ${error.message}`);
    }
  }
}

module.exports = BinanceExchange;
