#!/usr/bin/env bash
# setup.sh — CANDOR production setup for Ubuntu 24.04 + Cloudflare proxy
#
# SAFE for servers already running other Bun/Hono sites:
#   - Only adds a new nginx site block (never touches existing configs)
#   - Uses port 3001 internally (change APP_PORT below if that collides)
#   - Creates an isolated systemd service and dedicated system user
#   - Database lives in /var/lib/candor, not inside the repo
#
# CLOUDFLARE SETUP (do this BEFORE running the script):
#   1. In Cloudflare dashboard → SSL/TLS → set mode to "Full (strict)"
#   2. SSL/TLS → Origin Server → Create Certificate
#      - Key type: RSA (2048)
#      - Hostnames: your-domain.com, *.your-domain.com
#      - Validity: 15 years
#   3. Copy the certificate text → save as /etc/ssl/candor/origin.pem
#   4. Copy the private key text  → save as /etc/ssl/candor/origin.key
#      (the script will create the directory and check for these files)
#
# Usage (run from the repo root as root or with sudo):
#   sudo bash setup.sh

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
DOMAIN="your-domain.com"       # ← change this to your domain
APP_PORT=3001
APP_USER="candor"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="${REPO_DIR}/web"
DB_DIR="/var/lib/candor"
ENV_FILE="/etc/candor.env"
SERVICE_NAME="candor"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
CF_CERT="/etc/ssl/candor/origin.pem"
CF_KEY="/etc/ssl/candor/origin.key"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[candor]${NC} $*"; }
warn()  { echo -e "${YELLOW}[candor]${NC} $*"; }
abort() { echo -e "${RED}[candor] ERROR:${NC} $*" >&2; exit 1; }
step()  { echo -e "\n${CYAN}── $* ${NC}"; }

# ── Preflight checks ──────────────────────────────────────────────────────────
[[ "$(id -u)" -eq 0 ]] || abort "Run as root: sudo bash setup.sh"

if [[ -f /etc/os-release ]]; then
  source /etc/os-release
  [[ "$ID" == "ubuntu" ]] || warn "Not Ubuntu — proceed at your own risk."
  [[ "$VERSION_ID" == "24.04" ]] || warn "Tested on 24.04, you have ${VERSION_ID}."
fi

# Check for Cloudflare Origin Certificate
mkdir -p /etc/ssl/candor
chmod 700 /etc/ssl/candor

if [[ ! -f "${CF_CERT}" || ! -f "${CF_KEY}" ]]; then
  echo
  echo -e "${YELLOW}Cloudflare Origin Certificate not found.${NC}"
  echo
  echo "  Before running this script, generate an Origin Certificate in Cloudflare:"
  echo "    1. Cloudflare dashboard → ${DOMAIN} → SSL/TLS → Origin Server"
  echo "    2. Click 'Create Certificate'"
  echo "       - Key type: RSA (2048)"
  echo "       - Hostnames: ${DOMAIN}, *.${DOMAIN}"
  echo "       - Validity: 15 years"
  echo "    3. Save the certificate to: ${CF_CERT}"
  echo "    4. Save the private key to:  ${CF_KEY}"
  echo
  echo "  Then re-run: sudo bash setup.sh"
  echo
  abort "Missing ${CF_CERT} or ${CF_KEY}"
fi

chmod 644 "${CF_CERT}"
chmod 600 "${CF_KEY}"

info "Cloudflare Origin Certificate found."
info "Setting up CANDOR on ${DOMAIN} (internal port ${APP_PORT})"

# ── 1. System packages ────────────────────────────────────────────────────────
step "System packages"
apt-get update -qq
apt-get install -y -qq nginx ufw curl unzip

# ── 2. Bun (system-wide) ─────────────────────────────────────────────────────
step "Bun runtime"
if command -v bun &>/dev/null; then
  info "Bun already installed: $(bun --version)"
else
  info "Installing Bun..."
  curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash
  info "Bun installed: $(bun --version)"
fi

