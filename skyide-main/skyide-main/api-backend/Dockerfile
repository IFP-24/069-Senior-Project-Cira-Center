# SkyIDE backend — Flask API served by gunicorn.
# Build context: api-backend/   →   docker compose builds this as the `backend` service.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# psycopg2-binary and bcrypt ship manylinux wheels — no compiler/libpq needed at build time.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Drop root.
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 5055

# Liveness via the app's own /health route (no curl in the image — use bundled python).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
    CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:5055/health').status==200 else 1)"]

# gunicorn is pinned in requirements.txt. app:app == module-level create_app() result.
CMD ["gunicorn", "--bind", "0.0.0.0:5055", "--workers", "3", "--timeout", "120", "app:app"]
