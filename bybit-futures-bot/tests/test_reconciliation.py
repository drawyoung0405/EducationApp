import sqlite3
import pytest
from bot.database import Database


def test_intent_and_signal_survive_process_reopen(tmp_path):
    path = tmp_path / 'restart.sqlite'
    db = Database(path)
    db.intent('order-1', 'candle-1', 1, '5', {'side': 'Buy'})
    db.close()
    db = Database(path)
    assert db.intents(active=True)[0]['id'] == 'order-1'
    with pytest.raises(sqlite3.IntegrityError):
        db.intent('order-2', 'candle-1', 2, '5', {})
    db.close()
