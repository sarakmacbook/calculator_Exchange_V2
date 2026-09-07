#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

APP_NAME="iqd-usdt-calc"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── FIX #2: Root check ─────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root (use sudo).${NC}"
    exit 1
fi

# ─── FIX #3: Verify index.html exists ───────────────────────────────
if [ ! -f "$SCRIPT_DIR/index.html" ]; then
    echo -e "${RED}❌ index.html not found in $SCRIPT_DIR${NC}"
    echo -e "${YELLOW}   Make sure index.html is in the same directory as install.sh${NC}"
    exit 1
fi

echo -e "${GREEN}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║     P2P Exchange Calculator Installer     ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo -e "${CYAN}🌐 Step 1: Domain (optional)${NC}"
echo -e "   Leave empty to use IP address only"
read -rp "   Enter domain [e.g., calc.yoursite.com]: " DOMAIN
DOMAIN="${DOMAIN:-}"

echo ""
echo -e "${CYAN}🔌 Step 2: Port${NC}"
echo -e "   80  = HTTP (default)"
echo -e "   443 = HTTPS (requires SSL setup)"
read -rp "   Enter port [80]: " PORT
PORT="${PORT:-80}"

# ─── Validate port is numeric ───────────────────────────────────────
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo -e "${RED}❌ Invalid port: $PORT${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}⚙️  Step 3: Web Server${NC}"
echo -e "   1) Nginx     - Fast, popular, default"
echo -e "   2) Caddy     - Auto HTTPS, easy config"
echo -e "   3) Docker    - Containerized, portable"
read -rp "   Choose [1/2/3] (default: 1): " SERVICE_CHOICE
SERVICE_CHOICE="${SERVICE_CHOICE:-1}"

case "$SERVICE_CHOICE" in
  2) SERVICE="caddy" ;;
  3) SERVICE="docker" ;;
  *) SERVICE="nginx" ;;
esac

echo ""
echo -e "${CYAN}📁 Step 4: Where to store files${NC}"
read -rp "   Enter path [/var/www/$APP_NAME]: " INSTALL_DIR
INSTALL_DIR="${INSTALL_DIR:-/var/www/$APP_NAME}"

# ─── FIX #6: Ask for email if domain + SSL ──────────────────────────
CERTBOT_EMAIL=""
if [ -n "$DOMAIN" ] && ([ "$PORT" = "443" ] || [ "$PORT" = "80" ]); then
    echo ""
    echo -e "${CYAN}📧 Step 5: SSL Email (for Let's Encrypt)${NC}"
    echo -e "   Required for SSL certificate registration"
    read -rp "   Enter email: " CERTBOT_EMAIL
fi

echo ""
echo -e "${YELLOW}📋 Installation Summary:${NC}"
echo -e "   Domain:    ${DOMAIN:-(IP only)}"
echo -e "   Port:      $PORT"
echo -e "   Service:   $SERVICE"
echo -e "   Files:     $INSTALL_DIR"
[ -n "$CERTBOT_EMAIL" ] && echo -e "   SSL Email: $CERTBOT_EMAIL"
echo ""
read -rp "   Proceed? [Y/n]: " CONFIRM
CONFIRM="${CONFIRM:-Y}"
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
apt-get update -qq

if [ "$SERVICE" = "nginx" ]; then
    if ! command -v nginx &> /dev/null; then
        apt-get install -y -qq nginx
    fi
elif [ "$SERVICE" = "caddy" ]; then
    if ! command -v caddy &> /dev/null; then
        apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
        apt-get update -qq
        apt-get install -y -qq caddy
    fi
elif [ "$SERVICE" = "docker" ]; then
    if ! command -v docker &> /dev/null; then
        apt-get install -y -qq ca-certificates curl gnupg
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg' | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list
        apt-get update -qq
        apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    fi
fi

