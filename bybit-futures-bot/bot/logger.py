import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import os
import time


class Redaction(logging.Filter):
    def filter(self, record):
        message = record.getMessage()
        for name in ('BYBIT_API_KEY', 'BYBIT_API_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'):
            value = os.getenv(name)
            if value:
                message = message.replace(value, '[REDACTED]')
        record.msg, record.args = message, ()
        return True


def setup(mode):
    Path('logs').mkdir(exist_ok=True)
    formatter = logging.Formatter('%(asctime)sZ %(levelname)s %(name)s %(message)s')
    formatter.converter = time.gmtime
    handlers = [logging.StreamHandler(), RotatingFileHandler(f'logs/{mode}.log', maxBytes=5_000_000, backupCount=5, encoding='utf-8')]
    for h in handlers:
        h.setFormatter(formatter)
        h.addFilter(Redaction())
    logging.basicConfig(level=logging.INFO, handlers=handlers, force=True)
    logging.getLogger('pybit').setLevel(logging.CRITICAL)
