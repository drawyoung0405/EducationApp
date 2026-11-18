# Bybit Futures Research Bot

Python 3.11+ research bot for BTCUSDT USDT perpetuals: EMA/RSI signals, risk controls, SQLite state, dry-run simulation, chronological backtests, and real Bybit V5 **Testnet-only** order execution. Default mode is dry run. No live execution endpoint or live mode is provided.

This is an experimental implementation, not a profitability claim or a guarantee of safe execution. Native stops can slip or fail to execute at their trigger price. Exact +5/-5 USDT net results cannot be guaranteed. The implementation has offline tests and public Testnet smoke checks; authenticated execution must be forward-tested using your Testnet account. See [verification evidence](docs/API_VERIFICATION.md), [operations](docs/OPERATIONS.md), and [implementation plan](PLAN.md).

## Install on Windows

Install Python 3.11 or newer from https://www.python.org/downloads/ and select the PATH option. Open PowerShell:

```powershell
cd D:\Project\bybit-futures-bot
py -3 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python -m pytest -q
.\.venv\Scripts\python main.py run --once
.\.venv\Scripts\python main.py run
```

Activation is optional: the explicit interpreter paths avoid PowerShell execution-policy changes. Stop with Ctrl+C.

## Install on Linux

Install Python 3.11+ and its venv package using your distribution package manager, then:

```bash
cd bybit-futures-bot
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
.venv/bin/python -m pytest -q
.venv/bin/python main.py run --once
.venv/bin/python main.py run
```

The commands below use `python`; substitute the venv interpreter above or activate the venv (`.venv\Scripts\Activate.ps1` on Windows; `source .venv/bin/activate` on Linux).

## Strategy and settings

`config.yaml` contains the baseline requested settings: 200 USDT reference equity, up to 100 USDT initial margin, 5x leverage, up to 500 USDT notional, and estimated net +5/-5 targets. Reference capital initializes simulation; actual Testnet equity and available USDT collateral come from the exchange. Size may be smaller due to rounding or collateral constraints.

Completed hourly EMA 50 > EMA 200 allows longs; reverse allows shorts. A completed 15-minute EMA 9/21 crossover enters only with RSI 14 strictly inside (55,70) for long or (30,45) for short. Hourly values are joined by their close timestamp. EMA uses first-price initialization; RSI/ATR use Wilder smoothing seeded by an initial mean. Live feeds fetch 1000 candles per timeframe; backtests exclude at least three slow-trend periods from scoring. Default entry freshness is 60 seconds after candle close, so starting mid-candle does not chase an old signal.

All configuration fields accept `BOT_<UPPERCASE_FIELD>` environment overrides. Precedence: CLI mode, environment, YAML, defaults. Unknown fields fail validation. Only keys/secrets go in `.env`; never in YAML or source control. Example:

```text
BOT_MODE=dry_run
BOT_MAX_MARGIN=50
BOT_LEVERAGE=3
BOT_STOP_LOSS=2
```

An alternative profile uses 0.5% equity risk, ATR sizing, and no profit replenishment:

```bash
python main.py --config config.conservative.yaml run
```

ATR sizes quantity using stop-distance and costs, then solves the rounded net-budget stop; quantity rounding can make the final stop wider than the raw ATR distance. Both profiles remain experimental. Higher leverage never increases automatically. Maximum simultaneous position is hard-limited to one. There is no averaging, Martingale, or reversal while exposed.

TP/SL pricing solves linear USDT PnL after actual/estimated entry fee, estimated exit fee, slippage, and a funding reserve. Stops are rounded toward lower modeled loss; targets toward the required modeled profit. Quantity rounds down. Entry costs, collateral, exchange minimums, and liquidation distance can cause a signal to be skipped. Account fee rates are fetched for Testnet; the greater of configured and returned taker rates is used. A funding reserve is a modeling allowance, not an actual debit.

## Dry run

```bash
python main.py --mode dry_run run
python main.py --mode dry_run status
```

