#!/usr/bin/env bash
#
# Hetzner VM bootstrap for fit-file-tools backend.
#
# What this script does (idempotent — safe to re-run):
#   1. Installs system packages (python3.12, nginx, certbot)
#   2. Creates the `fittools` system user
#   3. Clones / updates the repo at /srv/fit-file-tools
#   4. Creates a virtualenv and installs Python deps
#   5. Writes /srv/fit-file-tools/backend/.env (CORS origins)
#   6. Installs the systemd service and the nginx vhost
#   7. Configures the firewall (ufw) for 80/443/22
#   8. Issues a Let's Encrypt cert via certbot --nginx
#
# Usage on the VM (as root or via sudo):
#   curl -fsSL https://raw.githubusercontent.com/<owner>/fit-file-tools/main/deploy/install.sh \
#     | sudo bash -s -- --host <vm-ip>.sslip.io --vercel-origin https://<your-app>.vercel.app
#
# Or after `git clone` on the VM:
#   sudo deploy/install.sh --host <vm-ip>.sslip.io --vercel-origin https://<your-app>.vercel.app

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/jesusredondofilloy/fit-file-tools.git}"
APP_DIR="/srv/fit-file-tools"
APP_USER="fittools"
HOST=""
VERCEL_ORIGIN=""
LE_EMAIL="${LE_EMAIL:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --vercel-origin) VERCEL_ORIGIN="$2"; shift 2 ;;
    --email) LE_EMAIL="$2"; shift 2 ;;
    --repo) REPO_URL="$2"; shift 2 ;;
    *) echo "Unknown flag: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$HOST" ]]; then
  echo "ERROR: --host is required (e.g. --host 1.2.3.4.sslip.io)" >&2
  exit 2
fi

if [[ -z "$VERCEL_ORIGIN" ]]; then
  echo "WARNING: --vercel-origin not set — CORS will only allow localhost. Re-run with --vercel-origin once your Vercel URL is known."
fi

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo." >&2
  exit 1
fi

echo "==> Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  git curl ca-certificates \
  python3.12 python3.12-venv python3.12-dev \
  nginx \
  certbot python3-certbot-nginx \
  ufw

echo "==> Creating system user '$APP_USER'"
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi

echo "==> Cloning/updating repo at $APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --depth 1 origin main
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard origin/main
else
  rm -rf "$APP_DIR"
  install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
  sudo -u "$APP_USER" git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi

echo "==> Creating virtualenv and installing dependencies"
sudo -u "$APP_USER" python3.12 -m venv "$APP_DIR/backend/.venv"
sudo -u "$APP_USER" "$APP_DIR/backend/.venv/bin/pip" install --quiet --upgrade pip
sudo -u "$APP_USER" "$APP_DIR/backend/.venv/bin/pip" install --quiet -r "$APP_DIR/backend/requirements.txt"

echo "==> Writing backend/.env"
ALLOWED_ORIGINS="http://localhost:5173"
if [[ -n "$VERCEL_ORIGIN" ]]; then
  ALLOWED_ORIGINS="$ALLOWED_ORIGINS,$VERCEL_ORIGIN"
fi
cat > "$APP_DIR/backend/.env" <<EOF
ALLOWED_ORIGINS=$ALLOWED_ORIGINS
EOF
chown "$APP_USER:$APP_USER" "$APP_DIR/backend/.env"
chmod 640 "$APP_DIR/backend/.env"

echo "==> Installing systemd service"
install -m 644 "$APP_DIR/deploy/systemd/fit-file-tools.service" /etc/systemd/system/fit-file-tools.service
systemctl daemon-reload
systemctl enable fit-file-tools
systemctl restart fit-file-tools

echo "==> Installing nginx vhost for $HOST"
install -d /etc/nginx/conf.d
install -m 644 "$APP_DIR/deploy/nginx/rate-limit.conf" /etc/nginx/conf.d/fit-file-tools-rate-limit.conf
sed "s/__HOST__/$HOST/g" "$APP_DIR/deploy/nginx/fit-file-tools.conf" > /etc/nginx/sites-available/fit-file-tools.conf
ln -sf /etc/nginx/sites-available/fit-file-tools.conf /etc/nginx/sites-enabled/fit-file-tools.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Configuring firewall"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
yes | ufw enable >/dev/null || true

echo "==> Issuing Let's Encrypt certificate for $HOST"
CERTBOT_FLAGS=(--nginx -d "$HOST" --non-interactive --agree-tos --redirect)
if [[ -n "$LE_EMAIL" ]]; then
  CERTBOT_FLAGS+=(--email "$LE_EMAIL")
else
  CERTBOT_FLAGS+=(--register-unsafely-without-email)
fi
certbot "${CERTBOT_FLAGS[@]}"

echo
echo "==> Done."
echo "Backend should now be live at: https://$HOST/health"
echo
echo "If you set --vercel-origin, the frontend can now POST to https://$HOST/api/merge."
echo "If not, set ALLOWED_ORIGINS in $APP_DIR/backend/.env and run: sudo systemctl restart fit-file-tools"
