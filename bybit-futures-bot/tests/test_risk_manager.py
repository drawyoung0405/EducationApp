from datetime import datetime, timezone
import pytest
from bot.models import D
from bot.risk_manager import RiskManager, windows
from bot.database import Database

NOW = int(datetime(2026, 11, 13, 12, tzinfo=timezone.utc).timestamp() * 1000)


def test_remaining_budget(db, config):
    risk = RiskManager(db, config)
    db.cash('loss', NOW - 1, -6)
    assert not risk.allow(NOW, D(5))[0]
    assert risk.allow(NOW, D(4))[0]


def test_reservation_blocks(db, config):
    risk = RiskManager(db, config)
    db.intent('a', 'signal', NOW, D(5), {})
    assert risk.snapshot(NOW)['reserved'] == 5
    assert not risk.allow(NOW, D(5))[0]


def test_loss_streak_and_cooldown(db, config):
    risk = RiskManager(db, config)
    db.trade('a', NOW - 100, NOW - 90, -5, {})
    db.trade('b', NOW - 80, NOW - 70, -5, {})
    assert risk.snapshot(NOW)['reason'] == 'Consecutive loss limit'
    assert risk.allow(windows(NOW)[0] + 86400000, D(5))[0]


def test_weekly_lock_survives_restart(tmp_path, config):
    path = tmp_path / 'state.sqlite'
    db = Database(path)
    db.cash('loss', NOW, -15)
    risk = RiskManager(db, config)
    assert risk.snapshot(NOW)['reason'] == 'Weekly loss lockout'
    db.close()
    db = Database(path)
    risk = RiskManager(db, config)
    later = NOW + 7 * 86400000
    assert not risk.allow(later, D(5))[0]
    risk.acknowledge(later)
    assert risk.allow(later, D(5))[0]
    db.close()


def test_weekly_cannot_reset_early(db, config):
    risk = RiskManager(db, config)
    db.cash('loss', NOW, -15)
    risk.snapshot(NOW)
    with pytest.raises(ValueError):
        risk.acknowledge(NOW)


def test_daily_trade_count_and_profit_policy(db, config):
    risk = RiskManager(db, config)
    for n in range(3):
        db.intent(str(n), str(n), NOW, D(5), {'opened': NOW})
        db.update_intent(str(n), 'CLOSED', {'opened': NOW})
    assert risk.snapshot(NOW)['trades_remaining'] == 0
    db.cash('loss', NOW, -8)
    db.cash('win', NOW, 7)
    assert risk.snapshot(NOW)['daily_remaining'] == 9
    config.no_profit_replenishment = True
    assert risk.snapshot(NOW)['daily_remaining'] == 2


def test_missed_weekly_lock_reconstructed_from_cash(db, config):
    db.cash('loss', NOW, -15)
    risk = RiskManager(db, config)
    later = NOW + 7 * 86400000
    assert risk.snapshot(later)['reason'] == 'Weekly loss lockout'
    risk.acknowledge(later)
    assert risk.allow(later, D(5))[0]


def test_daily_lock_stays_after_profit(db, config):
    risk = RiskManager(db, config)
    db.cash('loss', NOW, -10)
    assert risk.snapshot(NOW)['reason'] == 'Daily loss limit'
    db.cash('late-profit', NOW + 1, 5)
    assert risk.snapshot(NOW + 1)['reason'] == 'Daily loss limit'
