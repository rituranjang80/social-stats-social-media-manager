#!/usr/bin/env bash
set -euo pipefail

cd /app/frontend

if [ ! -f package.json ]; then
  echo "Frontend source not mounted at /app/frontend (check SOURCE_REL in paths.env)" >&2
  exit 1
fi

if [ ! -d node_modules ] || [ "${NPM_INSTALL:-always}" = "always" ]; then
  npm install
fi

export HOST=0.0.0.0
export PORT=3000
exec npm start
