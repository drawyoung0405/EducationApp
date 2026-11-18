"""Fault-injected exchange, isolated from the real Testnet adapter."""
from copy import deepcopy
from dataclasses import asdict
import pytest
from bot.models import D, Signal
from bot.order_manager import OrderManager
from bot.position_manager import size_trade
from bot.risk_manager import RiskManager


class FakeExchange:
    def __init__(self, c):
        self.c = c
        self.pos = []
        self.order = None
        self.calls = []
        self.fail_submit = False
        self.fail_protection = False
        self.fills = []

    def now(self):
        return 100000

    def verify_account(self):
        return None

    def positions(self):
        return deepcopy(self.pos)

    def orders(self):
        return []

    def find_order(self, link):
        if link.endswith('-x1'):
            return None
        return deepcopy(self.order)

    def rows(self, method, **params):
        return self.fills if method == 'get_executions' else []

    def call(self, method, **params):
        self.calls.append((method, params))
        if method == 'place_order':
            if self.fail_submit:
                raise TimeoutError('accepted but acknowledgement lost')
            return {'result': {'orderId': 'id'}}
        if method == 'set_trading_stop':
            if self.fail_protection:
                raise TimeoutError('protection outcome unknown')
            self.pos[0].update(takeProfit=params['takeProfit'], stopLoss=params['stopLoss'])
        if method == 'cancel_order':
            self.order['orderStatus'] = 'Cancelled'
        return {'result': {}}


def journal(db, config, instrument, status='ENTRY_PENDING'):
    plan = size_trade('Buy', D(100000), D(200), D(200), 500, config, instrument)
    p = {k: str(v) for k, v in asdict(plan).items()} | {'side': 'Buy'}
    db.intent('bf-test', 'signal', 1000, plan.risk, p)
    db.update_intent('bf-test', status, p)
    return plan


def position(qty='.005'):
    return dict(symbol='BTCUSDT', size=qty, side='Buy', positionIdx=0, avgPrice='100000',
                markPrice='100000', liqPrice='81000', takeProfit='0', stopLoss='0')


def test_ambiguous_write_never_resubmits(db, config, instrument, monkeypatch):
    x = FakeExchange(config)
    x.fail_submit = True
    risk = RiskManager(db, config)
    manager = OrderManager(db, x, risk, instrument)
    # Complete the confirmation deadline immediately; no wall-clock sleep in this test.
    times = iter([0, 100])
    monkeypatch.setattr('bot.order_manager.time.monotonic', lambda: next(times))
    plan = size_trade('Buy', D(100000), D(200), D(200), 500, config, instrument)
    assert not manager.enter(Signal('Buy', 1, {}), plan)
    assert len([m for m, _ in x.calls if m == 'place_order']) == 1
    assert db.intents(active=True)[0]['status'] == 'ENTRY_PENDING'
    assert db.get('halt')


def test_restart_protects_actual_partial_fill(db, config, instrument):
    journal(db, config, instrument)
    x = FakeExchange(config)
    x.pos = [position('.003')]
    x.order = dict(orderStatus='PartiallyFilled', cumExecQty='.003', updatedTime='1500')
    manager = OrderManager(db, x, RiskManager(db, config), instrument)
    manager.reconcile()
    assert [m for m, _ in x.calls] == ['cancel_order', 'set_trading_stop']
    assert db.intents(active=True)[0]['status'] == 'OPEN'
    assert db.intents(active=True)[0]['payload']['filled_qty'] == '.003' or D(db.intents(active=True)[0]['payload']['filled_qty']) == D('.003')
    assert D(x.pos[0]['stopLoss']) > 0


def test_protection_failure_requests_reduce_only_exit(db, config, instrument):
    journal(db, config, instrument)
    x = FakeExchange(config)
    x.pos = [position()]
    x.order = dict(orderStatus='Filled', cumExecQty='.005', updatedTime='1500')
    x.fail_protection = True
    manager = OrderManager(db, x, RiskManager(db, config), instrument)
    manager.reconcile()
    close = [p for m, p in x.calls if m == 'place_order']
    assert len(close) == 1 and close[0]['reduceOnly'] is True
    assert db.intents(active=True)[0]['status'] == 'EXIT_PENDING'
    manager.reconcile()
    assert len([m for m, p in x.calls if m == 'place_order']) == 1


def test_missing_order_does_not_free_reservation(db, config, instrument):
    journal(db, config, instrument)
    x = FakeExchange(config)
    OrderManager(db, x, RiskManager(db, config), instrument).reconcile()
    assert db.intents(active=True)
    assert 'Unresolved' in db.get('halt')


def test_rejected_order_releases_reservation_but_keeps_signal(db, config, instrument):
    journal(db, config, instrument)
    x = FakeExchange(config)
    x.order = dict(orderStatus='Rejected', cumExecQty='0')
    OrderManager(db, x, RiskManager(db, config), instrument).reconcile()
    assert not db.intents(active=True)
    assert db.seen('signal')


def test_unowned_position_halts(db, config, instrument):
    x = FakeExchange(config)
    x.pos = [position()]
    with pytest.raises(RuntimeError):
        OrderManager(db, x, RiskManager(db, config), instrument).reconcile()
    assert db.get('halt')