echo -e "${YELLOW}📁 Setting up files...${NC}"
mkdir -p "$INSTALL_DIR"
cp "$SCRIPT_DIR/index.html" "$INSTALL_DIR/"
chown -R www-data:www-data "$INSTALL_DIR" 2>/dev/null || chown -R root:root "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"

echo -e "${YELLOW}⚙️  Configuring $SERVICE...${NC}"

if [ "$SERVICE" = "nginx" ]; then
    NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
    if [ -n "$DOMAIN" ]; then SERVER_NAME="$DOMAIN"; else SERVER_NAME="_"; fi
    cat > "$NGINX_CONF" << EOF
server {
    listen $PORT;
    server_name $SERVER_NAME;
    root $INSTALL_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    gzip on;
    gzip_types text/html text/css application/javascript application/json;

    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # ─── FIX #4: nginx -t with error handling ─────────────────────
    if ! nginx -t; then
        echo -e "${RED}❌ Nginx config test failed. Restoring default...${NC}"
        rm -f /etc/nginx/sites-enabled/$APP_NAME
        nginx -t && systemctl reload nginx
        exit 1
    fi

    systemctl reload nginx
    systemctl enable nginx

    if [ -n "$DOMAIN" ] && ([ "$PORT" = "443" ] || [ "$PORT" = "80" ]); then
        if command -v certbot &> /dev/null && [ -n "$CERTBOT_EMAIL" ]; then
            echo -e "${YELLOW}🔒 Setting up SSL with Certbot...${NC}"
            certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" || true
        else
            echo -e "${CYAN}💡 To enable SSL later, run:${NC}"
            echo -e "   apt install certbot python3-certbot-nginx"
            echo -e "   certbot --nginx -d $DOMAIN"
        fi
    fi

    # ─── FIX #1: Double quotes around PORT for ufw ────────────────
    if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
        ufw allow "$PORT/tcp" || true
        ufw allow 'Nginx Full' || true
    fi

elif [ "$SERVICE" = "caddy" ]; then
    CADDYFILE="/etc/caddy/Caddyfile"
    if [ -n "$DOMAIN" ]; then BIND="$DOMAIN:$PORT"; else BIND=":$PORT"; fi
    cat > "$CADDYFILE" << EOF
$BIND {
    root * $INSTALL_DIR
    file_server
    try_files {path} {path}/ /index.html
    encode gzip
}
EOF
    # ─── FIX #5: restart instead of reload on first setup ─────────
    systemctl restart caddy
    systemctl enable caddy

    # ─── FIX #1: Double quotes around PORT for ufw ────────────────
    if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
        ufw allow "$PORT/tcp" || true
    fi

elif [ "$SERVICE" = "docker" ]; then
    cat > "$SCRIPT_DIR/Dockerfile" << 'EOF'
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
EOF
    docker build -t "$APP_NAME" "$SCRIPT_DIR"
    docker stop "$APP_NAME" 2>/dev/null || true
    docker rm "$APP_NAME" 2>/dev/null || true
    docker run -d --name "$APP_NAME" --restart unless-stopped -p "$PORT:80" "$APP_NAME"
    echo -e "${YELLOW}🐳 Docker container running!${NC}"
fi

IP=$(hostname -I | awk '{print $1}')
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Installation Complete!             ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🌐 Access your calculator:${NC}"
if [ -n "$DOMAIN" ]; then echo -e "   http://$DOMAIN${PORT:+:$PORT}"; fi
echo -e "   http://$IP${PORT:+:$PORT}"
echo ""
echo -e "${GREEN}📂 Files stored at:${NC}"
echo -e "   $INSTALL_DIR"
echo ""
echo -e "${GREEN}🔧 Service: $SERVICE${NC}"
if [ "$SERVICE" = "docker" ]; then
    echo -e "   Container: $APP_NAME"
    echo -e "   ${CYAN}docker logs -f $APP_NAME${NC} to view logs"
fi
echo ""
echo -e "${GREEN}🎉 Done! Enjoy your calculator!${NC}"
