from pathlib import Path
from dataclasses import replace
import logging
import queue
import signal as signals
import threading
import time
import portalocker
from bot.exchange import Exchange
from bot.database import Database
from bot.risk_manager import RiskManager
from bot.order_manager import OrderManager
from bot.simulation import Simulator
from bot.data_feed import live_frames
from bot.strategy import features, signal_at
from bot.position_manager import size_trade, net_at
from bot.models import D
from bot.dashboard import display
from bot.notifications import notify

LOG = logging.getLogger(__name__)


def database_path(c):
    return Path(c.data_dir) / f'{c.mode}.sqlite'


def run(c, once=False):
    if c.mode == 'backtest':
        raise ValueError('Use the backtest command for historical mode')
    if c.mode == 'testnet' and not c.enable_testnet_orders:
        raise ValueError('Set BOT_ENABLE_TESTNET_ORDERS=true to opt into actual Testnet execution')
    Path(c.data_dir).mkdir(parents=True, exist_ok=True)
    # Fixed project lock prevents concurrent execution even with different data directories.
    with portalocker.Lock('.runtime.lock', timeout=0):
        db = Database(database_path(c))
        risk = RiskManager(db, c)
        stop = threading.Event()
        for sig in (signals.SIGINT, signals.SIGTERM):
            signals.signal(sig, lambda *_: stop.set())
        events = queue.Queue(maxsize=1000)
        def callback(event):
            try:
                events.put_nowait(event)
            except queue.Full:
                # REST is authoritative; dropping wakeups does not drop accounting events.
                LOG.warning('Stream wakeup queue full; REST backfill remains active')
        x = None
        manager = None
        LOG.info('Startup mode=%s symbol=%s', c.mode, c.symbol)
        try:
            x = Exchange(c)
            x.sync_clock()
            instrument = x.instrument()
            if c.mode == 'testnet':
                manager = OrderManager(db, x, risk, instrument)
                manager.reconcile()  # Manage inherited exposure before validating entry settings.
                x.verify_account()
                try:
                    x.start_stream(callback)
                except Exception:
                    LOG.warning('Private stream unavailable; REST reconciliation remains active')
            sim = Simulator(db, c, risk)
            prior_halt = None
            last_candle = None
            while not stop.is_set():
                try:
                    if time.time() * 1000 - x.last_sync > 60000:
                        x.sync_clock()
                    while not events.empty():
                        event = events.get_nowait()
                        LOG.debug('Private event topic=%s; reconciling via REST', event.get('topic'))
                    position = manager.reconcile() if manager else None
                    command = db.get('command')
                    if command == 'flatten':
                        risk.halt('Operator flatten')
                        if manager:
                            manager.flatten()
                        else:
                            ticker = x.ticker()
                            active = db.intents(active=True)
                            if active:
                                buy = active[0]['payload']['side'] == 'Buy'
                                price = D(ticker['bid1Price' if buy else 'ask1Price'])
                                price *= 1 + D(-1 if buy else 1) * c.slippage_bps / 10000
                                sim.close(price, x.now(), 'operator_flatten')
                        if not db.intents(active=True):
                            db.set('command', None)
                    ticker = x.ticker()
                    bid, ask = D(ticker['bid1Price']), D(ticker['ask1Price'])
                    price, mark = D(ticker['lastPrice']), D(ticker['markPrice'])
                    if min(bid, ask, price, mark) <= 0 or bid > ask:
                        raise ValueError('Invalid market quote')
                    now = x.now()
                    if not manager:
                        sim.tick(mark if c.trigger_by == 'MarkPrice' else price, bid, ask, now)
                    entry, trend = live_frames(x)
                    f = features(entry, trend, c)
                    sig = signal_at(f, len(f) - 1, c)
                    spread = (ask - bid) / ((ask + bid) / 2) * 10000
                    if sig.candle != last_candle:
                        last_candle = sig.candle
                        LOG.info('Signal candle=%s side=%s values=%s', sig.candle, sig.side, sig.values)
                        if sig.side and now - sig.candle <= c.max_signal_age_seconds * 1000 and not db.intents(active=True):
                            if c.max_spread_bps and spread > c.max_spread_bps:
                                LOG.info('Spread filter skipped signal')
                            elif c.max_atr_fraction and D(sig.values['atr']) / price > c.max_atr_fraction:
                                LOG.info('ATR filter skipped signal')
                            else:
                                equity, available = x.balance() if manager else (c.reference_capital + db.period(0, now + 1),) * 2
                                expected = (ask if sig.side == 'Buy' else bid) * (1 + D(1 if sig.side == 'Buy' else -1) * c.slippage_bps / 10000)
                                try:
                                    plan = size_trade(sig.side, expected, equity, available, sig.values['atr'], c, instrument)
                                    if manager:
                                        manager.enter(sig, plan)
                                    else:
                                        sim.enter(sig, plan, now)
                                except ValueError as exc:
                                    LOG.info('Sizing skipped: %s', exc)
                    if not manager and db.intents(active=True):
                        p = db.intents(active=True)[0]['payload']
                        position = p | {'estimated_unrealized_net': str(net_at(p['side'], D(p['entry']), price, D(p['qty']), c.fee_rate))}
                    display(db, risk, now, price, sig, position)
                    halt = risk.snapshot(now)['reason']
                    if halt and halt != prior_halt:
                        LOG.warning('Trading halted: %s', halt)
                        notify(c, 'Trading halted: ' + halt)
                    prior_halt = halt
                except Exception as exc:
                    risk.halt('Critical runtime error: ' + type(exc).__name__)
                    LOG.error('Critical runtime failure type=%s message=%s; recovery continues', type(exc).__name__, str(exc))
                    if once:
                        raise
                if once:
                    break
                stop.wait(c.poll_seconds)
        finally:
            if manager:
                try:
                    for i in db.intents(active=True):
                        manager.cancel_entry(i, x.find_order(i['id']))
                    manager.reconcile()
                except Exception:
                    risk.halt('Shutdown reconciliation failed; inspect exchange immediately')
                    LOG.error('Shutdown reconciliation failed; exchange exposure is NOT confirmed safe')
            if x:
                x.close()
            LOG.info('Shutdown; existing native protection remains on exchange')
            db.close()