# ── 3. Dedicated system user ──────────────────────────────────────────────────
step "System user"
if id "${APP_USER}" &>/dev/null; then
  info "User '${APP_USER}' already exists"
else
  useradd --system --no-create-home --shell /usr/sbin/nologin "${APP_USER}"
  info "Created system user '${APP_USER}'"
fi

# ── 4. Database directory ─────────────────────────────────────────────────────
step "Database directory"
mkdir -p "${DB_DIR}"
chown "${APP_USER}:${APP_USER}" "${DB_DIR}"
chmod 750 "${DB_DIR}"
info "Database dir: ${DB_DIR}"

# ── 5. Repo ownership ─────────────────────────────────────────────────────────
step "Repo ownership"
chown -R "${APP_USER}:${APP_USER}" "${REPO_DIR}"

# ── 6. Install dependencies ───────────────────────────────────────────────────
step "npm dependencies"
cd "${WEB_DIR}"
sudo -u "${APP_USER}" bun install --frozen-lockfile 2>/dev/null || sudo -u "${APP_USER}" bun install
info "Dependencies installed"

# ── 7. Environment file ───────────────────────────────────────────────────────
step "Environment file"
if [[ -f "${ENV_FILE}" ]]; then
  warn "${ENV_FILE} already exists — skipping. Edit manually if needed."
else
  cat > "${ENV_FILE}" <<EOF
# CANDOR — Production environment
# After editing, run: sudo systemctl restart candor

# ── AI Provider ───────────────────────────────────────────────────────────────
AI_PROVIDER=openai
OPENAI_API_KEY=gsk_REPLACE_WITH_YOUR_GROQ_KEY
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.1-8b-instant

# ── Article search (optional) ─────────────────────────────────────────────────
# Without these, falls back to DuckDuckGo scraping
BRAVE_API_KEY=
SERPAPI_KEY=

# ── Stripe (optional — required for paid tiers) ───────────────────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ── Server ────────────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=${APP_PORT}
DB_PATH=${DB_DIR}/candor.db
EOF
  chmod 600 "${ENV_FILE}"
  chown root:root "${ENV_FILE}"
  info "Created ${ENV_FILE}"
fi

# ── 8. Systemd service ────────────────────────────────────────────────────────
step "Systemd service"
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=CANDOR — Privacy-first review aggregator
Documentation=https://${DOMAIN}
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${WEB_DIR}
ExecStart=/usr/local/bin/bun run start
EnvironmentFile=${ENV_FILE}
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${DB_DIR}
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
info "Service '${SERVICE_NAME}' registered"

# ── 9. nginx — Cloudflare real IP config ──────────────────────────────────────
# This goes in /etc/nginx/conf.d/ so it applies globally (all sites on this server)
# Safe: only adds real_ip directives, doesn't touch other site configs
step "nginx Cloudflare real-IP config"

cat > /etc/nginx/conf.d/cloudflare-realip.conf <<'EOF'
# cloudflare-realip.conf
# Trust Cloudflare IP ranges so $remote_addr and CF-Connecting-IP are correct.
# Cloudflare IP list: https://www.cloudflare.com/ips/

# IPv4
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;

# IPv6
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;

# Use the CF-Connecting-IP header as the real client IP
real_ip_header CF-Connecting-IP;
EOF

info "Cloudflare real-IP config written to /etc/nginx/conf.d/cloudflare-realip.conf"

# ── 10. nginx site config ─────────────────────────────────────────────────────
step "nginx site config"
[[ -f "${NGINX_CONF}" ]] && warn "${NGINX_CONF} already exists — overwriting."

