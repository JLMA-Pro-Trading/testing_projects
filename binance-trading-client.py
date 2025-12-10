#!/usr/bin/env python3
"""
Binance Futures Testnet Trading Client

A complete implementation for trading on Binance Futures Testnet using the REST API.
Handles authentication, signature generation, and provides methods for all trading operations.
"""

import os
import time
import hmac
import hashlib
import requests
from urllib.parse import urlencode
from typing import Optional, Dict, Any
from decimal import Decimal


class BinanceFuturesClient:
    """Client for Binance Futures Testnet API"""

    def __init__(self, api_key: str = None, secret_key: str = None):
        """
        Initialize the client with API credentials.

        Args:
            api_key: Binance API key (defaults to $BINANCE_DEMO_API_KEY)
            secret_key: Binance secret key (defaults to $BINANCE_DEMO_SECRET)
        """
        self.base_url = "https://testnet.binancefuture.com"
        self.api_key = api_key or os.getenv('BINANCE_DEMO_API_KEY')
        self.secret_key = secret_key or os.getenv('BINANCE_DEMO_SECRET')

        if not self.api_key or not self.secret_key:
            raise ValueError(
                "API credentials not found. Set BINANCE_DEMO_API_KEY and "
                "BINANCE_DEMO_SECRET environment variables or pass them to constructor."
            )

        self.session = requests.Session()
        self.session.headers.update({
            'X-MBX-APIKEY': self.api_key,
            'Content-Type': 'application/x-www-form-urlencoded'
        })

    def _generate_signature(self, query_string: str) -> str:
        """
        Generate HMAC SHA256 signature for the query string.

        Args:
            query_string: URL-encoded query parameters

        Returns:
            Hex-encoded signature
        """
        return hmac.new(
            self.secret_key.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    def _request(
        self,
        method: str,
        endpoint: str,
        signed: bool = False,
        **kwargs
    ) -> Dict[Any, Any]:
        """
        Make a request to the Binance API.

        Args:
            method: HTTP method (GET, POST, DELETE, etc.)
            endpoint: API endpoint path
            signed: Whether the request requires signature
            **kwargs: Additional parameters

        Returns:
            JSON response as dictionary

        Raises:
            requests.exceptions.RequestException: On API errors
        """
        url = f"{self.base_url}{endpoint}"

        if signed:
            kwargs['timestamp'] = int(time.time() * 1000)
            query_string = urlencode(kwargs)
            signature = self._generate_signature(query_string)
            url = f"{url}?{query_string}&signature={signature}"
        elif kwargs:
            url = f"{url}?{urlencode(kwargs)}"

        response = self.session.request(method, url)

        try:
            data = response.json()
        except ValueError:
            response.raise_for_status()
            raise

        if response.status_code != 200:
            error_msg = f"API Error {data.get('code', 'unknown')}: {data.get('msg', 'No message')}"
            raise Exception(error_msg)

        return data

    # ========================================================================
    # PUBLIC ENDPOINTS (No authentication required)
    # ========================================================================

    def ping(self) -> Dict:
        """Test connectivity to the API."""
        return self._request('GET', '/fapi/v1/ping')

    def get_server_time(self) -> int:
        """
        Get server time.

        Returns:
            Server timestamp in milliseconds
        """
        return self._request('GET', '/fapi/v1/time')['serverTime']

    def get_exchange_info(self, symbol: Optional[str] = None) -> Dict:
        """
        Get exchange trading rules and symbol information.

        Args:
            symbol: Optional symbol to filter by

        Returns:
            Exchange information
        """
        params = {'symbol': symbol} if symbol else {}
        return self._request('GET', '/fapi/v1/exchangeInfo', **params)

    def get_ticker_price(self, symbol: Optional[str] = None) -> Dict:
        """
        Get latest price for a symbol or all symbols.

        Args:
            symbol: Optional symbol to filter by

        Returns:
            Ticker price information
        """
        params = {'symbol': symbol} if symbol else {}
        return self._request('GET', '/fapi/v1/ticker/price', **params)

    def get_klines(
        self,
        symbol: str,
        interval: str,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 500
    ) -> list:
        """
        Get kline/candlestick data.

        Args:
            symbol: Trading pair (e.g., BTCUSDT)
            interval: Kline interval (1m, 5m, 1h, 1d, etc.)
            start_time: Start time in milliseconds
            end_time: End time in milliseconds
            limit: Number of candles (default 500, max 1500)

        Returns:
            List of kline data
        """
        params = {
            'symbol': symbol,
            'interval': interval,
            'limit': limit
        }
        if start_time:
            params['startTime'] = start_time
        if end_time:
            params['endTime'] = end_time

        return self._request('GET', '/fapi/v1/klines', **params)

    # ========================================================================
    # ACCOUNT ENDPOINTS (Authentication required)
    # ========================================================================

    def get_balance(self) -> list:
        """
        Get current account asset balance.

        Returns:
            List of asset balances
        """
        return self._request('GET', '/fapi/v2/balance', signed=True)

    def get_account(self) -> Dict:
        """
        Get current account information including positions and balances.

        Returns:
            Account information
        """
        return self._request('GET', '/fapi/v2/account', signed=True)

    def get_position_risk(self, symbol: Optional[str] = None) -> list:
        """
        Get current position information.

        Args:
            symbol: Optional symbol to filter by

        Returns:
            List of positions
        """
        params = {'symbol': symbol} if symbol else {}
        return self._request('GET', '/fapi/v2/positionRisk', signed=True, **params)

    # ========================================================================
    # TRADING ENDPOINTS
    # ========================================================================

    def place_order(
        self,
        symbol: str,
        side: str,
        order_type: str,
        quantity: Optional[float] = None,
        price: Optional[float] = None,
        time_in_force: Optional[str] = None,
        reduce_only: bool = False,
        close_position: bool = False,
        stop_price: Optional[float] = None,
        **kwargs
    ) -> Dict:
        """
        Place a new order.

        Args:
            symbol: Trading pair (e.g., BTCUSDT)
            side: BUY or SELL
            order_type: MARKET, LIMIT, STOP, TAKE_PROFIT, etc.
            quantity: Order quantity
            price: Order price (required for LIMIT orders)
            time_in_force: GTC, IOC, FOK (required for LIMIT orders)
            reduce_only: Reduce-only flag
            close_position: Close position flag
            stop_price: Stop price (for stop orders)
            **kwargs: Additional parameters

        Returns:
            Order response
        """
        params = {
            'symbol': symbol,
            'side': side.upper(),
            'type': order_type.upper()
        }

        if quantity is not None:
            params['quantity'] = str(quantity)
        if price is not None:
            params['price'] = str(price)
        if time_in_force:
            params['timeInForce'] = time_in_force.upper()
        if reduce_only:
            params['reduceOnly'] = 'true'
        if close_position:
            params['closePosition'] = 'true'
        if stop_price is not None:
            params['stopPrice'] = str(stop_price)

        params.update(kwargs)

        return self._request('POST', '/fapi/v1/order', signed=True, **params)

    def place_market_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        reduce_only: bool = False
    ) -> Dict:
        """
        Place a market order (convenience method).

        Args:
            symbol: Trading pair (e.g., BTCUSDT)
            side: BUY or SELL
            quantity: Order quantity
            reduce_only: Whether to reduce position only

        Returns:
            Order response
        """
        return self.place_order(
            symbol=symbol,
            side=side,
            order_type='MARKET',
            quantity=quantity,
            reduce_only=reduce_only
        )

    def place_limit_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        price: float,
        time_in_force: str = 'GTC',
        reduce_only: bool = False
    ) -> Dict:
        """
        Place a limit order (convenience method).

        Args:
            symbol: Trading pair (e.g., BTCUSDT)
            side: BUY or SELL
            quantity: Order quantity
            price: Limit price
            time_in_force: GTC (default), IOC, or FOK
            reduce_only: Whether to reduce position only

        Returns:
            Order response
        """
        return self.place_order(
            symbol=symbol,
            side=side,
            order_type='LIMIT',
            quantity=quantity,
            price=price,
            time_in_force=time_in_force,
            reduce_only=reduce_only
        )

    def cancel_order(
        self,
        symbol: str,
        order_id: Optional[int] = None,
        orig_client_order_id: Optional[str] = None
    ) -> Dict:
        """
        Cancel an active order.

        Args:
            symbol: Trading pair
            order_id: System order ID (use this or orig_client_order_id)
            orig_client_order_id: Client order ID

        Returns:
            Cancellation response
        """
        params = {'symbol': symbol}

        if order_id:
            params['orderId'] = order_id
        elif orig_client_order_id:
            params['origClientOrderId'] = orig_client_order_id
        else:
            raise ValueError("Must specify either order_id or orig_client_order_id")

        return self._request('DELETE', '/fapi/v1/order', signed=True, **params)

    def cancel_all_orders(self, symbol: str) -> Dict:
        """
        Cancel all open orders for a symbol.

        Args:
            symbol: Trading pair

        Returns:
            Cancellation response
        """
        return self._request(
            'DELETE',
            '/fapi/v1/allOpenOrders',
            signed=True,
            symbol=symbol
        )

    def get_open_orders(self, symbol: Optional[str] = None) -> list:
        """
        Get all open orders.

        Args:
            symbol: Optional symbol to filter by

        Returns:
            List of open orders
        """
        params = {'symbol': symbol} if symbol else {}
        return self._request('GET', '/fapi/v1/openOrders', signed=True, **params)

    def get_order(
        self,
        symbol: str,
        order_id: Optional[int] = None,
        orig_client_order_id: Optional[str] = None
    ) -> Dict:
        """
        Check an order's status.

        Args:
            symbol: Trading pair
            order_id: System order ID
            orig_client_order_id: Client order ID

        Returns:
            Order information
        """
        params = {'symbol': symbol}

        if order_id:
            params['orderId'] = order_id
        elif orig_client_order_id:
            params['origClientOrderId'] = orig_client_order_id
        else:
            raise ValueError("Must specify either order_id or orig_client_order_id")

        return self._request('GET', '/fapi/v1/order', signed=True, **params)

    # ========================================================================
    # UTILITY METHODS
    # ========================================================================

    def get_symbol_info(self, symbol: str) -> Optional[Dict]:
        """
        Get detailed information for a specific symbol.

        Args:
            symbol: Trading pair

        Returns:
            Symbol information or None if not found
        """
        info = self.get_exchange_info(symbol)
        for s in info.get('symbols', []):
            if s['symbol'] == symbol:
                return s
        return None

    def get_position(self, symbol: str) -> Optional[Dict]:
        """
        Get position for a specific symbol.

        Args:
            symbol: Trading pair

        Returns:
            Position information or None if no position
        """
        positions = self.get_position_risk(symbol)
        if positions:
            pos = positions[0]
            # Only return if there's an actual position
            if float(pos.get('positionAmt', 0)) != 0:
                return pos
        return None

    def close_position(self, symbol: str) -> Optional[Dict]:
        """
        Close an open position using closePosition flag.

        Args:
            symbol: Trading pair

        Returns:
            Order response or None if no position to close
        """
        position = self.get_position(symbol)
        if not position:
            return None

        position_amt = float(position['positionAmt'])
        if position_amt == 0:
            return None

        # Determine side (opposite of current position)
        side = 'SELL' if position_amt > 0 else 'BUY'

        return self.place_order(
            symbol=symbol,
            side=side,
            order_type='MARKET',
            close_position=True
        )


