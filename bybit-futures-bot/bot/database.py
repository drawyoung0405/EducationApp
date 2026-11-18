"""Durable intent journal and exact-decimal ledger (schema v1)."""
import json
import sqlite3
from pathlib import Path
from bot.models import D


class Database:
    def __init__(self, path):
        if str(path) != ':memory:':
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(path), timeout=10)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute('PRAGMA journal_mode=WAL')
        self.conn.execute('PRAGMA synchronous=FULL')
        version = self.conn.execute('PRAGMA user_version').fetchone()[0]
        if version not in (0, 1):
            raise RuntimeError('Unsupported database schema')
        self.conn.executescript('''
        CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS intents(
          id TEXT PRIMARY KEY, signal TEXT UNIQUE NOT NULL, status TEXT NOT NULL,
          created INTEGER NOT NULL, risk TEXT NOT NULL, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS cash(
          id TEXT PRIMARY KEY, ts INTEGER NOT NULL, net TEXT NOT NULL,
          fee TEXT NOT NULL, funding TEXT NOT NULL, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS executions(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS trades(
          id TEXT PRIMARY KEY, opened INTEGER NOT NULL, closed INTEGER NOT NULL,
          net TEXT NOT NULL, payload TEXT NOT NULL);
        PRAGMA user_version=1;
        ''')

    def get(self, key, default=None):
        row = self.conn.execute('SELECT value FROM state WHERE key=?', (key,)).fetchone()
        return json.loads(row[0]) if row else default

    def set(self, key, value):
        with self.conn:
            self.conn.execute('INSERT OR REPLACE INTO state VALUES (?,?)', (key, json.dumps(value, default=str)))

    def intent(self, identifier, signal, now, risk, payload):
        with self.conn:
            self.conn.execute('INSERT INTO intents VALUES (?,?,?,?,?,?)',
                              (identifier, signal, 'ENTRY_PENDING', now, str(risk), json.dumps(payload, default=str)))

    def update_intent(self, identifier, status, payload):
        with self.conn:
            self.conn.execute('UPDATE intents SET status=?,payload=? WHERE id=?',
                              (status, json.dumps(payload, default=str), identifier))

    def intents(self, active=False):
        sql = 'SELECT * FROM intents'
        if active:
            sql += " WHERE status NOT IN ('CLOSED','REJECTED')"
        return [dict(r) | {'payload': json.loads(r['payload'])} for r in self.conn.execute(sql)]

    def seen(self, signal):
        return self.conn.execute('SELECT 1 FROM intents WHERE signal=?', (signal,)).fetchone() is not None

    def cash(self, identifier, now, net, fee=0, funding=0, payload=None):
        with self.conn:
            self.conn.execute('INSERT OR IGNORE INTO cash VALUES (?,?,?,?,?,?)',
                              (identifier, now, str(net), str(fee), str(funding), json.dumps(payload or {}, default=str)))

    def period(self, start, end, losses_only=False):
        vals = [D(r[0]) for r in self.conn.execute('SELECT net FROM cash WHERE ts>=? AND ts<?', (start, end))]
        return sum((min(v, D(0)) if losses_only else v for v in vals), D(0))

    def trade(self, identifier, opened, closed, net, payload):
        with self.conn:
            self.conn.execute('INSERT OR IGNORE INTO trades VALUES (?,?,?,?,?)',
                              (identifier, opened, closed, str(net), json.dumps(payload, default=str)))

    def trades(self):
        return [dict(r) | {'payload': json.loads(r['payload'])}
                for r in self.conn.execute('SELECT * FROM trades ORDER BY closed,id')]

    def execution(self, row):
        with self.conn:
            self.conn.execute('INSERT OR IGNORE INTO executions VALUES (?,?)',
                              (row['execId'], json.dumps(row)))

    def close(self):
        self.conn.close()
