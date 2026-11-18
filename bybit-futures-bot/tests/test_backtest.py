from types import SimpleNamespace
import pandas as pd
import pytest
from bot.data_feed import validate
from bot.models import D, Signal
from bot.position_manager import size_trade
from bot.simulation import Simulator
from bot.risk_manager import RiskManager
from backtest.reports import metrics


def test_both_hit_stop_first(db, config, instrument):
    sim = Simulator(db, config, RiskManager(db, config))
    plan = size_trade('Buy', D(100000), D(200), D(200), 500, config, instrument)
    sim.enter(Signal('Buy', 0, {}), plan, 1)
    sim.bar(SimpleNamespace(low=90000, high=110000, open=100000, close_time=2))
    assert db.trades()[0]['payload']['reason'] == 'stop'
    assert D(db.trades()[0]['net']) < 0


def test_repeat_signal_survives_close(db, config, instrument):
    sim = Simulator(db, config, RiskManager(db, config))
    plan = size_trade('Buy', D(100000), D(200), D(200), 500, config, instrument)
    s = Signal('Buy', 0, {})
    assert sim.enter(s, plan, 1)
    sim.close(D(101000), 2, 'test')
    assert not sim.enter(s, plan, 3)


def test_gap_rejected():
    f = pd.DataFrame(dict(timestamp=[0, 1800000], open=[1, 1], high=[2, 2], low=[1, 1], close=[2, 2], volume=[1, 1]))
    with pytest.raises(ValueError):
        validate(f, 15)


def test_metrics_empty_and_drawdown():
    r = metrics([], [{'equity': '200'}, {'equity': '190'}, {'equity': '205'}, {'equity': '180'}], 200)
    assert r['maximum_drawdown'] == 25
    assert r['profit_factor'] is None
    assert r['total_trades'] == 0


def test_features_have_no_future_dependence(config):
    from bot.strategy import features
    from bot.data_feed import aggregate
    import numpy as np
    config.trend_fast, config.trend_slow = 2, 3
    n = 80
    prices = 100 + np.sin(np.arange(n) / 3)
    f = validate(pd.DataFrame(dict(timestamp=np.arange(n) * 900000,
        open=prices, close=prices, high=prices + 1, low=prices - 1, volume=np.ones(n))), 15)
    a = features(f, aggregate(f, 60, 15), config)
    b = features(f.iloc[:40], aggregate(f.iloc[:40], 60, 15), config)
    pd.testing.assert_frame_equal(a.iloc[:40].reset_index(drop=True), b)


def test_full_backtest_reports(tmp_path, config, instrument):
    from scripts.generate_fixture import generate
    from backtest.engine import backtest
    config.trend_fast, config.trend_slow = 2, 5
    config.trigger_by = 'LastPrice'
    path = tmp_path / 'synthetic.csv'
    generate(path, 240)
    report = backtest(path, config, tmp_path / 'report', instrument)
    assert set(report['periods']) == {'training', 'validation', 'out_of_sample'}
    assert report['funding_included'] is False
    assert (tmp_path / 'report' / 'equity.csv').exists()
