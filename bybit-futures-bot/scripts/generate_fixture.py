"""Generate synthetic candles for smoke testing, NOT strategy evidence."""
from pathlib import Path
import argparse
import numpy as np
import pandas as pd


def generate(output, count=4000):
    rng = np.random.default_rng(42)
    increments = rng.normal(0, .002, count) + .0003 * np.sin(np.arange(count) / 150)
    close = 60000 * np.exp(np.cumsum(increments))
    opened = np.r_[60000, close[:-1]]
    frame = pd.DataFrame({'timestamp': 1735689600000 + np.arange(count) * 900000,
        'open': opened, 'high': np.maximum(opened, close) * 1.001,
        'low': np.minimum(opened, close) * .999, 'close': close,
        'volume': rng.uniform(1, 100, count)})
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(output, index=False)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', default='data/synthetic.csv')
    p.add_argument('--count', type=int, default=4000)
    a = p.parse_args()
    generate(a.output, a.count)
