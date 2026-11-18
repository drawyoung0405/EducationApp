import logging
import os
import requests


def notify(config, message):
    if not config.telegram_enabled:
        return
    token, chat = os.getenv('TELEGRAM_BOT_TOKEN'), os.getenv('TELEGRAM_CHAT_ID')
    if not token or not chat:
        logging.warning('Telegram enabled but credentials missing')
        return
    try:
        response = requests.post(f'https://api.telegram.org/bot{token}/sendMessage',
                                 json={'chat_id': chat, 'text': message}, timeout=5)
        response.raise_for_status()
    except requests.RequestException:
        logging.warning('Telegram delivery failed; trading protection continues')
