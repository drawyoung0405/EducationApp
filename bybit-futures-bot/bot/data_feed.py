from pathlib import Path
import numpy as np
import pandas as pd


def validate(frame, minutes):
    required = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
    if not set(required) <= set(frame):
        raise ValueError('CSV requires timestamp (UTC epoch ms), open, high, low, close, volume')
    f = frame[required].copy().sort_values('timestamp').reset_index(drop=True)
    for col in required:
        f[col] = pd.to_numeric(f[col], errors='raise')
    if not np.isfinite(f.to_numpy()).all() or f.empty:
        raise ValueError('Empty or nonfinite candles')
    step = minutes * 60000
    if (f.timestamp % step != 0).any() or (f.timestamp.diff().dropna() != step).any():
        raise ValueError('Unaligned, duplicate, or missing candles')
    if ((f[['open', 'high', 'low', 'close']] <= 0).any().any() or (f.volume < 0).any()
            or (f.high < f[['open', 'close', 'low']].max(axis=1)).any()
            or (f.low > f[['open', 'close', 'high']].min(axis=1)).any()):
        raise ValueError('Invalid OHLC values')
    f['timestamp'] = f.timestamp.astype('int64')
    f['close_time'] = f.timestamp + step
    return f


def candles(exchange, minutes, limit=1000, end=None):
    params = dict(category='linear', symbol=exchange.c.symbol, interval=str(minutes), limit=limit)
    if end is not None:
        params['end'] = int(end)
    rows = exchange.call('get_kline', **params)['result']['list']
    f = pd.DataFrame([r[:6] for r in rows], columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
    f = validate(f, minutes)
    return f[f.close_time <= exchange.now()].reset_index(drop=True)


def live_frames(exchange):
    c = exchange.c
    entry, trend = candles(exchange, c.signal_minutes), candles(exchange, c.trend_minutes)
    now = exchange.now()
    if entry.empty or trend.empty or now - int(entry.iloc[-1].close_time) > c.signal_minutes * 60000 + 15000:
        raise ValueError('Stale entry candles')
    if now - int(trend.iloc[-1].close_time) > c.trend_minutes * 60000 + 15000:
        raise ValueError('Stale trend candles')
    return entry, trend


def aggregate(frame, minutes, source_minutes):
    f = frame.copy()
    f['bucket'] = f.timestamp // (minutes * 60000) * (minutes * 60000)
    grouped = f.groupby('bucket').agg(open=('open', 'first'), high=('high', 'max'),
        low=('low', 'min'), close=('close', 'last'), volume=('volume', 'sum'), count=('timestamp', 'size'))
    grouped = grouped[grouped['count'] == minutes // source_minutes].drop(columns='count')
    return validate(grouped.rename_axis('timestamp').reset_index(), minutes)


def download(exchange, start, end, output):
    parts, cursor = [], end - 1
    while cursor >= start:
        frame = candles(exchange, exchange.c.signal_minutes, end=cursor)
        if frame.empty:
            break
        parts.append(frame)
        next_cursor = int(frame.timestamp.min()) - 1
        if next_cursor >= cursor:
            raise RuntimeError('Historical pagination did not advance')
        cursor = next_cursor
    if not parts:
        raise ValueError('No historical data')
    merged = pd.concat(parts).drop_duplicates('timestamp').sort_values('timestamp')
    merged = validate(merged[(merged.timestamp >= start) & (merged.close_time <= end)], exchange.c.signal_minutes)
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    merged.drop(columns='close_time').to_csv(output, index=False)
    return len(merged)
