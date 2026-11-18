"""Bybit V5 adapter. Writes have exactly one SDK attempt."""
import logging
import os
import random
import time
from pybit.unified_trading import HTTP, WebSocket
from bot.models import D, Instrument

LOG = logging.getLogger(__name__)


class ExchangeError(RuntimeError):
    def __init__(self, method, code=None):
        self.code = code
        super().__init__(f'{method} failed (code={code}); reconcile before retrying writes')


class ClockHTTP(HTTP):
    offset_ms = 0

    def _prepare_headers(self, payload, recv_window, content_type='application/json'):
        timestamp = int(time.time() * 1000 + self.offset_ms)
        return {'Content-Type': content_type, 'X-BAPI-API-KEY': self.api_key,
                'X-BAPI-SIGN': self._auth(payload, recv_window, timestamp),
                'X-BAPI-SIGN-TYPE': '2', 'X-BAPI-TIMESTAMP': str(timestamp),
                'X-BAPI-RECV-WINDOW': str(recv_window)}


class Exchange:
    def __init__(self, config):
        self.c = config
        self.private = config.mode == 'testnet'
        key, secret = os.getenv('BYBIT_API_KEY'), os.getenv('BYBIT_API_SECRET')
        if self.private and (not key or not secret):
            raise ValueError('Testnet mode requires BYBIT_API_KEY and BYBIT_API_SECRET')
        self.http = ClockHTTP(testnet=True, demo=False, api_key=key if self.private else None,
                              api_secret=secret if self.private else None, max_retries=1,
                              retry_codes={-999999}, force_retry=False, timeout=10, log_requests=False)
        if self.http.endpoint != 'https://api-testnet.bybit.com':
            raise RuntimeError('Non-Testnet endpoint rejected')
        self.ws = None
        self.last_sync = 0

    def call(self, method, write=False, **params):
        if self.http.endpoint != 'https://api-testnet.bybit.com':
            raise RuntimeError('Non-Testnet endpoint rejected')
        if write and (not self.private or not self.c.enable_testnet_orders):
            raise PermissionError('Testnet order/configuration writes are disabled')
        for attempt in range(1 if write else 4):
            try:
                reply = getattr(self.http, method)(**params)
                if reply.get('retCode', 0) != 0:
                    raise ExchangeError(method, reply['retCode'])
                if attempt:
                    LOG.info('API recovered: %s', method)
                return reply
            except Exception as exc:
                code = getattr(exc, 'status_code', getattr(exc, 'code', None))
                LOG.warning('API failure method=%s code=%s type=%s', method, code, type(exc).__name__)
                transient = code in {None, 429, 500, 502, 503, 504, 10000, 10006, 10016}
                if write or not transient or attempt == 3:
                    raise ExchangeError(method, code) from None
                time.sleep(min(2 ** attempt + random.random(), 8))

    def sync_clock(self):
        start = time.time() * 1000
        result = self.call('get_server_time')
        end = time.time() * 1000
        server = int(result['result']['timeNano']) // 1_000_000
        offset = server - (start + end) / 2
        if end - start > self.c.max_clock_skew_ms * 2:
            raise RuntimeError('Clock synchronization uncertainty too high')
        self.http.offset_ms = offset
        self.last_sync = end
        return self.now()

    def now(self):
        return int(time.time() * 1000 + self.http.offset_ms)

    def rows(self, method, **params):
        result, cursor, seen = [], None, set()
        while True:
            response = self.call(method, **params, **({'cursor': cursor} if cursor else {}))['result']
            result.extend(response.get('list', []))
            cursor = response.get('nextPageCursor')
            if not cursor:
                return result
            if cursor in seen:
                raise RuntimeError('Repeated pagination cursor')
            seen.add(cursor)

    def instrument(self):
        r = self.call('get_instruments_info', category='linear', symbol=self.c.symbol)['result']['list'][0]
        if r['status'] != 'Trading' or r['contractType'] != 'LinearPerpetual' or r['settleCoin'] != 'USDT':
            raise RuntimeError('Unsupported contract')
        q = r['lotSizeFilter']
        return Instrument(D(r['priceFilter']['tickSize']), D(q['qtyStep']), D(q['minOrderQty']),
                          D(q['minNotionalValue']), D(q['maxMktOrderQty']))

    def ticker(self):
        return self.call('get_tickers', category='linear', symbol=self.c.symbol)['result']['list'][0]

    def positions(self):
        return self.rows('get_positions', category='linear', settleCoin='USDT', limit=200)

    def orders(self):
        return self.rows('get_open_orders', category='linear', settleCoin='USDT', openOnly=0, limit=50)

    def find_order(self, link):
        params = dict(category='linear', symbol=self.c.symbol, orderLinkId=link)
        rows = self.rows('get_open_orders', **params)
        if not rows:
            rows = self.rows('get_order_history', **params)
        return rows[0] if rows else None

    def verify_account(self):
        info = self.call('get_account_info')['result']
        if info['unifiedMarginStatus'] not in {5, 6} or info['marginMode'] != 'ISOLATED_MARGIN':
            raise RuntimeError('Requires UTA 2.0 and ISOLATED_MARGIN; configure account before running')
        for p in self.positions():
            if D(p['size']) and p['symbol'] != self.c.symbol:
                raise RuntimeError('Foreign position on dedicated account')
            if p['symbol'] == self.c.symbol:
                if int(p['positionIdx']) != 0 or D(p['leverage']) != self.c.leverage or int(p.get('autoAddMargin', 0)):
                    raise RuntimeError('Verify one-way mode, configured leverage, and auto-add-margin off')
        rates = self.call('get_fee_rates', category='linear', symbol=self.c.symbol)['result']['list']
        self.c.fee_rate = max(self.c.fee_rate, D(rates[0]['takerFeeRate']))

    def balance(self):
        account = self.call('get_wallet_balance', accountType='UNIFIED', coin='USDT')['result']['list'][0]
        coin = next(x for x in account['coin'] if x['coin'] == 'USDT')
        # Account-wide availableBalance is not applicable to UTA isolated margin.
        if D(coin.get('borrowAmount') or 0) or D(coin.get('spotBorrow') or 0):
            raise RuntimeError('Borrowed collateral is unsupported')
        available = D(coin['walletBalance']) - D(coin.get('totalPositionIM') or 0) - D(coin.get('totalOrderIM') or 0) - D(coin.get('locked') or 0)
        return D(coin['equity']), max(D(0), available)

    def start_stream(self, callback):
        if self.private:
            self.ws = WebSocket(testnet=True, channel_type='private', api_key=os.getenv('BYBIT_API_KEY'),
                                api_secret=os.getenv('BYBIT_API_SECRET'), retries=3, restart_on_error=True)
            self.ws.order_stream(callback)
            self.ws.execution_stream(callback)
            self.ws.position_stream(callback)

    def close(self):
        if self.ws:
            self.ws.exit()
        self.http.client.close()
