"""EMA (first-price seed), Wilder indicators (initial SMA seed)."""
import numpy as np
import pandas as pd


def ema(series, period):
    return series.ewm(span=period, adjust=False, min_periods=period).mean()


def wilder(series, period):
    values = series.to_numpy(dtype=float)
    output = np.full(len(values), np.nan)
    valid = np.flatnonzero(np.isfinite(values))
    if len(valid) < period:
        return pd.Series(output, index=series.index)
    start = valid[0] + period - 1
    output[start] = np.mean(values[valid[0]:start + 1])
    for i in range(start + 1, len(values)):
        output[i] = (output[i - 1] * (period - 1) + values[i]) / period
    return pd.Series(output, index=series.index)


def rsi(series, period):
    delta = series.diff()
    gain = wilder(delta.clip(lower=0), period)
    loss = wilder(-delta.clip(upper=0), period)
    result = 100 - 100 / (1 + gain / loss.replace(0, np.nan))
    result = result.mask((loss == 0) & (gain > 0), 100)
    return result.mask((gain == 0) & (loss == 0), 50)


def atr(frame, period):
    previous = frame.close.shift(1)
    tr = pd.concat([frame.high - frame.low, (frame.high - previous).abs(),
                    (frame.low - previous).abs()], axis=1).max(axis=1)
    return wilder(tr, period)
