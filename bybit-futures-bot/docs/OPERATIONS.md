# Operating and incident procedures

## Before an execution session

Use a dedicated Testnet UTA 2.0 account. Inspect isolated margin, one-way BTCUSDT, leverage, and auto-add-margin off. Confirm no unrelated orders/positions exist. Keep the exchange UI available for independent inspection. The bot verifies settings and does not automatically change account-wide margin mode. A first run with current-week exchange trades but no local journal is halted: restore the original state or use a fresh dedicated account rather than bypassing risk history.

Preserve the same configuration while positions exist. A changed risk model or fee setting can cause protection to be recalculated or an emergency close. Stop the bot, resolve exposure, and change settings between sessions. Run only one process/container/machine per dedicated account; the filesystem lock is local, not distributed.

## Normal start and stop

1. Run tests and a dry-run smoke check.
2. Run `python main.py --mode testnet reconcile` with Testnet writes enabled if protection repair may be needed.
3. Inspect `status`, start `run`, and inspect the first dashboard and exchange UI.
4. Use `pause` to prevent entries while leaving protection management active.
5. Ctrl+C requests safe shutdown. Native stops remain on the exchange. Read the shutdown log: a failed reconciliation is not a verified safe position.

## Emergency flatten

`python main.py --mode testnet flatten` persists a request; the running process consumes it. It cancels remaining entry quantity, reconciles the position, and submits a journaled reduce-only market exit. Exit acknowledgement is not proof of a flat account. Inspect `status` and exchange size until zero and transaction accounting completes. A zero-size position can remain RECONCILING while transaction logs catch up.

On a rejected/cancelled exit with a remaining position, a new exit ID can be generated after confirming the prior outcome. An unknown exit outcome is never resubmitted blindly. Native protection is not deliberately cancelled during recovery. A market exit may partially fill or fail in illiquid conditions.

If API connectivity is unavailable, inspect/close on the Testnet UI as needed. The application cannot verify protection or submit an emergency close without connectivity. Manual intervention is then reconciled through exchange fills, but unexpected added exposure is not adopted automatically.

## Lost acknowledgement or unknown order

- Keep the process running to reconcile by client ID, realtime/history orders, executions, and positions.
- Do not restart with a new database or clear the intent. A missing response is not a rejected order.
- Confirm the exact client order ID in exchange order history and logs.
- If Bybit history still cannot establish a terminal outcome, remain halted. Export the SQLite journal and exchange records for manual diagnosis. There is intentionally no unsafe force-clear command.
- Once history establishes rejection or a completed/closed trade, reconciliation releases exposure reservations automatically. Stop the process and use `acknowledge-halt` only after exposure is flat.

## Protection failure

Protection failure latches a halt, cancels entry remainder, and requests reduce-only closure. Verify the close externally. If the position is unknown to the journal, the bot halts and requests manual inspection rather than guessing ownership or applying potentially incorrect stops.

Startup protection is verified against position TP/SL fields. Attached-order and full-mode behavior must still be verified on the user's account during authenticated acceptance testing. No claim of a zero-millisecond unprotected window is made.

## Accounting and resets

Cash events are deduplicated by transaction ID; fills by execution ID. Cash net is `cashFlow + funding - fee`. Execution rows validate that each completed trade has corresponding cash records; fees are not subtracted again from already-net transaction changes. Entry fees and funding are allocated to their actual UTC timestamps. Completed trade net spans its own entry/exit interval.

Each reconciliation replays the current and previous UTC week plus any older unresolved position lifetime, in requests no larger than seven days. Recent completed-trade totals are revised if late records arrive. Very late corrections outside this replay horizon require manual audit/backfill; this is a documented accounting limitation.

Daily loss locks persist for the UTC day even if later cash events improve PnL. Weekly locks persist until the configured reset policy permits release. The default requires a later UTC week and explicit acknowledgement. Risk is stress-estimated and cannot bound actual gap/outage losses. Pending/open reservations conservatively overlap already-booked entry fees; this may skip otherwise feasible entries.

## Database maintenance

Do not copy only the main SQLite file while WAL writes are active. Use SQLite backup API, or stop the process and preserve the database together with any `-wal`/`-shm` files. Never restore an older snapshot and immediately enable entries; reconcile first. Schema version 1 is validated on open. Unsupported future schemas fail rather than guessing migrations.

The database and secrets are local sensitive operational files. Restrict filesystem access. `.env`, databases, logs, reports, and downloaded datasets are excluded from version control. Do not run two clones against the same account.

## Authenticated Testnet acceptance checklist (not yet executed)

- Verify account type/mode/leverage detection with the actual account.
- Submit a minimum-size intended trade, inspect attached TP/SL, and reconcile fills.
- Confirm full-position market TP/SL, trigger price type, tick rounding, fees, and actual closed PnL.
- Stop and restart with an open protected position; confirm no duplicate entry.
- Exercise a partial-fill/cancel case where available without disabling protection.
- Disconnect/reconnect and confirm event deduplication and cash backfill.
- Queue pause and flatten; verify no new entries and independently confirm flat size.
- Confirm two-loss, daily, and weekly halts and their UTC reset rules.
- Save redacted evidence, SDK version, account type, and observations in API_VERIFICATION.md.

Use Testnet only. Mock tests cover failure paths but cannot prove exchange-side behavior for a specific account.
