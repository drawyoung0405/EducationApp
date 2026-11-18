"""Strict settings: environment overrides YAML, then defaults."""
from dataclasses import dataclass, fields, asdict
from decimal import Decimal
from pathlib import Path
import os
import yaml
from dotenv import load_dotenv


@dataclass
class Config:
    mode: str = 'dry_run'
    enable_testnet_orders: bool = False
    symbol: str = 'BTCUSDT'
    reference_capital: Decimal = Decimal('200')
    max_margin: Decimal = Decimal('100')
    max_notional: Decimal = Decimal('500')
    leverage: int = 5
    take_profit: Decimal = Decimal('5')
    stop_loss: Decimal = Decimal('5')
    exit_model: str = 'fixed'
    risk_fraction: Decimal = Decimal('.01')
    atr_stop_multiple: Decimal = Decimal('2')
    reward_risk: Decimal = Decimal('1.5')
    daily_loss: Decimal = Decimal('10')
    weekly_loss: Decimal = Decimal('15')
    max_daily_trades: int = 3
    max_consecutive_losses: int = 2
    cooldown_minutes: int = 60
    weekly_reset: str = 'manual'
    no_profit_replenishment: bool = False
    signal_minutes: int = 15
    trend_minutes: int = 60
    ema_fast: int = 9
    ema_slow: int = 21
    trend_fast: int = 50
    trend_slow: int = 200
    rsi_period: int = 14
    long_rsi_min: int = 55
    long_rsi_max: int = 70
    short_rsi_min: int = 30
    short_rsi_max: int = 45
    atr_period: int = 14
    max_atr_fraction: Decimal = Decimal('0')
    max_spread_bps: Decimal = Decimal('10')
    fee_rate: Decimal = Decimal('.00055')
    slippage_bps: Decimal = Decimal('5')
    funding_reserve: Decimal = Decimal('.10')
    liquidation_buffer_fraction: Decimal = Decimal('.02')
    trigger_by: str = 'MarkPrice'
    poll_seconds: int = 5
    protection_timeout: int = 15
    max_clock_skew_ms: int = 1000
    max_signal_age_seconds: int = 60
    data_dir: str = 'data'
    telegram_enabled: bool = False

    def validate(self):
        if self.mode not in {'dry_run', 'testnet', 'backtest'} or self.symbol != 'BTCUSDT':
            raise ValueError('Only BTCUSDT and dry_run/testnet/backtest are supported')
        if not 1 <= self.leverage <= 5:
            raise ValueError('Leverage must be between 1 and 5')
        if self.exit_model not in {'fixed', 'atr'} or self.weekly_reset not in {'manual', 'calendar'}:
            raise ValueError('Invalid exit model or weekly reset policy')
        if self.trigger_by not in {'MarkPrice', 'LastPrice'}:
            raise ValueError('Unsupported trigger price')
        for f in fields(self):
            value = getattr(self, f.name)
            if isinstance(value, Decimal) and (not value.is_finite() or value < 0):
                raise ValueError(f'{f.name} must be finite and nonnegative')
        for name in ('reference_capital', 'max_margin', 'max_notional', 'take_profit', 'stop_loss',
                     'daily_loss', 'weekly_loss', 'risk_fraction', 'atr_stop_multiple', 'reward_risk'):
            if getattr(self, name) <= 0:
                raise ValueError(f'{name} must be positive')
        if self.risk_fraction > Decimal('.025') or self.fee_rate >= Decimal('.01'):
            raise ValueError('Risk fraction or fee rate exceeds supported bound')
        if self.slippage_bps > 100 or self.liquidation_buffer_fraction >= 1:
            raise ValueError('Invalid slippage or liquidation buffer')
        if not 0 < self.ema_fast < self.ema_slow or not 0 < self.trend_fast < self.trend_slow:
            raise ValueError('EMA fast period must precede slow period')
        if max(self.ema_slow, self.trend_slow, self.rsi_period, self.atr_period) > 250:
            raise ValueError('Periods above 250 exceed live warm-up support')
        for name in ('rsi_period', 'atr_period', 'max_daily_trades', 'max_consecutive_losses',
                     'poll_seconds', 'protection_timeout', 'max_clock_skew_ms', 'max_signal_age_seconds'):
            if getattr(self, name) < 1:
                raise ValueError(f'{name} must be positive')
        if self.cooldown_minutes < 0:
            raise ValueError('Negative cooldown')
        if not (0 <= self.short_rsi_min < self.short_rsi_max <= 100 and
                0 <= self.long_rsi_min < self.long_rsi_max <= 100):
            raise ValueError('Invalid RSI thresholds')
        if self.signal_minutes not in {1, 3, 5, 15, 30, 60} or self.trend_minutes not in {60, 120, 240}:
            raise ValueError('Unsupported timeframes')
        if self.trend_minutes % self.signal_minutes:
            raise ValueError('Trend timeframe must be a multiple of signal timeframe')
        return self

    def serializable(self):
        return {k: str(v) if isinstance(v, Decimal) else v for k, v in asdict(self).items()}


def load_config(path='config.yaml', mode=None):
    load_dotenv()
    raw = yaml.safe_load(Path(path).read_text(encoding='utf-8')) or {}
    defaults = Config()
    known = {f.name for f in fields(defaults)}
    if not isinstance(raw, dict) or set(raw) - known:
        raise ValueError('Unknown configuration fields')
    for f in fields(defaults):
        value = os.getenv('BOT_' + f.name.upper(), raw.get(f.name, getattr(defaults, f.name)))
        kind = type(getattr(defaults, f.name))
        if kind is bool:
            if str(value).lower() not in {'true', 'false'}:
                raise ValueError(f'{f.name}: use true or false')
            value = str(value).lower() == 'true'
        else:
            value = kind(str(value))
        setattr(defaults, f.name, value)
    if mode:
        defaults.mode = mode
    return defaults.validate()
