import pytest
from bot.exchange import Exchange, ExchangeError


def test_adapter_blocks_dry_run_writes(config):
    x = Exchange(config)
    try:
        with pytest.raises(PermissionError):
            x.call('place_order', write=True)
        assert x.http.max_retries == 1
        assert x.http.endpoint == 'https://api-testnet.bybit.com'
        assert x.http.api_key is None
    finally:
        x.close()


def test_retries_reads_not_writes(config, monkeypatch):
    x = Exchange(config)
    calls = []
    def fail(**kwargs):
        calls.append(1)
        raise TimeoutError()
    monkeypatch.setattr(x.http, 'get_tickers', fail)
    monkeypatch.setattr('bot.exchange.time.sleep', lambda *_: None)
    with pytest.raises(ExchangeError):
        x.call('get_tickers')
    assert len(calls) == 4
    calls.clear()
    x.private, config.enable_testnet_orders = True, True
    monkeypatch.setattr(x.http, 'place_order', fail)
    with pytest.raises(ExchangeError):
        x.call('place_order', write=True)
    assert len(calls) == 1
    x.close()


def test_endpoint_tamper_rejected(config):
    x = Exchange(config)
    x.http.endpoint = 'https://api.bybit.com'
    with pytest.raises(RuntimeError):
        x.call('get_tickers')
    x.close()


def test_adjusted_clock_is_signed(config, monkeypatch):
    x = Exchange(config)
    x.http.api_key = 'test-key'
    x.http.offset_ms = 250
    captured = []
    monkeypatch.setattr('bot.exchange.time.time', lambda: 1000)
    monkeypatch.setattr(x.http, '_auth', lambda payload, window, timestamp: captured.append(timestamp) or 'signature')
    headers = x.http._prepare_headers('qty=1', 5000)
    assert headers['X-BAPI-TIMESTAMP'] == '1000250'
    assert captured == [1000250]
    x.close()
