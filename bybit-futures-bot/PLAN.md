# Bybit Futures Bot — Implementation Plan

Created: 2026-11-13
Status: Initial implementation delivered; offline/public-data verification complete. Authenticated Testnet acceptance remains pending.

## Implementation outcome (2026-11-13)

Source, configuration, SQLite persistence, strategy/risk/pricing, native Testnet order path, recovery, simulation, historical reports, CLI operations, Dockerfile, and Windows/Linux documentation are implemented. The project defaults to dry run and authenticated writes require an explicit opt-in. Existing workspace apps were not changed.

Verification: 49 automated tests pass, dependency consistency passes, a public Testnet dry-run cycle succeeds, and a synthetic backtest exports all reports. No authenticated orders or Telegram messages were sent. See `docs/API_VERIFICATION.md` for evidence and `README.md` for commands.

Deliberate implementation boundaries: account margin/leverage settings are verified rather than automatically changed; unknown positions require manual reconciliation; historical MarkPrice triggers require an explicitly labelled LastPrice approximation; funding history is supplied by CSV; dry-run tick simulation does not accrue actual funding. The saved checklists below retain any item requiring stronger integration evidence as pending rather than claiming full acceptance.

## Objective and scope

Build a modular Python 3.11+ BTCUSDT USDT perpetual research and execution bot using Bybit V5 and pybit. Support dry run, historical backtest, and actual Testnet execution. No live trading capability. Keep all work inside this folder and leave existing workspace apps unchanged.

Deliver working source, validated configuration, automated tests, SQLite persistence, rotating logs, a console dashboard, Docker support, and Windows/Linux instructions. Do not describe the system as production-ready or profitable without evidence. Unverified features must be documented and disabled.

This document is the saved plan requested before implementation. Check off stages only when their acceptance criteria have been met.

## Configuration decisions

- Single `mode`: `dry_run` (default), `testnet`, or `backtest`. Authenticated network execution is restricted to an explicit Testnet endpoint allowlist, including WebSocket endpoints; no environment override may enable mainnet trading.
- Preserve the requested baseline: 200 USDT reference capital, 100 USDT maximum margin, 5x leverage ceiling/configured baseline, approximately 500 USDT maximum notional, one position, estimated net TP +5 USDT and SL -5 USDT.
- Provide a separate conservative experimental profile with equity-based risk of 0.5–1% and optional ATR-based stops. Do not silently replace the requested baseline. Neither profile promises profitability.
- Baseline strategy: completed 15-minute EMA 9/21 crossover with RSI 14 strictly between 55 and 70 for longs, or 30 and 45 for shorts. Completed 1-hour EMA 50/200 determines direction. No trend equality or crossover equality ambiguity: previous fast <= slow and current fast > slow for long; inverse for short.
- Configure indicator periods, timeframes, fees/slippage assumptions, filters, cooldown, budgets, and protection/reconciliation timeouts. Validate ranges and incompatible settings before connecting.
- Credentials only from environment variables; environment overrides YAML, which overrides documented defaults. Never log secrets. Withdrawal permission is unnecessary.
- Use a dedicated Testnet account, one-way position mode, isolated margin, and no automatic margin addition. Detect account type and verify settings rather than assuming old API behavior.

## Safety and accounting contract

1. Decimal arithmetic for order prices, quantities, cash, and budget comparisons; floats are acceptable for analytical indicators.
2. Fetch instrument metadata and fee information where available. Round quantity down; apply direction-aware price rounding and recalculate estimated PnL afterward. Reject invalid/minimum-size trades, insufficient collateral, excessive estimated costs, or inadequate liquidation distance.
3. Maximum three entries per UTC day. Count an entry once any quantity fills; partial fills are one trade. Reserve risk and an entry slot for unresolved orders.
4. Daily realized net loss limit 10 USDT; weekly limit 15 USDT. Also track cumulative losses without profit replenishment as a stricter optional control, enabled in the conservative profile. Include reserved entry risk in preflight budget checks.
5. Daily reset at 00:00 UTC; week starts Monday 00:00 UTC. Two consecutive completed losing trades halt entries until the next UTC day and the configured losing-trade cooldown expires. Weekly lockout requires both a new UTC week and explicit operator acknowledgement by default. Critical error halts require reconciliation and explicit acknowledgement.
6. Persist counters, reservations, cooldowns, lockouts, signal identifiers, and execution state. Restart must not clear restrictions. Allocate account cash events to their UTC occurrence windows; distinguish trade-level PnL from period cash accounting.
7. Stress-estimated loss includes entry/exit fees and adverse slippage; it is not a guaranteed worst-case bound. Fixed net +5/-5 targets cannot be guaranteed because of slippage, fees, funding, gaps, and execution conditions.
8. Actual accounting uses deduplicated executions and funding/transaction records. Do not deduct fees twice from exchange-reported net values. Track estimated PnL, realized trading PnL, funding, fees, and reconciled net PnL separately.
9. Halts block entries, never protection or risk-reducing exits. Emergency commands distinguish `pause` (preserve protection) from `flatten` (cancel entry remainder and request reduce-only closure). Neither claims success until verified.
10. One process owns the account workflow using an OS-backed process lock. An unexpected position/order, manual interference, corrupt state, stale data, or unresolved exchange discrepancy blocks new entries.

