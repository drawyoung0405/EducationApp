"""Cost-aware protection prices for linear USDT contracts."""
from bot.models import D, TradePlan, rounded


def net_at(side, entry, exit_price, qty, fee, entry_fee=None):
    sign = D(1 if side == 'Buy' else -1)
    return sign * qty * (exit_price - entry) - (entry_fee if entry_fee is not None else qty * entry * fee) - qty * exit_price * fee


def protection(side, entry, qty, loss, target, c, instrument, entry_fee=None):
    sign = D(1 if side == 'Buy' else -1)
    entry_fee = qty * entry * c.fee_rate if entry_fee is None else entry_fee
    # Solve net = signed gross - entry fee - exit fee - funding reserve.
    # Exit fill is worse than trigger by configured slippage in either direction.
    slip_factor = D(1) - sign * c.slippage_bps / D(10000)
    def price(net):
        fill = (net + sign * qty * entry + entry_fee + c.funding_reserve) / (qty * (sign - c.fee_rate))
        return rounded(fill / slip_factor, instrument.tick, up=side == 'Buy')
    tp, sl = price(target), price(-loss)
    if not (sl < entry < tp if side == 'Buy' else tp < entry < sl) or min(tp, sl) <= 0:
        raise ValueError('Costs consume loss budget or invalid protection prices')
    risk = -net_at(side, entry, sl * slip_factor, qty, c.fee_rate, entry_fee) + c.funding_reserve
    estimated_target = net_at(side, entry, tp * slip_factor, qty, c.fee_rate, entry_fee) - c.funding_reserve
    if risk > loss or risk <= 0:
        raise ValueError('Rounded stop exceeds risk allowance')
    return TradePlan(qty, entry, tp, sl, risk, estimated_target)


def size_trade(side, price, equity, available, atr_value, c, instrument):
    cap = min(c.max_notional, c.max_margin * c.leverage,
              available / (D(1) / c.leverage + 2 * c.fee_rate + c.slippage_bps / 10000))
    loss, target = c.stop_loss, c.take_profit
    qty = cap / price
    if c.exit_model == 'atr':
        loss = min(c.stop_loss, equity * c.risk_fraction)
        distance = D(atr_value) * c.atr_stop_multiple
        if distance <= 0 or loss <= c.funding_reserve:
            raise ValueError('Invalid ATR or risk budget')
        qty = min(qty, (loss - c.funding_reserve) /
                  (distance + price * (2 * c.fee_rate + c.slippage_bps / 10000)))
        target = loss * c.reward_risk
    qty = rounded(min(qty, instrument.max_qty), instrument.step)
    if qty < instrument.min_qty or qty * price < instrument.min_notional:
        raise ValueError('Minimum order cannot fit size/risk constraints')
    return protection(side, price, qty, loss, target, c, instrument)


def liquidation_safe(side, stop, liquidation, mark, c):
    if liquidation <= 0:
        return False
    gap = mark * c.liquidation_buffer_fraction
    return stop > liquidation + gap if side == 'Buy' else stop < liquidation - gap
