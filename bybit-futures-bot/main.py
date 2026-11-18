"""Run from this project directory. No live execution mode exists."""
import argparse
import json
import time
from pathlib import Path
import portalocker
from bot.config import load_config
from bot.logger import setup
from bot.database import Database
from bot.risk_manager import RiskManager
from bot.runtime import run, database_path
from bot.exchange import Exchange
from bot.data_feed import download
from bot.models import D, Instrument
from backtest.engine import backtest


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--config', default='config.yaml')
    p.add_argument('--mode', choices=['dry_run', 'testnet', 'backtest'])
    commands = p.add_subparsers(dest='command', required=True)
    run_p = commands.add_parser('run')
    run_p.add_argument('--once', action='store_true', help='One polling cycle, then safe shutdown')
    for name in ['status', 'pause', 'flatten', 'acknowledge-halt', 'reconcile']:
        commands.add_parser(name)
    d = commands.add_parser('download')
    d.add_argument('--start', type=int, required=True, help='UTC epoch milliseconds')
    d.add_argument('--end', type=int, required=True)
    d.add_argument('--output', default='data/btcusdt.csv')
    b = commands.add_parser('backtest')
    b.add_argument('--csv', required=True)
    b.add_argument('--output', default='reports/backtest')
    b.add_argument('--funding-csv')
    b.add_argument('--spread-bps', type=float, default=2)
    b.add_argument('--allow-mark-approximation', action='store_true')
    b.add_argument('--tick', default='0.1')
    b.add_argument('--qty-step', default='0.001')
    b.add_argument('--min-qty', default='0.001')
    b.add_argument('--min-notional', default='5')
    b.add_argument('--max-qty', default='100')
    return p


def main():
    args = parser().parse_args()
    c = load_config(args.config, args.mode)
    setup(c.mode)
    if args.command == 'run':
        run(c, args.once)
    elif args.command == 'backtest':
        if args.spread_bps < 0:
            raise ValueError('Negative spread')
        c.mode = 'backtest'
        spec = Instrument(D(args.tick), D(args.qty_step), D(args.min_qty), D(args.min_notional), D(args.max_qty))
        if min(vars(spec).values()) <= 0:
            raise ValueError('Instrument values must be positive')
        report = backtest(args.csv, c, args.output, spec, args.spread_bps, args.funding_csv, args.allow_mark_approximation)
        print(json.dumps(report, indent=2, default=str))
    elif args.command == 'download':
        c.mode = 'dry_run'
        x = Exchange(c)
        try:
            x.sync_clock()
            if args.start >= args.end:
                raise ValueError('Start must precede end')
            print('Downloaded candles:', download(x, args.start, args.end, args.output))
        finally:
            x.close()
    else:
        db = Database(database_path(c))
        risk = RiskManager(db, c)
        try:
            if args.command == 'status':
                print(json.dumps({'dashboard': db.get('dashboard'), 'risk': risk.snapshot(int(time.time() * 1000)),
                                  'active_intents': db.intents(active=True)}, indent=2, default=str))
            elif args.command == 'pause':
                risk.halt('Operator pause')
                print('New entries paused; running process continues position management.')
            elif args.command == 'flatten':
                risk.halt('Operator flatten requested')
                db.set('command', 'flatten')
                print('Flatten queued. The matching run process must be active; inspect status until flat.')
            else:
                with portalocker.Lock('.runtime.lock', timeout=0):
                    if c.mode == 'testnet':
                        from bot.order_manager import OrderManager
                        x = Exchange(c)
                        try:
                            x.sync_clock()
                            OrderManager(db, x, risk, x.instrument()).reconcile()
                            if args.command == 'acknowledge-halt' and (x.orders() or any(D(p['size']) for p in x.positions())):
                                raise ValueError('Exchange is not flat')
                        finally:
                            x.close()
                    if args.command == 'acknowledge-halt':
                        risk.acknowledge(int(time.time() * 1000))
                        db.set('command', None)
                    print('Reconciliation/acknowledgement completed; inspect status before running.')
        finally:
            db.close()


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, PermissionError, portalocker.exceptions.LockException) as exc:
        raise SystemExit(str(exc)) from None