## Planned structure

```text
bybit-futures-bot/
  PLAN.md
  README.md
  main.py
  config.yaml
  .env.example
  .gitignore
  requirements.txt
  pyproject.toml
  Dockerfile
  bot/
    __init__.py
    config.py
    models.py
    exchange.py
    data_feed.py
    indicators.py
    strategy.py
    risk_manager.py
    order_manager.py
    position_manager.py
    accounting.py
    database.py
    runtime.py
    dashboard.py
    notifications.py
    logger.py
  backtest/
    __init__.py
    engine.py
    reports.py
  tests/
    conftest.py
    test_config.py
    test_strategy.py
    test_risk_manager.py
    test_position_sizing.py
    test_protection.py
    test_order_manager.py
    test_reconciliation.py
    test_accounting.py
    test_backtest.py
  docs/
    API_VERIFICATION.md
    OPERATIONS.md
  data/
  logs/
  reports/
```

Generated databases, credentials, logs, downloaded market data, and reports are excluded from Git. Empty runtime folders may use `.gitkeep`. Package versions will be selected and pinned after compatibility verification.

## Stage 1 — Foundation and API verification

- [x] Create project/package skeleton and validated settings loader.
- [ ] Verify current official pybit methods and Bybit V5 parameters for server time, candles, instrument info, tickers, account/margin mode, position mode, leverage, wallet balances, fee rates, orders, executions, positions, trading stops, and transaction logs.
- [x] Record endpoint, pybit method, account prerequisites, important return codes, retry policy, and documentation link in `docs/API_VERIFICATION.md`.
- [x] Implement Testnet-only HTTP/WebSocket adapters, clock offset handling, redacted errors, bounded exponential backoff with jitter for safe reads, and rate-limit handling.
- [x] Implement schema version validation, SQLite transactions and uniqueness constraints, rotating event logging, and process lock. Future schema migrations remain explicit work.

Acceptance: invalid/unsafe configuration fails before order submission; no secret appears in logs; database reopen preserves state; safe reads retry appropriately and ambiguous writes never retry blindly.

## Stage 2 — Strategy, pricing, and risk core

- [x] Implement deterministic EMA, Wilder RSI, and ATR with documented warm-up/initialization and edge cases.
- [x] Normalize UTC candle timestamps, validate gaps/duplicates, exclude unfinished candles, and align hourly trend by close time.
- [x] Implement a pure shared signal function and persistent signal deduplication.
- [x] Implement sizing, fee/slippage-aware long/short TP/SL prices, available-margin reserves, instrument constraints, spread/ATR filters, and liquidation-distance checks.
- [x] Implement UTC risk windows, reservations, loss streaks, cooldowns, persistent lockouts, and explicit acknowledgement rules.

Acceptance: deterministic tests cover both directions, exact threshold boundaries, flat/insufficient data, rounding, fees, minimum order rejection, insufficient budgets, UTC day/week transitions, restart persistence, and signal reuse prevention.

## Stage 3 — Simulation and historical research

- [x] Share strategy/risk/accounting code between modes; separate execution adapters.
- [x] Implement dry-run entry/exit simulation and persistent simulated trade history without authenticated order calls.
- [x] Implement historical CSV loading and documented read-only data download with pagination, integrity checks, and saved CSV caching.
- [ ] Backtests use next-available-price execution after signal close, costs, spread, slippage, funding inputs, quantity constraints, and conservative same-bar TP/SL handling. No same-candle favorable execution assumption.
- [x] Use sufficient pre-period indicator warm-up, chronological training/validation/final out-of-sample splits, separate period reports, and documented boundary treatment for open positions.
- [x] Mark-trigger backtests require an explicitly labelled LastPrice approximation; accurate historical mark triggering remains unsupported. Missing funding data is reported.
- [x] Export trade ledger, equity curve, total trades, win rate, net PnL, profit factor, average win/loss, maximum drawdown, losing streak, fees, expectancy, and regime breakdown. Define regimes causally using only information available at the time.
- [x] Add fixed-parameter walk-forward and execution-cost sensitivity runs; record configuration and data fingerprints for reproducibility.

