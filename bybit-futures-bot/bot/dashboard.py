import json
import logging


def display(db, risk, now, price=None, signal=None, position=None):
    snapshot = risk.snapshot(now)
    payload = dict(time=now, price=price, signal=signal.side if signal else None,
        indicators=signal.values if signal else {}, position=position,
        daily_net=snapshot['daily'], weekly_net=snapshot['weekly'],
        consecutive_losses=snapshot['streak'], trades_remaining=snapshot['trades_remaining'],
        status=snapshot['reason'] or ('Managing exposure' if db.intents(active=True) else 'Ready'))
    db.set('dashboard', payload)
    logging.info('DASHBOARD %s', json.dumps(payload, default=str))
