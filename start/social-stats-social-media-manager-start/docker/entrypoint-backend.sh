#!/usr/bin/env bash
set -euo pipefail

cd /app/backend

wait_for_tcp() {
  local host="$1" port="$2" label="$3"
  local tries="${4:-60}"
  local i=0
  while ! bash -c "exec 3<>/dev/tcp/${host}/${port}" 2>/dev/null; do
    i=$((i + 1))
    if [ "$i" -ge "$tries" ]; then
      echo "Timed out waiting for ${label} at ${host}:${port}" >&2
      exit 1
    fi
    sleep 1
  done
}

if [ -n "${DB_NAME:-}" ]; then
  wait_for_tcp "${DB_HOST:-postgres}" "${DB_PORT:-5432}" "PostgreSQL"
fi

if [ -n "${CELERY_BROKER_URL:-}" ]; then
  wait_for_tcp redis 6379 "Redis"
fi

mkdir -p /data/media /data/staticfiles

python manage.py migrate --noinput

RUN_MODE="${APP_MODE:-dev}"
USE_DEBUGPY="${ENABLE_DEBUGPY:-false}"
WAIT_DBG="${WAIT_FOR_DEBUGGER:-false}"

run_daphne() {
  exec daphne -b 0.0.0.0 -p 8000 dashboard.asgi:application
}

run_runserver() {
  exec python manage.py runserver 0.0.0.0:8000
}

if [ "${USE_DEBUGPY}" = "true" ]; then
  pip install -q debugpy
  DBG_ARGS=(--listen "0.0.0.0:${DEBUGPY_PORT:-5678}")
  if [ "${WAIT_DBG}" = "true" ]; then
    DBG_ARGS+=(--wait-for-client)
  fi
  if [ "${RUN_MODE}" = "prod" ]; then
    exec python -m debugpy "${DBG_ARGS[@]}" -m daphne -b 0.0.0.0 -p 8000 dashboard.asgi:application
  else
    exec python -m debugpy "${DBG_ARGS[@]}" manage.py runserver 0.0.0.0:8000
  fi
fi

if [ "${RUN_MODE}" = "prod" ]; then
  run_daphne
else
  run_runserver
fi