No authenticated orders are sent. The bot uses public Testnet candles and quotes, simulates adverse entry/exit slippage and fees, and persists trades to `data/dry_run.sqlite`. The dashboard prints prices, indicators, signal, position, daily PnL, streak, and remaining entries. Dry-run exit checks sample quotes at the polling interval; they can miss intrapoll touches. Dry run does not accrue actual funding and is not a substitute for the historical engine or exchange execution tests.

## Backtest

CSV schema (timestamp is candle **opening time**, UTC epoch milliseconds):

```csv
timestamp,open,high,low,close,volume
1735689600000,94000,94100,93900,94050,12.3
```

Supply continuous 15-minute data with at least 2500 rows for the default warm-up; use substantially longer representative histories for meaningful research. Hourly candles are aggregated only from complete groups. Duplicates, gaps, nonfinite prices, and invalid OHLC fail validation. Historical instrument constraints are caller inputs: defaults are illustrative, not a claim about historical exchange rules.

```bash
python scripts/generate_fixture.py
python main.py backtest --csv data/synthetic.csv --allow-mark-approximation
python main.py backtest --csv data/btcusdt.csv --funding-csv data/funding.csv --allow-mark-approximation --output reports/research
```

The generated fixture is synthetic and only verifies software operation. `--allow-mark-approximation` explicitly permits Last Price candles to approximate Mark Price triggers. Without it, MarkPrice configurations are rejected by the backtester. For LastPrice research set `BOT_TRIGGER_BY=LastPrice` or a separate YAML; this does not make MarkPrice results equivalent.

Optional funding CSV: `timestamp,rate,mark_price`, one row for each actual funding settlement, sorted by UTC timestamp. Positive rate charges longs and credits shorts. Missing funding is clearly flagged; completeness is the researcher's responsibility. Funding within an ambiguous OHLC bar is charged before processing its exit, a conservative timing approximation for paying positions, not precise intrabar reconstruction.

Public Testnet history downloader (these dates are examples):

```bash
python main.py download --start 1735689600000 --end 1740787200000 --output data/testnet-btcusdt.csv
```

All built-in downloads use Testnet. Import representative real-market CSV data from a separately verified read-only source for economic research; there is no authenticated mainnet adapter.

Reports: `summary.json`, `trades.csv`, `equity.csv`. Training/validation/out-of-sample split is chronological 60/20/20 after warm-up, each starts at reference equity and closes residual exposure at its boundary. Signals enter at the next candle's open with spread/slippage; stop wins when both exits touch, gaps incur adverse opening fills. Each segment includes mark-to-market drawdown, trade counts, net PnL, win rate, profit factor (null if no losses), average outcomes, expectancy, fees, funding, losing streak, and causal up/down trend regimes. Separate fixed-parameter walk-forward folds and double-cost out-of-sample stress results are also exported. Folds reset their simulated account; they are independent evaluations, not one continuous account curve.

No tuning is performed automatically. Repeatedly selecting parameters using the final test period contaminates it. Keep a new untouched period for subsequent revisions. These OHLC approximations cannot establish execution quality or a guaranteed edge.

## Create and configure a Testnet account

1. Visit https://testnet.bybit.com/ and create a dedicated Testnet account; obtain test assets through its faucet interface.
2. Enable a Unified Trading Account 2.0 supported by this bot. Configure **isolated margin**, BTCUSDT **one-way** mode, the YAML leverage (default 5x), and **automatic margin addition off** in the Testnet UI.
3. Remove unrelated open orders and positions. Do not trade manually in this dedicated account while the bot is running.
4. Generate a **Testnet** API key with read access for balances/orders/executions and permission to trade contracts. Do not grant withdrawal permissions. Restrict IPs if practical.
5. Put the Testnet key and secret in `.env`. Do not use production or demo-trading keys. Never paste credentials into logs or chat.
6. Run all tests and inspect the configuration before enabling the following opt-in.

```text
BYBIT_API_KEY=your_testnet_key
BYBIT_API_SECRET=your_testnet_secret
BOT_ENABLE_TESTNET_ORDERS=true
```

```bash
python main.py --mode testnet reconcile
python main.py --mode testnet run
```

The adapter verifies account settings and refuses unsupported accounts. Account-wide margin settings are not changed automatically because they affect the whole account. Changing leverage in YAML requires matching the Testnet UI setting; the bot will not silently increase it.

