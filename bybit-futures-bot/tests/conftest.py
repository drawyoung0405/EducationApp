import pytest
from bot.config import Config
from bot.database import Database
from bot.models import D, Instrument


@pytest.fixture
def config():
    return Config()


@pytest.fixture
def db():
    db = Database(':memory:')
    yield db
    db.close()


@pytest.fixture
def instrument():
    return Instrument(D('.1'), D('.001'), D('.001'), D('5'), D('100'))
