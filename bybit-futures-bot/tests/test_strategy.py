import pandas as pd
import pytest
from bot.strategy import signal_at, features
from bot.indicators import rsi


def frame():
    return pd.DataFrame([dict(close_time=1, fast=1, slow=1, rsi=60, atr=1, trend_fast=3, trend_slow=2),
                         dict(close_time=2, fast=2, slow=1, rsi=60, atr=1, trend_fast=3, trend_slow=2)])


def test_long_cross(config):
    assert signal_at(frame(), 1, config).side == 'Buy'


@pytest.mark.parametrize('value', [55, 70, 30, 100])
def test_strict_rsi(config, value):
    f = frame()
    f.loc[1, 'rsi'] = value
    assert signal_at(f, 1, config).side is None


def test_short(config):
    f = frame()
    f['trend_fast'], f['trend_slow'], f['rsi'] = 1, 2, 40
    f.loc[1, 'fast'] = 0
    assert signal_at(f, 1, config).side == 'Sell'


def test_flat_rsi():
    assert rsi(pd.Series([10.] * 30), 14).iloc[-1] == 50
    assert rsi(pd.Series(range(30), dtype=float), 14).iloc[-1] == 100


def test_hourly_close_alignment(config):
    config.ema_fast, config.ema_slow = 1, 2
    config.trend_fast, config.trend_slow = 1, 2
    config.rsi_period, config.atr_period = 1, 1
    e = pd.DataFrame(dict(close_time=[90, 120, 150], close=[1., 2., 3.], high=[2., 3., 4.], low=[.5, 1., 2.]))
    t = pd.DataFrame(dict(close_time=[60, 120], close=[10., 20.]))
    f = features(e, t, config)
    assert f.iloc[0].trend_fast == 10
    assert f.iloc[1].trend_fast == 20
