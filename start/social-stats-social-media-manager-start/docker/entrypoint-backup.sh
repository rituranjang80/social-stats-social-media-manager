#!/usr/bin/env bash
set -euo pipefail

# Strip CR/LF from env (Windows .env often has CRLF)
strip_env() { printf '%s' "${1:-}" | tr -d '\r\n'; }

CRON_EXPR="$(strip_env "${BACKUP_CRON:-0 2 * * *}")"
RUN_ONCE="$(strip_env "${BACKUP_RUN_ONCE:-false}")"
DRY_RUN="$(strip_env "${BACKUP_DRY_RUN:-false}")"

run_backup() {
  echo "[backup] $(date -Is) starting"
  if [[ "${DRY_RUN,,}" == "true" || "${DRY_RUN}" == "1" ]]; then
    python3 /app/scripts/run_backup.py --dry-run
  else
    python3 /app/scripts/run_backup.py
  fi
  echo "[backup] $(date -Is) finished"
}

if [[ "${RUN_ONCE,,}" == "true" || "${RUN_ONCE}" == "1" ]]; then
  run_backup
  exit $?
fi

if [[ "${BACKUP_ENABLED,,}" == "false" || "${BACKUP_ENABLED}" == "0" ]]; then
  echo "[backup] BACKUP_ENABLED=false — idle"
  exec sleep infinity
fi

cat > /usr/local/bin/run_backup_job <<'EOS'
#!/bin/bash
set -euo pipefail
exec >> /var/log/backup.log 2>&1
echo "[backup] $(date -Is) cron job starting"
python3 /app/scripts/run_backup.py
echo "[backup] $(date -Is) cron job done"
EOS
chmod +x /usr/local/bin/run_backup_job
sed -i 's/\r$//' /usr/local/bin/run_backup_job

# Debian cron.d format (requires user column — runs via /bin/sh -c for scripts)
cat > /etc/cron.d/social-stats-backup <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
${CRON_EXPR} root /usr/local/bin/run_backup_job
EOF
chmod 0644 /etc/cron.d/social-stats-backup
sed -i 's/\r$//' /etc/cron.d/social-stats-backup

touch /var/log/backup.log
echo "[backup] cron schedule (UTC): ${CRON_EXPR}"

if [[ "${BACKUP_RUN_ON_START,,}" == "true" || "${BACKUP_RUN_ON_START}" == "1" ]]; then
  run_backup >> /var/log/backup.log 2>&1 || true
fi

exec cron -f
