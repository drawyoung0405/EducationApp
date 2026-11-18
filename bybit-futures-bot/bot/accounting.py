"""Exchange cash events are authoritative; executions verify completeness."""
import json
from bot.models import D
from bot.risk_manager import windows


class Accounting:
    def __init__(self, db, exchange):
        self.db, self.x = db, exchange

    def sync(self):
        now = self.x.now()
        active = self.db.intents(active=True)
        # Replay current UTC week and entire unresolved position lifetime to catch delayed records.
        start = min([windows(now)[1] - 7 * 86400000] + [i['created'] for i in active])
        while start <= now:
            end = min(start + 7 * 86400000 - 1, now)
            for r in self.x.rows('get_transaction_log', accountType='UNIFIED', category='linear',
                                 currency='USDT', startTime=start, endTime=end, limit=50):
                if r.get('symbol') != self.x.c.symbol or r['type'] not in {'TRADE', 'SETTLEMENT'}:
                    continue
                fee, funding = D(r.get('fee') or 0), D(r.get('funding') or 0)
                net = D(r.get('cashFlow') or 0) + funding - fee
                self.db.cash(r['id'], int(r['transactionTime']), net, fee, funding, r)
            for r in self.x.rows('get_executions', category='linear', symbol=self.x.c.symbol,
                                 startTime=start, endTime=end, limit=100):
                self.db.execution(r)
            start = end + 1
        # Late funding/fee records can revise previously completed trade net PnL.
        # Dedicated-account, single-position ownership makes these intervals disjoint.
        for trade in self.db.trades():
            if trade['closed'] < windows(now)[1] - 7 * 86400000:
                continue
            rows = list(self.db.conn.execute('SELECT net,fee,funding FROM cash WHERE ts>=? AND ts<=?',
                                             (trade['opened'], trade['closed'])))
            if rows:
                net = sum((D(r['net']) for r in rows), D(0))
                payload = trade['payload'] | {'net': str(net),
                    'fees': str(sum((D(r['fee']) for r in rows), D(0))),
                    'funding': str(sum((D(r['funding']) for r in rows), D(0)))}
                with self.db.conn:
                    self.db.conn.execute('UPDATE trades SET net=?,payload=? WHERE id=?',
                                         (str(net), json.dumps(payload), trade['id']))

    def fills(self, since):
        return [r for row in self.db.conn.execute('SELECT payload FROM executions')
                if (r := json.loads(row[0])).get('execType') == 'Trade' and int(r['execTime']) >= since]

    def finish(self, intent):
        p = intent['payload']
        fills = self.fills(intent['created'])
        entry = [r for r in fills if r.get('orderLinkId') == intent['id']]
        exits = [r for r in fills if r['side'] != p['side']]
        incoming = sum((D(r['execQty']) for r in entry), D(0))
        outgoing = sum((D(r['execQty']) for r in exits), D(0))
        if not incoming or incoming != outgoing:
            return False
        if any(r['side'] == p['side'] and r.get('orderLinkId') != intent['id'] for r in fills):
            raise RuntimeError('Unowned execution; manual reconciliation required')
        closed = max(int(r['execTime']) for r in exits)
        cash = [dict(r) for r in self.db.conn.execute('SELECT * FROM cash WHERE ts>=? AND ts<=?',
                                                     (intent['created'], closed))]
        covered = {json.loads(r['payload']).get('tradeId') for r in cash}
        if not {r['execId'] for r in entry + exits} <= covered:
            return False  # Transaction API can lag executions: keep risk reservation.
        net = sum((D(r['net']) for r in cash), D(0))
        fees = sum((D(r['fee']) for r in cash), D(0))
        funding = sum((D(r['funding']) for r in cash), D(0))
        exit_price = sum((D(r['execQty']) * D(r['execPrice']) for r in exits), D(0)) / outgoing
        p.update(exit=str(exit_price), fees=str(fees), funding=str(funding), net=str(net), closed=closed)
        # Use first execution time, not final partial-fill update time.
        opened = min(int(r['execTime']) for r in entry)
        p['opened'] = opened
        self.db.trade(intent['id'], opened, closed, net, p)
        self.db.update_intent(intent['id'], 'CLOSED', p)
        return True
