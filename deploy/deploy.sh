#!/usr/bin/env bash
# ==========================================================
# 🚀 MarsBoard - Script de Despliegue Automatizado
# ==========================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

DOMAIN="marsboard.iotsoluciones.cloud"
NGINX_CONF_SRC="$SCRIPT_DIR/nginx-marsboard.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/marsboard"
NGINX_ENABLED="/etc/nginx/sites-enabled/marsboard"

echo "=========================================================="
echo "🔴 Iniciando despliegue de MarsBoard ($DOMAIN)"
echo "=========================================================="

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está instalado." >&2
    exit 1
fi

# 2. Asegurar que exista .env.production en la raíz
cd "$ROOT_DIR"
if [ ! -f ".env.production" ]; then
    if [ -f "deploy/.env.production" ]; then
        echo "📄 Copiando deploy/.env.production a .env.production..."
        cp deploy/.env.production .env.production
    elif [ -f ".env.production.example" ]; then
        echo "📄 Creando .env.production a partir de .env.production.example..."
        cp .env.production.example .env.production
    fi
fi

# 3. Levantar los contenedores Docker
echo "📦 Construyendo y levantando contenedores (frontend:3000 + backend:4000)..."
docker compose down --remove-orphans || true
docker compose build --pull
docker compose up -d

echo "⏳ Esperando 5 segundos a que los servicios inicien..."
sleep 5

# 4. Comprobar salud local de los contenedores
echo "🔍 Verificando backend en localhost:4000..."
if curl -sf http://127.0.0.1:4000/health > /dev/null; then
    echo "✅ Backend responde correctamente."
else
    echo "⚠️ Advertencia: Backend aún no respondió en /health."
fi

echo "🔍 Verificando frontend en localhost:3000..."
if curl -sf http://127.0.0.1:3000 > /dev/null; then
    echo "✅ Frontend responde correctamente."
else
    echo "⚠️ Advertencia: Frontend aún iniciando o no respondió."
fi

# 5. Configurar Nginx y Certificado SSL (Let's Encrypt)
if command -v nginx &> /dev/null; then
    echo "🌐 Configurando Nginx para $DOMAIN..."

    if [ "$EUID" -eq 0 ]; then
        # Copiar y activar solo si no existe o para actualizar
        if [ ! -f "$NGINX_AVAILABLE" ]; then
            cp "$NGINX_CONF_SRC" "$NGINX_AVAILABLE"
            ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
        fi

        nginx -t
        systemctl reload nginx

        # Generar certificado SSL con Certbot si aún no existe
        if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
            echo "🔒 Solicitando certificado SSL gratuito a Let's Encrypt para $DOMAIN..."
            if command -v certbot &> /dev/null; then
                certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
                echo "✅ Certificado SSL generado e instalado con éxito en Nginx."
            else
                echo "⚠️ Certbot no está instalado en el sistema. Puedes instalarlo con:"
                echo "   sudo apt install -y certbot python3-certbot-nginx"
                echo "   sudo certbot --nginx -d $DOMAIN"
            fi
        else
            echo "✅ Certificado SSL para $DOMAIN ya existe en /etc/letsencrypt/live/$DOMAIN"
        fi

        systemctl reload nginx
        echo "✅ Nginx recargado correctamente."
    else
        echo "ℹ️ Para activar Nginx y SSL ejecuta como root o con sudo:"
        echo "   sudo cp $NGINX_CONF_SRC $NGINX_AVAILABLE"
        echo "   sudo ln -sf $NGINX_AVAILABLE $NGINX_ENABLED"
        echo "   sudo nginx -t && sudo systemctl reload nginx"
        echo "   sudo certbot --nginx -d $DOMAIN"
    fi
fi

echo "=========================================================="
echo "🎉 ¡Despliegue completado con éxito!"
echo "Acceso: https://$DOMAIN"
echo "=========================================================="
