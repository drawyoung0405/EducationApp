from dataclasses import dataclass
from decimal import Decimal, ROUND_FLOOR, ROUND_CEILING


def D(value):
    return Decimal(str(value))


def rounded(value, step, up=False):
    return (value / step).to_integral_value(rounding=ROUND_CEILING if up else ROUND_FLOOR) * step


@dataclass(frozen=True)
class Instrument:
    tick: Decimal
    step: Decimal
    min_qty: Decimal
    min_notional: Decimal
    max_qty: Decimal


@dataclass(frozen=True)
class Signal:
    side: str | None
    candle: int
    values: dict


@dataclass(frozen=True)
class TradePlan:
    qty: Decimal
    entry: Decimal
    tp: Decimal
    sl: Decimal
    risk: Decimal
    target: Decimal