Acceptance: synthetic fixtures expose look-ahead errors and intra-bar ambiguity; accounting reconciles with the ledger; zero-trade/no-loss cases report correctly. No profitability conclusion is inferred from synthetic tests.

## Stage 4 — Testnet execution and recovery

- [ ] Persist state transitions: FLAT -> ENTRY_PENDING -> PROTECTION_PENDING -> OPEN -> EXIT_PENDING -> RECONCILING -> FLAT, with a persistent halt overlay.
- [x] Persist unique client order ID and entry intent before submission; enforce database uniqueness on strategy/symbol/candle identity.
- [ ] Submit entry with provisional protection when verified as supported, confirm actual fills, handle partial fills/cancel remainder, then calculate final protection from actual average entry and quantity.
- [ ] Set full-position native TP/SL, configure/document trigger price type, and verify exchange protection and liquidation buffer.
- [ ] On protection failure, block new entries, cancel remaining entry exposure, attempt reduce-only closure, and reconcile until verified. Failed closure remains a critical visible incident.
- [ ] Use private execution/order/position streams with REST reconciliation and reconnect backfill. Deduplicate repeated/out-of-order events.
- [x] Resolve ambiguous writes through client ID, order history, executions, and positions. An empty realtime order result is not proof of rejection; unresolved intents remain blocked.
- [ ] Startup performs reconciliation before strategy evaluation; shutdown cancels pending entry remainder and verifies protection for existing positions. Flattening is an explicit separate action.

Acceptance: automated fault tests cover accepted-but-timeout submissions, delayed visibility, partial fills, duplicate events, rejected protection, restart at each state, filled-during-cancel races, stale streams, metadata changes, and unexpected positions. Testnet execution contains actual verified API calls, never simulated fills.

## Stage 5 — Operations and delivery

- [x] Console dashboard: status, price, indicator values, signal, position, unrealized PnL, daily reconciled net PnL, remaining trades, reservations, and halt reasons.
- [ ] Log transitions, orders, fills, protection, costs, risk events, API failures, reconnects, startup, and shutdown.
- [x] Implement optional Telegram notification transport disabled by default; notification failure cannot stop protection. No messages sent during development.
- [x] Add CLI commands for run, backtest, status, pause, flatten, and acknowledge-halt with documented safeguards.
- [x] Write complete PowerShell and Linux setup/run commands, Testnet key instructions, least-privilege guidance, Docker volume persistence, database recovery, and incident procedures.
- [x] Run the offline test suite, CLI smoke checks, and public Testnet data checks where accessible.
- [ ] Run authenticated Testnet integration only with user-provided credentials and an explicitly requested execution session. Record any unavailable credential-dependent verification as unverified, not passed.

Acceptance: a clean install can run tests and dry run without credentials; restart preserves state; dashboard/logs explain every halt; documentation distinguishes verified behavior from limitations. Existing workspace projects remain untouched.

## Evidence and release gates

1. Offline tests and deterministic simulations pass before authenticated execution is enabled.
2. Public API contract checks pass; checked methods and dependency versions are recorded.
3. Credential-dependent account setup/protection/recovery checks are completed on Testnet before describing execution as forward-tested.
4. Fault recovery and repeated Testnet sessions show no duplicate entries or unexplained reconciliation drift. Record observed evidence, not a guarantee.
5. Economic evaluation requires representative historical data and untouched out-of-sample results. Testnet execution validates mechanics; it does not establish real-market profitability.

## Official references to recheck during implementation

- API introduction/endpoints: https://bybit-exchange.github.io/docs/v5/intro
- Order creation: https://bybit-exchange.github.io/docs/v5/order/create-order
- Order lookup: https://bybit-exchange.github.io/docs/v5/order/open-order
- Position protection: https://bybit-exchange.github.io/docs/v5/position/trading-stop
- Position information: https://bybit-exchange.github.io/docs/v5/position
- Account margin mode: https://bybit-exchange.github.io/docs/v5/account/set-margin-mode
- Instrument constraints: https://bybit-exchange.github.io/docs/v5/market/instrument
- Transaction accounting: https://bybit-exchange.github.io/docs/v5/account/transaction-log
- Official Python SDK: https://github.com/bybit-exchange/pybit

## Deferred scope

Live trading, multiple symbols/accounts, hedge mode, averaging down, Martingale, automatic leverage increases, parameter optimization services, and a web dashboard are excluded. Optional filters and alternate exit models must be evaluated separately rather than added as presumed improvements.
