from bot.accounting import Accounting
from bot.models import D


def test_cash_dedup(db):
    db.cash('id', 1, '-.50', '.50')
    db.cash('id', 1, '-.50', '.50')
    assert db.period(0, 2) == D('-.50')


def test_close_waits_for_cash_and_counts_funding_once(db):
    db.intent('entry', 'sig', 100, 5, {'side': 'Buy', 'opened': 100})
    a = Accounting(db, None)
    for r in [dict(execId='a', orderLinkId='entry', execType='Trade', execTime='100', side='Buy', execQty='.005', execPrice='100000'),
              dict(execId='b', orderLinkId='exit', execType='Trade', execTime='200', side='Sell', execQty='.005', execPrice='101000')]:
        db.execution(r)
        db.execution(r)
    i = db.intents(active=True)[0]
    assert not a.finish(i)
    db.cash('a', 100, '-.275', '.275', payload={'tradeId': 'a'})
    db.cash('f', 150, '-.1', funding='-.1')
    db.cash('b', 200, '4.72225', '.27775', payload={'tradeId': 'b'})
    assert a.finish(i)
    assert D(db.trades()[0]['net']) == D('4.34725')
    assert not db.intents(active=True)
