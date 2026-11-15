#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

DOMAIN="marsboard.iotsoluciones.cloud"
NGINX_CONF_SRC="$SCRIPT_DIR/nginx-marsboard.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/marsboard"
NGINX_ENABLED="/etc/nginx/sites-enabled/marsboard"

cd "$ROOT_DIR"
if [ ! -f ".env.production" ]; then
  if [ -f "deploy/.env.production" ]; then
    cp deploy/.env.production .env.production
  elif [ -f ".env.production.example" ]; then
    cp .env.production.example .env.production
  fi
fi

docker compose down --remove-orphans || true
docker compose build --pull
docker compose up -d

sleep 5

curl -sf http://127.0.0.1:4000/health >/dev/null && echo "Backend OK" || echo "Backend not ready"
curl -sf http://127.0.0.1:3000 >/dev/null && echo "Frontend OK" || echo "Frontend not ready"

if command -v nginx >/dev/null; then
  if [ "$EUID" -eq 0 ]; then
    if [ ! -f "$NGINX_AVAILABLE" ]; then
      cp "$NGINX_CONF_SRC" "$NGINX_AVAILABLE"
      ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    fi
    nginx -t
    systemctl reload nginx
    if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ] && command -v certbot >/dev/null; then
      certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
    fi
    systemctl reload nginx
  fi
fi
