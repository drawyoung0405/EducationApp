from dataclasses import replace
import hashlib
import json
from pathlib import Path
import pandas as pd
from bot.database import Database
from bot.data_feed import validate, aggregate
from bot.models import D, Instrument
from bot.risk_manager import RiskManager
from bot.simulation import Simulator
from bot.strategy import features, signal_at
from bot.position_manager import size_trade, net_at
from backtest.reports import metrics, save_report


def run_period(frame, c, start, end, instrument, spread_bps, funding=None):
    db = Database(':memory:')
    risk = RiskManager(db, c)
    sim = Simulator(db, c, risk)
    curve = []
    for index in range(start, end):
        row = frame.iloc[index]
        now = int(row.timestamp)
        equity = c.reference_capital + db.period(0, now + 1)
        sig = signal_at(frame, index - 1, c) if index else None
        if sig and sig.side and not db.intents(active=True):
            allowed_filter = not c.max_spread_bps or D(spread_bps) <= c.max_spread_bps
            allowed_filter &= not c.max_atr_fraction or D(sig.values['atr']) / D(row.open) <= c.max_atr_fraction
            if allowed_filter:
                entry = D(row.open) * (1 + D(1 if sig.side == 'Buy' else -1) *
                                      (c.slippage_bps + D(spread_bps) / 2) / 10000)
                try:
                    pricing = replace(c, slippage_bps=c.slippage_bps + D(spread_bps) / 2)
                    plan = size_trade(sig.side, entry, equity, equity, sig.values['atr'], pricing, instrument)
                    sim.enter(sig, plan, now, 'uptrend' if sig.values['trend_fast'] > sig.values['trend_slow'] else 'downtrend')
                except ValueError:
                    pass  # An infeasible hypothetical trade is skipped, not executed.
        if funding is not None:
            for f in funding[(funding.timestamp >= now) & (funding.timestamp < int(row.close_time))].itertuples():
                sim.funding(int(f.timestamp), f.rate, f.mark_price)
        sim.bar(row, D(spread_bps) / 2)
        value = c.reference_capital + db.period(0, int(row.close_time) + 1)
        active = db.intents(active=True)
        if active:
            p = active[0]['payload']
            # Cash ledger already contains entry fees: MTM adds gross PnL and estimated exit fee only.
            value += net_at(p['side'], D(p['entry']), D(row.close), D(p['qty']), c.fee_rate, D(0))
        curve.append({'timestamp': int(row.close_time), 'equity': str(value)})
    active = db.intents(active=True)
    if active:
        row = frame.iloc[end - 1]
        buy = active[0]['payload']['side'] == 'Buy'
        price = D(row.close) * (1 + D(-1 if buy else 1) * (c.slippage_bps + D(spread_bps) / 2) / 10000)
        sim.close(price, int(row.close_time), 'period_boundary')
        curve[-1]['equity'] = str(c.reference_capital + db.period(0, int(row.close_time) + 1))
    trades = db.trades()
    result = metrics(trades, curve, c.reference_capital)
    db.close()
    return result, trades, curve


def backtest(csv, c, output, instrument, spread_bps=2, funding_csv=None, allow_mark_approximation=False):
    if c.trigger_by == 'MarkPrice' and not allow_mark_approximation:
        raise ValueError('Last-price OHLC cannot accurately test MarkPrice stops; use --allow-mark-approximation explicitly')
    raw = validate(pd.read_csv(csv), c.signal_minutes)
    trend = aggregate(raw, c.trend_minutes, c.signal_minutes)
    frame = features(raw, trend, c)
    warm = max(c.trend_slow * 3 * c.trend_minutes // c.signal_minutes, c.ema_slow * 3)
    if len(frame) < warm + 100:
        raise ValueError(f'Need at least {warm + 100} candles including warm-up')
    funding = None
    if funding_csv:
        funding = pd.read_csv(funding_csv).sort_values('timestamp')
        if not {'timestamp', 'rate', 'mark_price'} <= set(funding) or funding.timestamp.duplicated().any():
            raise ValueError('Funding CSV requires unique timestamp, rate, mark_price')
        for r in funding.itertuples():
            if not D(r.rate).is_finite() or not D(r.mark_price).is_finite() or D(r.mark_price) <= 0:
                raise ValueError('Invalid funding data')
    n = len(frame) - warm
    bounds = [warm, warm + int(n * .6), warm + int(n * .8), len(frame)]
    report = {'data_sha256': hashlib.sha256(Path(csv).read_bytes()).hexdigest(), 'config': c.serializable(),
              'funding_included': funding is not None, 'trigger_approximation': c.trigger_by == 'MarkPrice',
              'spread_bps': spread_bps, 'instrument': {k: str(v) for k, v in vars(instrument).items()},
              'warnings': ['Testnet candles are not representative evidence of real-market profitability.',
                           'OHLC execution uses stop-first ambiguity and close-time exit accounting.',
                           'Funding CSV completeness must be verified by the researcher.'], 'periods': {}}
    all_trades, all_curve = [], []
    for name, start, end in zip(['training', 'validation', 'out_of_sample'], bounds[:-1], bounds[1:]):
        stats, trades, curve = run_period(frame, c, start, end, instrument, spread_bps, funding)
        stats.update(start=int(frame.iloc[start].timestamp), end=int(frame.iloc[end - 1].close_time))
        report['periods'][name] = stats
        for row in curve:
            row['period'] = name
        for t in trades:
            t['payload']['period'] = name
        all_trades.extend(trades)
        all_curve.extend(curve)
    stressed = replace(c, slippage_bps=c.slippage_bps * 2, fee_rate=c.fee_rate * 2)
    report['out_of_sample_double_costs'] = run_period(frame, stressed, bounds[2], bounds[3], instrument, spread_bps * 2, funding)[0]
    report['walk_forward'] = []
    # Fixed parameters: sequential evaluation folds, no optimization on held-out data.
    for a, b in zip([warm + int(n * v / 4) for v in range(4)], [warm + int(n * v / 4) for v in range(1, 5)]):
        report['walk_forward'].append(run_period(frame, c, a, b, instrument, spread_bps, funding)[0])
    save_report(output, report, all_trades, all_curve)
    return report
