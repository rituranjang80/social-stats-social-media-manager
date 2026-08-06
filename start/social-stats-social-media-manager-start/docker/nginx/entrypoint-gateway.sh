#!/usr/bin/env bash
set -euo pipefail

export NGINX_MODE="${NGINX_MODE:-dev}"
export BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-backend:8000}"
export FRONTEND_UPSTREAM="${FRONTEND_UPSTREAM:-frontend:3000}"

envsubst '${BACKEND_UPSTREAM} ${FRONTEND_UPSTREAM}' \
  < /etc/nginx/social-stats-templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

if [ "${NGINX_MODE}" = "prod" ]; then
  envsubst '${BACKEND_UPSTREAM}' \
    < /etc/nginx/social-stats-templates/spa-root.prod.template \
    >> /etc/nginx/conf.d/default.conf
else
  envsubst '${FRONTEND_UPSTREAM}' \
    < /etc/nginx/social-stats-templates/spa-root.dev.template \
    >> /etc/nginx/conf.d/default.conf
fi
