import pytest
from bot.models import D
from bot.position_manager import size_trade, protection, net_at, liquidation_safe


@pytest.mark.parametrize('side', ['Buy', 'Sell'])
def test_net_prices_respect_loss_and_costs(config, instrument, side):
    plan = size_trade(side, D(100000), D(200), D(200), 500, config, instrument)
    assert plan.qty == D('.005')
    assert plan.risk <= 5 and plan.target >= 5
    factor = 1 - D(1 if side == 'Buy' else -1) * config.slippage_bps / 10000
    assert net_at(side, plan.entry, plan.sl * factor, plan.qty, config.fee_rate) - config.funding_reserve >= -5
    assert plan.sl % instrument.tick == 0


def test_minimum_order_skip(config, instrument):
    with pytest.raises(ValueError):
        size_trade('Buy', D(100000), D(1), D(1), 500, config, instrument)


def test_costs_exceed_budget(config, instrument):
    with pytest.raises(ValueError):
        protection('Buy', D(100000), D('.005'), D('.01'), D(5), config, instrument)


def test_atr_risk(config, instrument):
    config.exit_model = 'atr'
    p = size_trade('Buy', D(100000), D(200), D(200), 500, config, instrument)
    assert p.risk <= 2
    assert p.qty < D('.005')


def test_liquidation_check(config):
    assert liquidation_safe('Buy', D(99000), D(81000), D(100000), config)
    assert not liquidation_safe('Buy', D(82000), D(81000), D(100000), config)
    assert not liquidation_safe('Sell', D(101000), D(0), D(100000), config)
