import pytest
from bot.config import load_config, Config


@pytest.mark.parametrize('kwargs', [dict(mode='live'), dict(symbol='ETHUSDT'), dict(leverage=6),
    dict(ema_fast=21), dict(rsi_period=0), dict(signal_minutes=7)])
def test_invalid(kwargs):
    with pytest.raises(ValueError):
        Config(**kwargs).validate()


def test_env_overrides_yaml(tmp_path, monkeypatch):
    p = tmp_path / 'config.yaml'
    p.write_text('leverage: 3\nmode: dry_run\n')
    monkeypatch.setenv('BOT_LEVERAGE', '4')
    assert load_config(p).leverage == 4


def test_unknown_config_rejected(tmp_path):
    p = tmp_path / 'config.yaml'
    p.write_text('endpoint: https://api.bybit.com\n')
    with pytest.raises(ValueError):
        load_config(p)
