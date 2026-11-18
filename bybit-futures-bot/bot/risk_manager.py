from datetime import datetime, timezone, timedelta
from bot.models import D


def windows(now):
    day = datetime.fromtimestamp(now / 1000, timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week = day - timedelta(days=day.weekday())
    return int(day.timestamp() * 1000), int(week.timestamp() * 1000)


class RiskManager:
    def __init__(self, db, config):
        self.db, self.c = db, config

    def halt(self, reason):
        self.db.set('halt', reason)

    def snapshot(self, now):
        day, week = windows(now)
        if self.c.weekly_reset == 'manual':
            # Reconstruct missed lock events after a crash or delayed cash backfill.
            acknowledged = self.db.get('weekly_ack_through', -1)
            weeks = {windows(int(r[0]))[1] for r in self.db.conn.execute('SELECT ts FROM cash WHERE ts<=?', (now,))}
            for prior in sorted(weeks):
                if prior <= acknowledged:
                    continue
                used = -min(D(0), self.db.period(prior, min(prior + 7 * 86400000, now + 1), self.c.no_profit_replenishment))
                if used >= self.c.weekly_loss:
                    self.db.set('weekly_lock', max(prior, self.db.get('weekly_lock') or prior))
        daily = self.db.period(day, now + 1)
        weekly = self.db.period(week, now + 1)
        daily_used = -min(D(0), self.db.period(day, now + 1, self.c.no_profit_replenishment))
        weekly_used = -min(D(0), self.db.period(week, now + 1, self.c.no_profit_replenishment))
        entries = sum(1 for i in self.db.intents() if int(i['payload'].get('opened', -1)) >= day)
        active = self.db.intents(active=True)
        reserved = sum((D(i['risk']) for i in active), D(0))
        pending_slots = sum(1 for i in active if 'opened' not in i['payload'])
        if daily_used >= self.c.daily_loss:
            self.db.set('daily_lock', day)
        if weekly_used >= self.c.weekly_loss:
            self.db.set('weekly_lock', week)
        lock = self.db.get('weekly_lock')
        if lock is not None and week > lock and self.c.weekly_reset == 'calendar':
            self.db.set('weekly_lock', None)
        trades = self.db.trades()
        streak = 0
        for trade in reversed(trades):
            if D(trade['net']) >= 0:
                break
            streak += 1
        last_loss = trades[-1]['closed'] if trades and D(trades[-1]['net']) < 0 else 0
        reason = self.db.get('halt')
        if not reason and self.db.get('weekly_lock') is not None:
            reason = 'Weekly loss lockout'
        if not reason and (daily_used >= self.c.daily_loss or self.db.get('daily_lock') == day):
            reason = 'Daily loss limit'
        if not reason and entries + pending_slots >= self.c.max_daily_trades:
            reason = 'Daily entry limit'
        if not reason and streak >= self.c.max_consecutive_losses and last_loss >= day:
            reason = 'Consecutive loss limit'
        if not reason and last_loss and now < last_loss + self.c.cooldown_minutes * 60000:
            reason = 'Loss cooldown'
        return dict(daily=daily, weekly=weekly, streak=streak, reserved=reserved,
                    daily_remaining=max(D(0), self.c.daily_loss - daily_used - reserved),
                    weekly_remaining=max(D(0), self.c.weekly_loss - weekly_used - reserved),
                    trades_remaining=max(0, self.c.max_daily_trades - entries - pending_slots), reason=reason)

    def allow(self, now, loss):
        state = self.snapshot(now)
        if state['reason']:
            return False, state['reason']
        if self.db.intents(active=True):
            return False, 'Existing position or unresolved order'
        if loss <= 0 or loss > min(state['daily_remaining'], state['weekly_remaining']):
            return False, 'Insufficient stress-loss budget'
        return True, 'Allowed'

    def acknowledge(self, now):
        if self.db.intents(active=True):
            raise ValueError('Cannot acknowledge with unresolved exposure; reconcile/flatten first')
        lock = self.db.get('weekly_lock')
        if lock is not None and windows(now)[1] <= lock:
            raise ValueError('Weekly lock cannot reset within the same UTC week')
        if lock is not None:
            self.db.set('weekly_ack_through', lock)
        self.db.set('weekly_lock', None)
        self.db.set('halt', None)
