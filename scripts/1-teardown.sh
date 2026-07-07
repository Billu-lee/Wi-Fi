#!/bin/bash
# ============================================================
# BilluNet TEARDOWN Script
# Removes BOTH previous deployments from the VPS
# Does NOT touch: lupestationery, triaxis
# ============================================================

set -e

echo "=========================================="
echo "  BilluNet Teardown — Cleaning VPS"
echo "=========================================="

# ----------------------------------------------------------
# 1. Stop and disable both services
# ----------------------------------------------------------
echo ""
echo "[1/5] Stopping services..."

systemctl stop wifi.service 2>/dev/null && echo "  Stopped wifi.service" || echo "  wifi.service not running"
systemctl stop backend-wifi.service 2>/dev/null && echo "  Stopped backend-wifi.service" || echo "  backend-wifi.service not running"

systemctl disable wifi.service 2>/dev/null && echo "  Disabled wifi.service" || echo "  wifi.service not found"
systemctl disable backend-wifi.service 2>/dev/null && echo "  Disabled backend-wifi.service" || echo "  backend-wifi.service not found"

# Remove service files
rm -f /etc/systemd/system/wifi.service
rm -f /etc/systemd/system/backend-wifi.service
systemctl daemon-reload
echo "  Service files removed and daemon reloaded"

# ----------------------------------------------------------
# 2. Remove application files
# ----------------------------------------------------------
echo ""
echo "[2/5] Removing application files..."

# Deployment 1 — billunet
rm -rf /opt/billunet/
echo "  Removed /opt/billunet/"

# Deployment 2 — backend-wifi
rm -rf /opt/backend-wifi/
echo "  Removed /opt/backend-wifi/"

# Source repos
rm -rf /opt/repos/backend-wifi/
rm -rf /opt/repos/frontend-wifi/
echo "  Removed /opt/repos/backend-wifi/ and /opt/repos/frontend-wifi/"

# Stale JAR copies
rm -f /opt/billunet-backend-0.0.1-SNAPSHOT.jar
rm -f /root/billunet-backend-0.0.1-SNAPSHOT.jar
echo "  Removed stale JAR copies"

# Old backend source in /root
rm -rf /root/backend/
echo "  Removed /root/backend/"

# Old empty dir
rm -rf /opt/billunet-backend/
rm -rf /opt/wifi/
echo "  Removed /opt/billunet-backend/ and /opt/wifi/"

# Frontend static files
rm -rf /var/www/billunet/
rm -rf /var/www/wifi/
echo "  Removed /var/www/billunet/ and /var/www/wifi/"

# ----------------------------------------------------------
# 3. Remove Nginx configs
# ----------------------------------------------------------
echo ""
echo "[3/5] Removing Nginx configs..."

rm -f /etc/nginx/sites-enabled/billunet
rm -f /etc/nginx/sites-enabled/billunet-api
rm -f /etc/nginx/sites-enabled/wifi
rm -f /etc/nginx/sites-enabled/wifi-backend

rm -f /etc/nginx/sites-available/billunet
rm -f /etc/nginx/sites-available/billunet-api
rm -f /etc/nginx/sites-available/wifi
rm -f /etc/nginx/sites-available/wifi-backend

echo "  Removed all BilluNet Nginx configs"

nginx -t && systemctl reload nginx
echo "  Nginx reloaded"

# ----------------------------------------------------------
# 4. Drop old databases
# ----------------------------------------------------------
echo ""
echo "[4/5] Dropping old databases..."

# Drop all BilluNet databases — we'll create a fresh one in redeploy
sudo -u postgres psql -c "DROP DATABASE IF EXISTS billu;" && echo "  Dropped billu"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS billu1;" && echo "  Dropped billu1"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS billunet;" && echo "  Dropped billunet"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS billunet_db;" && echo "  Dropped billunet_db"

echo ""
echo "[5/5] Verifying cleanup..."
echo ""

echo "--- Remaining Java processes (should only show lupestationery) ---"
ps aux | grep java | grep -v grep

echo ""
echo "--- Remaining Nginx sites ---"
ls /etc/nginx/sites-enabled/

echo ""
echo "--- Remaining databases ---"
sudo -u postgres psql -l | grep -E "billu|wifi"

echo ""
echo "=========================================="
echo "  Teardown complete!"
echo "  Ready for fresh deploy with 2-redeploy.sh"
echo "=========================================="