def main():
    """Example usage of the Binance Futures client."""
    import json

    print("=" * 60)
    print("Binance Futures Testnet Trading Client - Demo")
    print("=" * 60)
    print()

    try:
        # Initialize client
        client = BinanceFuturesClient()
        print("✓ Client initialized")
        print()

        # Test 1: Ping
        print("[TEST 1] Testing API connectivity...")
        client.ping()
        print("✓ API is reachable")
        print()

        # Test 2: Server time
        print("[TEST 2] Getting server time...")
        server_time = client.get_server_time()
        local_time = int(time.time() * 1000)
        diff = abs(server_time - local_time)
        print(f"✓ Server time: {server_time}")
        print(f"  Local time: {local_time}")
        print(f"  Difference: {diff}ms")
        if diff > 5000:
            print("  WARNING: Time difference > 5000ms")
        print()

        # Test 3: Get current BTC price
        print("[TEST 3] Getting BTCUSDT price...")
        ticker = client.get_ticker_price('BTCUSDT')
        btc_price = float(ticker['price'])
        print(f"✓ BTCUSDT: ${btc_price:,.2f}")
        print()

        # Test 4: Get balance
        print("[TEST 4] Getting account balance...")
        try:
            balances = client.get_balance()
            print("✓ Balance retrieved:")
            for balance in balances:
                if float(balance['balance']) > 0:
                    print(f"  {balance['asset']}: {balance['balance']}")
        except Exception as e:
            print(f"✗ Error: {e}")
            print("  NOTE: If you see -2015 error, you need to:")
            print("  1. Go to https://testnet.binancefuture.com/")
            print("  2. Log in with GitHub/Google")
            print("  3. Generate API keys in the API Key section")
            print("  4. Update your environment variables")
        print()

        # Test 5: Get positions
        print("[TEST 5] Getting positions...")
        try:
            positions = client.get_position_risk('BTCUSDT')
            print("✓ Position info:")
            for pos in positions:
                print(f"  Symbol: {pos['symbol']}")
                print(f"  Position: {pos['positionAmt']}")
                print(f"  Entry Price: {pos['entryPrice']}")
                print(f"  Leverage: {pos['leverage']}")
        except Exception as e:
            print(f"✗ Error: {e}")
        print()

        # Test 6: Get symbol info
        print("[TEST 6] Getting BTCUSDT symbol info...")
        symbol_info = client.get_symbol_info('BTCUSDT')
        if symbol_info:
            print("✓ Symbol info:")
            print(f"  Status: {symbol_info.get('status')}")
            print(f"  Contract Type: {symbol_info.get('contractType')}")
            for f in symbol_info.get('filters', []):
                if f['filterType'] == 'LOT_SIZE':
                    print(f"  Min Qty: {f['minQty']}")
                    print(f"  Max Qty: {f['maxQty']}")
                    print(f"  Step Size: {f['stepSize']}")
        print()

        print("=" * 60)
        print("Demo complete!")
        print("=" * 60)
        print()
        print("To place actual orders, use:")
        print("  client.place_market_order('BTCUSDT', 'BUY', 0.001)")
        print()

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
