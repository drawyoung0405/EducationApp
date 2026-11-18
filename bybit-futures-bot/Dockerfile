FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY bot ./bot
COPY backtest ./backtest
COPY main.py config.yaml ./
RUN useradd -m bot && mkdir -p data logs reports && chown -R bot:bot /app
USER bot
ENTRYPOINT ["python", "main.py"]
CMD ["run"]
