"""Journal-first order lifecycle; exchange state always wins over local assumptions."""
from dataclasses import asdict
import hashlib
import logging
import time
from bot.models import D
from bot.accounting import Accounting
from bot.position_manager import protection, liquidation_safe
from bot.risk_manager import windows

LOG = logging.getLogger(__name__)
TERMINAL = {'Filled', 'Cancelled', 'Rejected', 'Deactivated', 'PartiallyFilledCanceled'}


class OrderManager:
    def __init__(self, db, exchange, risk, instrument):
        self.db, self.x, self.risk, self.instrument = db, exchange, risk, instrument
        self.c = exchange.c
        self.accounting = Accounting(db, exchange)

    def enter(self, signal, plan):
        now = self.x.now()
        key = f'ema-rsi:{self.c.symbol}:{signal.candle}'
        if self.db.seen(key):
            return False
        allowed, reason = self.risk.allow(now, plan.risk)
        if not allowed:
            LOG.info('Entry skipped: %s', reason)
            return False
        self.x.verify_account()
        if any(D(p['size']) for p in self.x.positions()) or self.x.orders():
            self.risk.halt('Exchange not flat before entry')
            return False
        link = 'bf-' + hashlib.sha256(key.encode()).hexdigest()[:30]
        payload = {k: str(v) for k, v in asdict(plan).items()} | {'side': signal.side, 'signal': signal.candle}
        self.db.intent(link, key, now, plan.risk, payload)
        try:
            result = self.x.call('place_order', write=True, category='linear', symbol=self.c.symbol,
                side=signal.side, orderType='Market', qty=str(plan.qty), positionIdx=0,
                orderLinkId=link, takeProfit=str(plan.tp), stopLoss=str(plan.sl), tpslMode='Full',
                tpOrderType='Market', slOrderType='Market', tpTriggerBy=self.c.trigger_by,
                slTriggerBy=self.c.trigger_by)
            payload['order_id'] = result['result']['orderId']
            self.db.update_intent(link, 'ENTRY_PENDING', payload)
            LOG.info('Entry acknowledged link=%s order=%s', link, payload['order_id'])
        except Exception:
            self.risk.halt('Ambiguous entry submission; reconcile before acknowledgement')
            LOG.error('Entry outcome unknown link=%s; submission will not be repeated', link)
        # Native provisional protection is already requested; poll promptly for actual fill.
        deadline = time.monotonic() + self.c.protection_timeout
        while time.monotonic() < deadline:
            self.reconcile()
            active = self.db.intents(active=True)
            if not active or active[0]['status'] == 'OPEN':
                return True
            time.sleep(.5)
        self.risk.halt('Entry/protection confirmation deadline exceeded')
        self.flatten()
        return False

    def cancel_entry(self, intent, order):
        if order and order['orderStatus'] not in TERMINAL:
            try:
                self.x.call('cancel_order', write=True, category='linear', symbol=self.c.symbol,
                            orderLinkId=intent['id'])
            except Exception:
                self.risk.halt('Entry cancellation unconfirmed')

    def reconcile(self):
        positions = [p for p in self.x.positions() if D(p['size']) > 0]
        intents = self.db.intents(active=True)
        if len(positions) > 1 or len(intents) > 1 or any(p['symbol'] != self.c.symbol for p in positions):
            self.risk.halt('Unexpected account exposure; manual reconciliation required')
            raise RuntimeError('Unexpected account exposure')
        orders = self.x.orders()
        owned = {i['id'] for i in intents}
        if any(o.get('orderLinkId') not in owned and not o.get('reduceOnly') and
               o.get('stopOrderType') not in {'TakeProfit', 'StopLoss', 'PartialTakeProfit', 'PartialStopLoss'} for o in orders):
            self.risk.halt('Unexpected open order')
        if not intents:
            if positions:
                self.risk.halt('Unowned position detected; inspect exchange protection immediately')
                raise RuntimeError('Unowned position requires operator reconciliation')
            self.accounting.sync()
            if not self.db.intents() and any(int(r['execTime']) >= windows(self.x.now())[1]
                                            for r in self.accounting.fills(windows(self.x.now())[1])):
                self.risk.halt('Current-week exchange trades have no journal; restore state or use a fresh account')
            return None
        i = intents[0]
        p = i['payload']
        order = self.x.find_order(i['id'])
        if order and order['orderStatus'] not in TERMINAL:
            self.cancel_entry(i, order)
            order = self.x.find_order(i['id'])
        if positions:
            pos = positions[0]
            if pos['side'] != p['side'] or int(pos['positionIdx']) != 0 or D(pos['size']) > D(p['qty']):
                self.risk.halt('Position differs from journal')
                raise RuntimeError('Position ownership mismatch')
            if not order or order['orderStatus'] not in TERMINAL:
                # Retain provisional stops, do not assume cancellation has completed.
                if not D(pos.get('stopLoss') or 0) or not D(pos.get('takeProfit') or 0):
                    self.risk.halt('Unprotected partial entry')
                    self.flatten()
                return pos
            if i['status'] == 'EXIT_PENDING':
                self.flatten()
                self.accounting.sync()
                return pos
            p.setdefault('opened', int(order.get('updatedTime') or self.x.now()))
            entry, qty = D(pos['avgPrice']), D(pos['size'])
            if qty * entry > min(self.c.max_notional, self.c.max_margin * self.c.leverage):
                self.risk.halt('Actual fill exceeds configured exposure ceiling')
                self.flatten()
                return pos
            # Actual entry fees are reconciled when available; use conservative fee estimate meanwhile.
            fills = self.x.rows('get_executions', category='linear', symbol=self.c.symbol, orderLinkId=i['id'], limit=100)
            fills = {r['execId']: r for r in fills if r.get('execType') == 'Trade'}
            fill_qty = sum((D(r['execQty']) for r in fills.values()), D(0))
            if fills:
                p['opened'] = min(int(r['execTime']) for r in fills.values())
            fee = sum((D(r['execFee']) for r in fills.values()), D(0)) if fill_qty == qty else qty * entry * self.c.fee_rate
            for r in fills.values():
                self.db.execution(r)
            try:
                final = protection(pos['side'], entry, qty, D(i['risk']), D(p.get('requested_target', p['target'])), self.c, self.instrument, fee)
                mark = D(pos['markPrice'])
                if not liquidation_safe(pos['side'], final.sl, D(pos.get('liqPrice') or 0), mark, self.c):
                    raise ValueError('Missing/unsafe liquidation price')
                if not (final.sl < mark < final.tp if pos['side'] == 'Buy' else final.tp < mark < final.sl):
                    raise ValueError('Protection already crossed')
                if D(pos.get('stopLoss') or 0) != final.sl or D(pos.get('takeProfit') or 0) != final.tp:
                    self.db.update_intent(i['id'], 'PROTECTION_PENDING', p)
                    self.x.call('set_trading_stop', write=True, category='linear', symbol=self.c.symbol,
                        positionIdx=0, tpslMode='Full', takeProfit=str(final.tp), stopLoss=str(final.sl),
                        tpOrderType='Market', slOrderType='Market', tpTriggerBy=self.c.trigger_by, slTriggerBy=self.c.trigger_by)
                    verified = [v for v in self.x.positions() if v['symbol'] == self.c.symbol and D(v['size']) > 0]
                    if not verified:
                        self.db.update_intent(i['id'], 'RECONCILING', p)
                        return None
                    pos = verified[0]
                    if D(pos.get('stopLoss') or 0) != final.sl or D(pos.get('takeProfit') or 0) != final.tp:
                        raise RuntimeError('TP/SL verification failed')
                p.setdefault('requested_target', p['target'])
                p.update(entry=str(entry), filled_qty=str(qty), tp=str(final.tp), sl=str(final.sl), entry_fee=str(fee))
                self.db.update_intent(i['id'], 'OPEN', p)
            except Exception as exc:
                self.risk.halt('Protection failure: ' + type(exc).__name__)
                LOG.error('Protection failure; requesting emergency flatten')
                self.flatten()
                return pos
            self.accounting.sync()
            return pos
        self.accounting.sync()
        if order and order['orderStatus'] in TERMINAL:
            if D(order.get('cumExecQty') or 0) == 0:
                self.db.update_intent(i['id'], 'REJECTED', p)
            else:
                p.setdefault('opened', int(order.get('createdTime') or i['created']))
                self.db.update_intent(i['id'], 'RECONCILING', p)
                i['payload'] = p
                if self.accounting.finish(i):
                    LOG.info('Position closed link=%s net=%s', i['id'], p.get('net'))
        else:
            self.risk.halt('Unresolved entry intent; absence is not proof of rejection')
        return None

    def flatten(self):
        self.risk.halt('Emergency flatten requested; verify exchange before resuming')
        for i in self.db.intents(active=True):
            self.cancel_entry(i, self.x.find_order(i['id']))
            p = i['payload']
            positions = [v for v in self.x.positions() if v['symbol'] == self.c.symbol and D(v['size']) > 0]
            if not positions:
                continue
            pos = positions[0]
            link = p.get('exit_link')
            if link:
                existing = self.x.find_order(link)
                if not existing or existing['orderStatus'] not in TERMINAL:
                    continue  # Ambiguous exit is never blindly resubmitted.
                if existing['orderStatus'] == 'Filled':
                    # Only a position update at/after the confirmed close can establish residual exposure.
                    if not pos.get('updatedTime') or int(pos['updatedTime']) < int(existing.get('updatedTime') or self.x.now()):
                        continue
            p['exit_attempt'] = p.get('exit_attempt', 0) + 1
            p['exit_link'] = i['id'][:26] + '-x' + str(p['exit_attempt'])
            self.db.update_intent(i['id'], 'EXIT_PENDING', p)
            try:
                self.x.call('place_order', write=True, category='linear', symbol=self.c.symbol,
                    side='Sell' if pos['side'] == 'Buy' else 'Buy', orderType='Market',
                    qty=pos['size'], positionIdx=0, reduceOnly=True, orderLinkId=p['exit_link'])
            except Exception:
                LOG.error('Emergency close outcome unknown; keep reconciling')
