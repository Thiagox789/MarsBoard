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

# 1. Verificar Docker y Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está instalado." >&2
    exit 1
fi

# 2. Levantar los contenedores Docker desde la raíz del proyecto
echo "📦 Construyendo y levantando contenedores (frontend:3000 + backend:4000)..."
cd "$ROOT_DIR"
docker compose down --remove-orphans || true
docker compose build --pull
docker compose up -d

echo "⏳ Esperando 5 segundos a que los servicios inicien..."
sleep 5

# 3. Comprobar salud local de los contenedores
echo "🔍 Verificando backend en localhost:4000..."
if curl -sf http://127.0.0.1:4000/health > /dev/null; then
    echo "✅ Backend responde correctamente."
else
    echo "⚠️ Advertencia: Backend no respondió en /health. Revisa los logs con: docker compose logs marsboard-backend"
fi

echo "🔍 Verificando frontend en localhost:3000..."
if curl -sf http://127.0.0.1:3000 > /dev/null; then
    echo "✅ Frontend responde correctamente."
else
    echo "⚠️ Advertencia: Frontend aún iniciando o no respondió. Revisa los logs con: docker compose logs marsboard-frontend"
fi

# 4. Configurar Nginx en el host si existe Nginx
if command -v nginx &> /dev/null; then
    echo "🌐 Configurando Nginx para $DOMAIN..."
    
    # Copiar configuración si no existe o se ejecuta con sudo
    if [ "$EUID" -eq 0 ]; then
        cp "$NGINX_CONF_SRC" "$NGINX_AVAILABLE"
        ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
        
        # Validar configuración
        nginx -t
        
        # Certbot si aún no hay certificado SSL
        if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
            echo "🔒 Generando certificado SSL con Certbot..."
            if command -v certbot &> /dev/null; then
                certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || true
            else
                echo "⚠️ certbot no está instalado. Instálalo con: sudo apt install -y certbot python3-certbot-nginx"
            fi
        fi
        
        systemctl reload nginx
        echo "✅ Nginx recargado correctamente."
    else
        echo "ℹ️ Para activar Nginx ejecuta con permisos sudo:"
        echo "   sudo cp $NGINX_CONF_SRC $NGINX_AVAILABLE"
        echo "   sudo ln -sf $NGINX_AVAILABLE $NGINX_ENABLED"
        echo "   sudo certbot --nginx -d $DOMAIN"
        echo "   sudo nginx -t && sudo systemctl reload nginx"
    fi
fi

echo "=========================================================="
echo "🎉 ¡Despliegue completado con éxito!"
echo "Acceso: https://$DOMAIN"
echo "=========================================================="