cat > "${NGINX_CONF}" <<EOF
# CANDOR — ${DOMAIN}
# Origin receives Cloudflare traffic only (see ufw rules set by setup.sh).
# SSL terminates at Cloudflare; this cert is the Cloudflare Origin Certificate.

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    # Cloudflare handles HTTP→HTTPS redirect on its end.
    # This catches any direct-to-origin HTTP (e.g. health checks).
    return 444;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN} www.${DOMAIN};

    # Cloudflare Origin Certificate (not Let's Encrypt)
    ssl_certificate     ${CF_CERT};
    ssl_certificate_key ${CF_KEY};

    # Modern TLS only
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers off;

    # Security headers (belt-and-suspenders — app sets these too)
    add_header X-Frame-Options        "DENY"        always;
    add_header X-Content-Type-Options "nosniff"     always;
    add_header Referrer-Policy        "no-referrer" always;
    add_header Permissions-Policy     "interest-cohort=()" always;

    # Proxy to Bun
    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   CF-Connecting-IP  \$http_cf_connecting_ip;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
EOF

ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}"
nginx -t
info "nginx site config OK"

# ── 11. Firewall — Cloudflare IPs only ───────────────────────────────────────
# Blocks direct HTTP/HTTPS access to the origin, enforcing Cloudflare proxy.
# SSH is preserved. Adjust if you have other services that need open ports.
step "ufw firewall (Cloudflare IPs only for HTTP/HTTPS)"

ufw --force reset          # start clean to avoid duplicate rules
ufw default deny incoming
ufw default allow outgoing

# SSH — keep access or you'll lock yourself out
ufw allow OpenSSH

# Cloudflare IPv4 ranges — allow HTTP + HTTPS
CF_IPV4=(
  103.21.244.0/22
  103.22.200.0/22
  103.31.4.0/22
  104.16.0.0/13
  104.24.0.0/14
  108.162.192.0/18
  131.0.72.0/22
  141.101.64.0/18
  162.158.0.0/15
  172.64.0.0/13
  173.245.48.0/20
  188.114.96.0/20
  190.93.240.0/20
  197.234.240.0/22
  198.41.128.0/17
)
CF_IPV6=(
  2400:cb00::/32
  2606:4700::/32
  2803:f800::/32
  2405:b500::/32
  2405:8100::/32
  2a06:98c0::/29
  2c0f:f248::/32
)

for ip in "${CF_IPV4[@]}"; do
  ufw allow from "${ip}" to any port 80  proto tcp comment "Cloudflare"
  ufw allow from "${ip}" to any port 443 proto tcp comment "Cloudflare"
done
for ip in "${CF_IPV6[@]}"; do
  ufw allow from "${ip}" to any port 80  proto tcp comment "Cloudflare"
  ufw allow from "${ip}" to any port 443 proto tcp comment "Cloudflare"
done

ufw --force enable
info "ufw enabled — HTTP/HTTPS restricted to Cloudflare IPs only"

# ── 12. Reload nginx and start app ────────────────────────────────────────────
step "Starting services"
systemctl reload nginx
systemctl start "${SERVICE_NAME}" || warn "Service failed to start — check API keys in ${ENV_FILE}, then: sudo systemctl start ${SERVICE_NAME}"

# ── Done ──────────────────────────────────────────────────────────────────────
echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  CANDOR setup complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo "  Domain:      https://${DOMAIN}"
echo "  App port:    ${APP_PORT}  (internal — not exposed to internet)"
echo "  DB:          ${DB_DIR}/candor.db"
echo "  Env file:    ${ENV_FILE}"
echo "  Service:     ${SERVICE_NAME}"
echo
echo -e "${YELLOW}  Required next steps:${NC}"
echo "  1. sudo nano ${ENV_FILE}"
echo "     → Replace OPENAI_API_KEY with your real Groq key"
echo "  2. sudo systemctl restart ${SERVICE_NAME}"
echo "  3. In Cloudflare dashboard:"
echo "     → SSL/TLS mode: Full (strict)"
echo "     → Make sure the orange cloud (proxy) is ON for c4ndor.xyz"
echo
echo -e "${YELLOW}  Useful commands:${NC}"
echo "  sudo systemctl status  ${SERVICE_NAME}"
echo "  sudo journalctl -u ${SERVICE_NAME} -f"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo "  sudo ufw status verbose"
echo
