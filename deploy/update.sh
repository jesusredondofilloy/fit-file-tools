#!/usr/bin/env bash
# Re-pull main and restart the backend service. Run on the VM as root/sudo.
set -euo pipefail

APP_DIR="/srv/fit-file-tools"
APP_USER="fittools"

sudo -u "$APP_USER" git -C "$APP_DIR" fetch --depth 1 origin main
sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard origin/main
sudo -u "$APP_USER" "$APP_DIR/backend/.venv/bin/pip" install --quiet -r "$APP_DIR/backend/requirements.txt"
systemctl restart fit-file-tools
echo "==> Restarted. Tail logs with: journalctl -u fit-file-tools -f"
