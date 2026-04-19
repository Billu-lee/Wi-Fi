# BilluNet Captive Portal

BilluNet is a production-style hotspot captive portal monorepo with:

- `backend/`: Spring Boot 4.0.5, PostgreSQL, Flyway, JWT-secured admin APIs, OTP, mock payment flow, and openNDS integration placeholders.
- `frontend/`: Vite + React + TypeScript + Bootstrap 5 SPA for both customer portal and admin dashboard flows.

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

4. Copy `frontend/.env.example` values into your environment.
5. Run the frontend:

   ```bash
   cd frontend
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

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for setup details.
