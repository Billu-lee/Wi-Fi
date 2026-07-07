# BilluNet Captive Portal

BilluNet is a production-style hotspot captive portal monorepo with:

- `backend/`: Spring Boot 4.0.5, PostgreSQL, Flyway, JWT-secured admin APIs, OTP, mock payment flow, and openNDS integration placeholders.
- `frontend-wifi/`: Vite + React + TypeScript + Bootstrap 5 SPA for both customer portal and admin dashboard flows.

## Project Structure

```text
.
├── backend
└── frontend
```

## Quick Start

1. Create a PostgreSQL database named `billunet`.
2. Copy `backend/.env.example` to `backend/.env`, or export the same values into your shell environment.
3. Run the backend:

   ```bash
   cd backend
   mvn spring-boot:run
   ```

4. Copy `frontend-wifi/.env.example` values into your environment if needed.
5. Run the frontend:

   ```bash
   cd frontend-wifi
   npm install
   npm run dev
   ```

6. Open `http://localhost:5173`.

Default admin account:

- Email: `admin@local.test`
- Password: `Admin@123`

Seeded plans:

- `1 Hour` - `TZS 500`
- `3 Hours` - `TZS 1,000`
- `1 Day` - `TZS 2,000`
- `7 Days` - `TZS 10,000`

## Captive Flow

1. A Wi-Fi client hits the BilluNet portal with openNDS-like query parameters.
   For this development build, the frontend expects a MAC value in `macAddress`, `mac`, or `clientmac`.
2. The frontend calls `POST /api/captive/identify`.
3. Unknown MAC addresses go through phone OTP verification.
4. Verified users choose a plan and initiate a mock payment.
5. Mock payment confirmation creates a device-bound access session.
6. Active sessions receive a continue URL for openNDS handoff.

## Multi-Router Auto-Registration

BilluNet does not require an admin to create routers before they are used. A router is auto-registered the first time the backend sees a new `router_code` in either a secure FAS request or a router heartbeat.

- FAS-only first contact creates a `RouterNode` with `autoRegistered=true` and status `DISCOVERED`.
- Heartbeat first contact creates a `RouterNode` with `autoRegistered=true`, status `ONLINE`, and `lastSeenAt=now`.
- Disabled routers stay `DISABLED`; heartbeats update telemetry but do not set them back online.

`router_code` is the stable identity for a physical hotspot router. Use a unique, readable code such as `DSM-MBEZI-001`. `location_code` groups routers by site or area, for example `MBEZI`.

Add router identity to openNDS custom parameters:

```text
list fas_custom_parameters_list 'router_code=DSM-MBEZI-001'
list fas_custom_parameters_list 'location_code=MBEZI'
```

Example openNDS config block:

```text
config opennds
  option enabled '1'
  option gatewayname 'BilluNet-Mbezi'
  option fas_secure_enabled '3'
  option fasport '443'
  option fasremotefqdn 'billunet.example.com'
  option faspath '/api/fas/init'
  option faskey 'replace-with-fas-key'
  list fas_custom_parameters_list 'router_code=DSM-MBEZI-001'
  list fas_custom_parameters_list 'location_code=MBEZI'
```

The heartbeat endpoint is public but protected by `X-Router-Key`. Set `ROUTER_AGENT_KEY` in the backend environment and put the same value only on the router, never in the frontend.

Example heartbeat curl:

```bash
curl -X POST https://billunet.example.com/api/router-agent/heartbeat \
  -H "Content-Type: application/json" \
  -H "X-Router-Key: replace-with-router-agent-key" \
  -d '{
    "routerCode": "DSM-MBEZI-001",
    "gatewayName": "BilluNet-Mbezi",
    "wanIp": "192.168.122.20",
    "lanIp": "192.168.10.1",
    "openNdsRunning": true,
    "connectedClients": 12,
    "authenticatedClients": 5,
    "uptimeSeconds": 8400
  }'
```

Install the generated heartbeat script from [`router/billunet-heartbeat.sh`](router/billunet-heartbeat.sh) on OpenWrt as `/root/billunet-heartbeat.sh`, then enable cron:

```sh
chmod +x /root/billunet-heartbeat.sh
crontab -e
* * * * * /root/billunet-heartbeat.sh
/etc/init.d/cron enable
/etc/init.d/cron restart
```

Admins can see routers at `/admin/routers` and router metrics on `/admin/dashboard`. A router becomes `DEGRADED` when its heartbeat is missing for more than 2 minutes and `OFFLINE` after more than 5 minutes. To debug, confirm the router clock/network path, `ROUTER_AGENT_KEY`, backend URL, openNDS process, and `/tmp/billunet-heartbeat.err` on the router.

## Sample curl Requests

Identify a captive request:

```bash
curl -X POST http://localhost:8080/api/captive/identify \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "clientIp": "192.168.1.25",
    "gatewayName": "BilluNet-Gateway",
    "token": "abc123",
    "redir": "https://example.com",
    "authAction": "https://gateway.local/opennds_auth/"
  }'
```

Send OTP:

```bash
curl -X POST http://localhost:8080/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+255700000000",
    "macAddress": "AA:BB:CC:DD:EE:FF"
  }'
```

Verify OTP:

```bash
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+255700000000",
    "otp": "123456",
    "macAddress": "AA:BB:CC:DD:EE:FF"
  }'
```

Initiate payment:

```bash
curl -X POST http://localhost:8080/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "deviceId": 1,
    "planId": 1
  }'
```

Confirm mock payment:

```bash
curl -X POST http://localhost:8080/api/payments/mock-confirm \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": 1
  }'
```

Admin login:

```bash
curl -X POST http://localhost:8080/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@local.test",
    "password": "Admin@123"
  }'
```

## Verification

Implemented and checked locally:

- `backend`: `mvn -q -DskipTests compile`
- `backend`: `mvn test`
- `frontend`: `npm run build`
- `frontend`: `npm test`

## Future Extension Points

- Real SMS provider:
  Replace `MockSmsSender` with a provider-backed `SmsSender` implementation while keeping OTP rules unchanged.
- Real mobile money:
  Add a new `PaymentProvider` implementation and provider-specific callback/webhook verification.
- FreeRADIUS:
  Extend `AccessSessionService` with accounting hooks and session synchronization for external AAA systems.
- Real openNDS authorization:
  Replace placeholder logic in `OpenNdsService` with secure FAS signing, router session tracking, and reject/allow callbacks.

See [backend/README.md](backend/README.md) and [frontend-wifi/README.md](frontend-wifi/README.md) for setup details.
