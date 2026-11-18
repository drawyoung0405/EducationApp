"""Explicit simulated execution, never used by the Testnet order manager."""
from dataclasses import asdict
import hashlib
from bot.models import D
from bot.position_manager import net_at


class Simulator:
    def __init__(self, db, config, risk):
        self.db, self.c, self.risk = db, config, risk

    def enter(self, signal, plan, now, regime='unknown'):
        key = f'ema-rsi:{self.c.symbol}:{signal.candle}'
        if self.db.seen(key) or not self.risk.allow(now, plan.risk)[0]:
            return False
        link = 'sim-' + hashlib.sha256(key.encode()).hexdigest()[:28]
        payload = {k: str(v) for k, v in asdict(plan).items()} | {
            'side': signal.side, 'opened': now, 'regime': regime}
        self.db.intent(link, key, now, plan.risk, payload)
        fee = plan.qty * plan.entry * self.c.fee_rate
        self.db.cash(link + ':entry', now, -fee, fee)
        self.db.update_intent(link, 'OPEN', payload)
        return True

    def funding(self, now, rate, mark):
        active = self.db.intents(active=True)
        if active:
            i = active[0]
            p = i['payload']
            amount = -D(1 if p['side'] == 'Buy' else -1) * D(p['qty']) * D(mark) * D(rate)
            self.db.cash(f"{i['id']}:funding:{now}", now, amount, funding=amount)

    def close(self, price, now, reason):
        active = self.db.intents(active=True)
        if not active:
            return
        i, p = active[0], active[0]['payload']
        qty, entry = D(p['qty']), D(p['entry'])
        entry_fee = qty * entry * self.c.fee_rate
        exit_fee = qty * price * self.c.fee_rate
        gross_net = net_at(p['side'], entry, price, qty, self.c.fee_rate)
        self.db.cash(i['id'] + ':exit', now, gross_net + entry_fee, exit_fee)
        funding = sum((D(r[0]) for r in self.db.conn.execute(
            'SELECT funding FROM cash WHERE id LIKE ?', (i['id'] + ':funding:%',))), D(0))
        net = gross_net + funding
        p.update(exit=str(price), fees=str(entry_fee + exit_fee), funding=str(funding), reason=reason, net=str(net))
        self.db.trade(i['id'], p['opened'], now, net, p)
        self.db.update_intent(i['id'], 'CLOSED', p)
        self.risk.snapshot(now)  # Latch weekly lock at the event, including split boundaries.

    def bar(self, row, half_spread_bps=0):
        active = self.db.intents(active=True)
        if not active:
            return
        p = active[0]['payload']
        tp, sl = D(p['tp']), D(p['sl'])
        buy = p['side'] == 'Buy'
        stop = D(row.low) <= sl if buy else D(row.high) >= sl
        take = D(row.high) >= tp if buy else D(row.low) <= tp
        if stop or take:
            # Stop wins ambiguous bars. Gaps fill at the worse opening price.
            trigger = (min(sl, D(row.open)) if buy else max(sl, D(row.open))) if stop else tp
            sign = D(1 if buy else -1)
            fill = trigger * (1 - sign * (self.c.slippage_bps + D(half_spread_bps)) / 10000)
            self.close(fill, int(row.close_time), 'stop' if stop else 'take_profit')

    def tick(self, trigger, bid, ask, now):
        active = self.db.intents(active=True)
        if not active:
            return
        p = active[0]['payload']
        buy = p['side'] == 'Buy'
        stop = trigger <= D(p['sl']) if buy else trigger >= D(p['sl'])
        take = trigger >= D(p['tp']) if buy else trigger <= D(p['tp'])
        if stop or take:
            fill = (bid if buy else ask) * (1 + D(-1 if buy else 1) * self.c.slippage_bps / 10000)
            self.close(fill, now, 'stop' if stop else 'take_profit')
