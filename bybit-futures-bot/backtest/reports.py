import json
from pathlib import Path
import pandas as pd


def metrics(trades, curve, capital):
    pnl = [float(t['net']) for t in trades]
    wins, losses = [v for v in pnl if v > 0], [v for v in pnl if v < 0]
    peak, dd, dd_pct = float(capital), 0., 0.
    for row in curve:
        equity = float(row['equity'])
        peak = max(peak, equity)
        dd = max(dd, peak - equity)
        dd_pct = max(dd_pct, (peak - equity) / peak if peak else 0)
    streak = longest = 0
    for value in pnl:
        streak = streak + 1 if value < 0 else 0
        longest = max(streak, longest)
    regime = {}
    for t in trades:
        key = t['payload'].get('regime', 'unknown')
        r = regime.setdefault(key, {'trades': 0, 'net': 0.})
        r['trades'] += 1
        r['net'] += float(t['net'])
    return dict(total_trades=len(pnl), win_rate=len(wins) / len(pnl) if pnl else 0,
        net_profit=sum(pnl), profit_factor=sum(wins) / -sum(losses) if losses else None,
        average_win=sum(wins) / len(wins) if wins else 0,
        average_loss=sum(losses) / len(losses) if losses else 0,
        maximum_drawdown=dd, maximum_drawdown_fraction=dd_pct, longest_losing_streak=longest,
        fees=sum(float(t['payload'].get('fees', 0)) for t in trades),
        funding=sum(float(t['payload'].get('funding', 0)) for t in trades),
        expected_value=sum(pnl) / len(pnl) if pnl else 0, by_regime=regime)


def save_report(output, report, trades, curve):
    path = Path(output)
    path.mkdir(parents=True, exist_ok=True)
    (path / 'summary.json').write_text(json.dumps(report, indent=2, default=str, allow_nan=False), encoding='utf-8')
    pd.DataFrame([t['payload'] | dict(id=t['id'], opened=t['opened'], closed=t['closed']) for t in trades]).to_csv(path / 'trades.csv', index=False)
    pd.DataFrame(curve).to_csv(path / 'equity.csv', index=False)
