FROM python:3.12-slim

ARG APP_UID=1000
ARG APP_GID=1000

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app/backend"

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN pip install --no-cache-dir uv \
    && uv sync --frozen --no-dev \
    && if ! getent group "${APP_GID}" >/dev/null; then groupadd --gid "${APP_GID}" appgroup; fi \
    && if ! getent passwd "${APP_UID}" >/dev/null; then useradd --uid "${APP_UID}" --gid "${APP_GID}" --create-home --home-dir /home/appuser appuser; fi \
    && chown -R "${APP_UID}:${APP_GID}" /app

COPY alembic.ini ./
COPY backend /app/backend

RUN chown -R "${APP_UID}:${APP_GID}" /app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=3)"

USER ${APP_UID}:${APP_GID}

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