Testnet entries are actual market orders with provisional full-position native TP/SL. Partial fills trigger cancellation of entry remainder and protection recalculation. The bot verifies final stops using position responses, checks liquidation distance, and sends reduce-only emergency exits on protection failure. MarkPrice is the default trigger; fills occur against the order book, so trigger and execution prices differ.

The SDK's automatic write retries are disabled. Ambiguous entry/exit outcomes retain their journal and block new entries. Order/position/execution WebSocket messages wake reconciliation; REST history and transaction logs are authoritative and backfilled after restarts. If the stream is unavailable, polling continues. API errors latch entry halts while recovery and position management continue.

## Monitoring, pause, shutdown, and recovery

```bash
python main.py --mode testnet status
python main.py --mode testnet pause
python main.py --mode testnet flatten
```

`pause` persists an entry halt. `flatten` queues a request for the matching running process; it is **not** a synchronous promise that exposure is closed. Keep the process running and verify position size reaches zero. If no process is running, start it with the same mode/config/data directory to service the queued command, or use the exchange UI in an emergency and reconcile afterward.

Ctrl+C/SIGTERM stops the loop, cancels unresolved entry remainder, attempts reconciliation, and leaves existing exchange-side protection in place. It does not close positions by default. If connectivity is lost, inspect the Testnet UI; the application cannot guarantee protection or closure it cannot verify.

After an unexpected restart, use the same database. The bot reconciles before evaluating signals. Do not delete SQLite state to remove lockouts. After resolving an incident, stop the running process and run:

```bash
python main.py --mode testnet reconcile
python main.py --mode testnet acknowledge-halt
python main.py --mode testnet run
```

Acknowledgement requires no unresolved intents and, on Testnet, a flat exchange with no open orders. A missing order after timeout does not release its reservation; inspect order history and follow [operations](docs/OPERATIONS.md). Never edit the journal casually.

UTC risk rules: day starts 00:00, week starts Monday 00:00. Up to 3 filled entries/day; pending entries reserve a slot and stress-loss budget. Two consecutive completed losses halt the rest of that day; a 60-minute losing-trade cooldown also applies. Daily net loss cap is 10 USDT, weekly 15 USDT. A weekly lock requires the next week plus explicit acknowledgement by default; `weekly_reset: calendar` permits calendar reset. Entry fees and funding affect their actual cash-event dates. Existing open exposure stays managed during all halts. Stress budgets are estimates and can be exceeded by gaps or exchange failure.

Logs rotate in `logs/<mode>.log`; journal, cash events, execution IDs, and completed trades are in `data/<mode>.sqlite`. `status` includes a persisted dashboard snapshot, which may be stale when no process is running. Use the exchange UI for independent confirmation. Optional Telegram notifications require `telegram_enabled: true`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID`; delivery failure never disables protection.

## Docker

```bash
docker build -t bybit-research .
docker run --rm --init --env-file .env -v bybit-data:/app/data -v bybit-logs:/app/logs bybit-research run
```

Default remains dry run. Use `--mode testnet run` as container arguments only after Testnet setup. Persist volumes and run only one container per account. The local process lock does not coordinate multiple machines/containers. Docker execution has not been verified in this workspace.

## Implementation boundaries

- Only BTCUSDT linear perpetual, UTA 2.0, one-way isolated margin; unsupported account types fail closed.
- No automatic adoption of unknown positions. Unexpected exposure halts entries and requires operator inspection; the bot does not assume it owns manual trades.
- No guarantee of a zero-duration protection gap, exact stop loss, or successful closure during exchange/network outages.
- REST transaction records can lag. Filled positions may remain in RECONCILING until cash records cover executions; this intentionally blocks further entries.
- No historical mark-price engine, full order-book replay, funding downloader, parameter optimizer, multi-account coordination, or live trading.
- SQLite v1 schema is checked; future migrations must be explicit. Back up state with SQLite's backup API or while the process is stopped.
- Tests mock failure scenarios; authenticated Testnet validation and long-running fault recovery remain prerequisites for trusting execution behavior.
