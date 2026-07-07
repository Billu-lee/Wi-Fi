#!/bin/bash
# ============================================================
# BilluNet REDEPLOY Script
# Fresh deployment on Ubuntu VPS
# Run AFTER 1-teardown.sh
# ============================================================

set -e

# ----------------------------------------------------------
# CONFIGURATION — Edit these before running
# ----------------------------------------------------------
DOMAIN="billunet.lupestationery.org"
API_DOMAIN="billunet-api.lupestationery.org"
DB_NAME="billunet"
DB_USER="shabillu"
DB_PASS="24558"                          # Change this!
SERVER_PORT="8081"
APP_DIR="/opt/billunet"
FRONTEND_DIR="/var/www/billunet"
REPO_DIR="/opt/repos/billunet"
GIT_REPO="https://github.com/YOUR_USER/YOUR_REPO.git"  # Change this!

# JWT & App secrets
JWT_SECRET="mZ2t3PoaY+vZtULaNg2z64xAXhL7vlwpP4PcTWvnLMk="
ADMIN_EMAIL="admin@billunet.com"
ADMIN_PASSWORD="admin123"                # Change this in production!
ROUTER_AGENT_KEY="63d08037403188d191e696b60e7458e5cd69e3e908d72c6fabd650524bd97a5d"

echo "=========================================="
echo "  BilluNet Fresh Deploy"
echo "=========================================="

# ----------------------------------------------------------
# 1. Create database
# ----------------------------------------------------------
echo ""
echo "[1/7] Setting up PostgreSQL database..."

sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || echo "  Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null
sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" 2>/dev/null
echo "  Database '${DB_NAME}' ready for user '${DB_USER}'"

# ----------------------------------------------------------
# 2. Clone repo and build backend
# ----------------------------------------------------------
echo ""
echo "[2/7] Cloning repo and building backend..."

mkdir -p ${REPO_DIR}
if [ -d "${REPO_DIR}/.git" ]; then
    cd ${REPO_DIR}
    git pull origin main
else
    git clone ${GIT_REPO} ${REPO_DIR}
    cd ${REPO_DIR}
fi

# Build backend JAR
cd ${REPO_DIR}/backend
./mvnw clean package -DskipTests -q
echo "  Backend built successfully"

# ----------------------------------------------------------
# 3. Deploy backend JAR
# ----------------------------------------------------------
echo ""
echo "[3/7] Deploying backend..."

mkdir -p ${APP_DIR}
cp ${REPO_DIR}/backend/target/billunet-backend-0.0.1-SNAPSHOT.jar ${APP_DIR}/billunet.jar

# Create .env file
cat > ${APP_DIR}/.env << EOF
DB_URL=jdbc:postgresql://localhost:5432/${DB_NAME}
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASS}
SERVER_PORT=${SERVER_PORT}
FRONTEND_ORIGIN=https://${DOMAIN}
PORTAL_FRONTEND_URL=https://${DOMAIN}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_HOURS=12
ADMIN_SEED_EMAIL=${ADMIN_EMAIL}
ADMIN_SEED_PASSWORD=${ADMIN_PASSWORD}
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_HOURLY_RATE_LIMIT=5
MOCK_PAYMENT_PROVIDER=MOCK_MOBILE_MONEY
MOCK_SMS_SENDER=BilluNet
PORTAL_SESSION_TTL_MINUTES=5
ROUTER_AGENT_KEY=${ROUTER_AGENT_KEY}
MIKROTIK_API_ENABLED=true
MIKROTIK_API_USERNAME=portal-api
MIKROTIK_API_PASSWORD=MyStrongPassword
MIKROTIK_API_BASE_URL=http://192.168.88.1/rest
EOF

echo "  Backend deployed to ${APP_DIR}"

# ----------------------------------------------------------
# 4. Create systemd service
# ----------------------------------------------------------
echo ""
echo "[4/7] Creating systemd service..."

cat > /etc/systemd/system/billunet.service << EOF
[Unit]
Description=BilluNet Backend
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/java -jar ${APP_DIR}/billunet.jar
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable billunet.service
systemctl start billunet.service
echo "  Service 'billunet.service' started"

# Wait for backend to be ready
echo "  Waiting for backend to start..."
for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:${SERVER_PORT}/api/plans/public 2>/dev/null | grep -q "200\|401\|403"; then
        echo "  Backend is up on port ${SERVER_PORT}!"
        break
    fi
    sleep 2
done

# ----------------------------------------------------------
# 5. Build and deploy frontend
# ----------------------------------------------------------
echo ""
echo "[5/7] Building and deploying frontend..."

cd ${REPO_DIR}/frontend-wifi

# Set production API URL
echo "VITE_API_BASE_URL=https://${API_DOMAIN}" > .env.production

npm ci
npm run build

mkdir -p ${FRONTEND_DIR}
rm -rf ${FRONTEND_DIR}/*
cp -r dist/* ${FRONTEND_DIR}/

echo "  Frontend deployed to ${FRONTEND_DIR}"

# ----------------------------------------------------------
# 6. Configure Nginx
# ----------------------------------------------------------
echo ""
echo "[6/7] Configuring Nginx..."

# Frontend config
cat > /etc/nginx/sites-available/billunet << 'NGINX'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    root FRONTEND_DIR_PLACEHOLDER;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

sed -i "s|DOMAIN_PLACEHOLDER|${DOMAIN}|g" /etc/nginx/sites-available/billunet
sed -i "s|FRONTEND_DIR_PLACEHOLDER|${FRONTEND_DIR}|g" /etc/nginx/sites-available/billunet

# Backend API proxy config
cat > /etc/nginx/sites-available/billunet-api << 'NGINX'
server {
    listen 80;
    server_name API_DOMAIN_PLACEHOLDER;

    location / {
        proxy_pass http://localhost:SERVER_PORT_PLACEHOLDER;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

sed -i "s|API_DOMAIN_PLACEHOLDER|${API_DOMAIN}|g" /etc/nginx/sites-available/billunet-api
sed -i "s|SERVER_PORT_PLACEHOLDER|${SERVER_PORT}|g" /etc/nginx/sites-available/billunet-api

# Enable sites
ln -sf /etc/nginx/sites-available/billunet /etc/nginx/sites-enabled/billunet
ln -sf /etc/nginx/sites-available/billunet-api /etc/nginx/sites-enabled/billunet-api

nginx -t && systemctl reload nginx
echo "  Nginx configured and reloaded"

# ----------------------------------------------------------
# 7. SSL with Let's Encrypt
# ----------------------------------------------------------
echo ""
echo "[7/7] Setting up SSL..."

certbot --nginx -d ${DOMAIN} -d ${API_DOMAIN} --non-interactive --agree-tos --redirect 2>/dev/null \
    && echo "  SSL certificates installed" \
    || echo "  SSL setup skipped (certs may already exist or certbot not installed)"

# ----------------------------------------------------------
# Final verification
# ----------------------------------------------------------
echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  Frontend:  https://${DOMAIN}"
echo "  API:       https://${API_DOMAIN}"
echo "  Backend:   http://localhost:${SERVER_PORT}"
echo "  Database:  ${DB_NAME}"
echo "  Service:   billunet.service"
echo ""
echo "  Admin login:"
echo "    Email:    ${ADMIN_EMAIL}"
echo "    Password: ${ADMIN_PASSWORD}"
echo ""
echo "  Useful commands:"
echo "    journalctl -u billunet.service -f    # View logs"
echo "    systemctl restart billunet.service    # Restart backend"
echo "    systemctl status billunet.service     # Check status"
echo ""
