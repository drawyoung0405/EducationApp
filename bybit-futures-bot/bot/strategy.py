import pandas as pd
from bot.indicators import ema, rsi, atr
from bot.models import Signal


def features(entry, trend, config):
    e, t = entry.copy(), trend.copy()
    e['fast'] = ema(e.close, config.ema_fast)
    e['slow'] = ema(e.close, config.ema_slow)
    e['rsi'] = rsi(e.close, config.rsi_period)
    e['atr'] = atr(e, config.atr_period)
    t['trend_fast'] = ema(t.close, config.trend_fast)
    t['trend_slow'] = ema(t.close, config.trend_slow)
    # Both keys are close times: an hourly value is unavailable until that hour ends.
    return pd.merge_asof(e.sort_values('close_time'),
                         t[['close_time', 'trend_fast', 'trend_slow']].sort_values('close_time'),
                         on='close_time', direction='backward')


def signal_at(frame, index, c):
    row = frame.iloc[index]
    names = ['fast', 'slow', 'rsi', 'atr', 'trend_fast', 'trend_slow']
    values = {k: float(row[k]) for k in names}
    side = None
    if index > 0 and all(pd.notna(v) for v in values.values()):
        prev = frame.iloc[index - 1]
        if (row.trend_fast > row.trend_slow and prev.fast <= prev.slow and row.fast > row.slow
                and c.long_rsi_min < row.rsi < c.long_rsi_max):
            side = 'Buy'
        elif (row.trend_fast < row.trend_slow and prev.fast >= prev.slow and row.fast < row.slow
              and c.short_rsi_min < row.rsi < c.short_rsi_max):
            side = 'Sell'
    return Signal(side, int(row.close_time), values)
