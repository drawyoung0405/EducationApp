# API contract review and verification evidence

Reviewed 2026-11-13 using official Bybit V5 documentation and installed official `pybit==5.17.2` source. SDK method existence was checked locally. This is source/contract verification, not proof of authenticated account behavior.

## Methods and request contract

All HTTP execution uses `HTTP(testnet=True, demo=False)` at `https://api-testnet.bybit.com`. Private stream construction uses `WebSocket(testnet=True, channel_type='private')`. No custom execution domain or mainnet mode is accepted. Category is always `linear`; symbol is BTCUSDT; positionIdx is 0.

| Purpose | pybit method | V5 path / important parameters |
|---|---|---|
| Server time | `get_server_time` | `/v5/market/time`; `timeNano` |
| Candles | `get_kline` | `/v5/market/kline`; interval, limit, end |
| Constraints | `get_instruments_info` | `/v5/market/instruments-info`; priceFilter, lotSizeFilter |
| Quotes | `get_tickers` | `/v5/market/tickers`; bid/ask, Last Price, Mark Price |
| Account mode | `get_account_info` | `/v5/account/info`; unifiedMarginStatus, marginMode |
| Margin configuration (reviewed, not automatically invoked) | `set_margin_mode` | `/v5/account/set-margin-mode`; setMarginMode=ISOLATED_MARGIN |
| Position mode (reviewed, not automatically invoked) | `switch_position_mode` | `/v5/position/switch-mode`; mode=0 |
| Leverage (reviewed, not automatically invoked) | `set_leverage` | `/v5/position/set-leverage`; buyLeverage, sellLeverage |
| Auto margin (reviewed, not automatically invoked) | `set_auto_add_margin` | `/v5/position/set-auto-add-margin`; autoAddMargin=0 |
| Balance | `get_wallet_balance` | `/v5/account/wallet-balance`; accountType=UNIFIED, coin=USDT |
| Fees | `get_fee_rates` | `/v5/account/fee-rate`; takerFeeRate |
| Entry/exit | `place_order` | `/v5/order/create`; Market, qty, orderLinkId; reduceOnly on emergency exit |
| Cancellation | `cancel_order` | `/v5/order/cancel`; orderLinkId |
| Order lookup | `get_open_orders`, `get_order_history` | `/v5/order/realtime`, `/v5/order/history`; client ID; cursor pagination |
| Executions | `get_executions` | `/v5/execution/list`; execId, execTime, execPrice, execQty, execFee |
| Position | `get_positions` | `/v5/position/list`; settleCoin=USDT; size, avgPrice, liqPrice, TP/SL |
| Native protection | `set_trading_stop` | `/v5/position/trading-stop`; Full, Market exits, TP/SL and triggerBy |
| Cash accounting | `get_transaction_log` | `/v5/account/transaction-log`; UNIFIED, USDT, start/end <= 7 days, cursor |

## Important implementation choices

- The installed SDK defaults to retrying certain errors. This project sets `max_retries=1`, `force_retry=False`, and a nonmatching retry-code sentinel. Read calls implement bounded backoff separately. Writes get exactly one SDK attempt and retain ambiguous intents.
- Reads retry network failures, HTTP 429/5xx, and transient exchange codes 10000/10006/10016. Authentication, parameter, account-mode, and permission failures halt rather than retrying indefinitely. Exception messages are sanitized at the adapter boundary; no full signed requests are logged.
- Order creation/cancellation acknowledgements are asynchronous. Client IDs are persisted before submission. Both realtime and history queries are used because realtime recent-closed caches can be cleared on exchange restarts.
- Full-position TP/SL uses market exits. Provisional TP/SL is included on entry; final stops use actual position average price/quantity and available execution fees.
- Isolated UTA does not support account-wide available-balance fields; sizing derives conservative free USDT from coin wallet balance less position/order margin and locked funds. Borrowing is unsupported.
- Clock synchronization measures midpoint offset and request uncertainty. A small HTTP subclass signs with adjusted timestamps; this private SDK hook is covered by tests and requires review whenever pybit is upgraded. System clock/NTP is still required for the SDK's private WebSocket authentication.
- Local stream events prompt REST reconciliation; streams are not authoritative for accounting. Stream failure falls back to polling. Reconciliation reads can take longer than the poll interval during backfill.

## Official references

- [Introduction and endpoints](https://bybit-exchange.github.io/docs/v5/intro)
- [Place order](https://bybit-exchange.github.io/docs/v5/order/create-order)
- [Trading stop](https://bybit-exchange.github.io/docs/v5/position/trading-stop)
- [Position info](https://bybit-exchange.github.io/docs/v5/position)
- [Account margin mode](https://bybit-exchange.github.io/docs/v5/account/set-margin-mode)
- [Wallet balance](https://bybit-exchange.github.io/docs/v5/account/wallet-balance)
- [Instrument constraints](https://bybit-exchange.github.io/docs/v5/market/instrument)
- [Execution history](https://bybit-exchange.github.io/docs/v5/order/execution)
- [Transaction log](https://bybit-exchange.github.io/docs/v5/account/transaction-log)
- [Open/closed orders](https://bybit-exchange.github.io/docs/v5/order/open-order)
- [Errors](https://bybit-exchange.github.io/docs/v5/error)
- [Official pybit source](https://github.com/bybit-exchange/pybit)

## Observed local evidence

- Windows, Python 3.13.14; virtual environment installation completed with pinned direct dependencies.
- Offline pytest suite: **49 passed**. Covers strict configuration, both signal directions, RSI boundaries, close-time alignment and future independence, fees/rounding/minimum orders, risk windows and persistent locks, journal reopening and uniqueness, cash deduplication, partial fills, ambiguous writes, emergency exits, endpoint restrictions, adjusted signing time, and historical export smoke tests.
- Public Testnet dry-run `run --once`: passed. Fetched server time, instrument constraints, quotes, 15-minute/hourly candles; calculated indicators and printed status; no authenticated orders submitted.
- Synthetic historical backtest: passed after correcting an export field collision found by the smoke run. Exported chronological period reports, trade ledger, equity CSV, walk-forward folds, and double-cost stress results. Synthetic outcomes are not evidence of profitability.
- Actual authenticated orders, account mode checks, native TP/SL lifecycle, private WebSocket authentication, and transaction-field mapping on a real Testnet account: **not executed; require user Testnet credentials and a requested execution session**.
- Docker and Python 3.11 execution: not run in this Windows environment. Compatible dependency versions are specified, but cross-platform verification remains outstanding.
