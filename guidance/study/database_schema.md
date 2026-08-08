# BilluNet Captive Portal System: Database Schema Study Guide

This document covers the relational schema design, table structures, and relationships implemented in the PostgreSQL database.

---

## 1. Schema Diagram & Relationships

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  customers   │1        *│   devices    │1        *│radius_accounts│
│  (Guests)    ├─────────>│ (Guest Mac)  ├─────────>│(RADIUS Auth) │
└──────┬───────┘          └──────┬───────┘          └──────────────┘
       │1                        │1
       │                         │
       │*                        │*
┌──────v───────┐          ┌──────v───────┐
│   payments   │1        1│access_sessions│
│ (Transactions)├────────>│ (Active Plan) │
└──────────────┘          └──────┬───────┘
                                 │1
                                 │
                                 │*
                          ┌──────v───────┐
                          │radius_sessions│
                          │(Data Usage)  │
                          └──────────────┘
```

---

## 2. Table Definitions & Constraints

### Customers Table (`customers`)
Tracks guest subscriber phone numbers and verification states.
```sql
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(32) NOT NULL UNIQUE,      -- Main login identifier (unique)
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,  -- True once OTP verified
    full_name VARCHAR(150),
    status VARCHAR(32) NOT NULL,                    -- ACTIVE, BLOCKED
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
```

### Devices Table (`devices`)
Maps client devices (by MAC address) to their registering customer.
```sql
CREATE TABLE devices (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id), -- Owner link
    mac_address VARCHAR(32) NOT NULL UNIQUE,              -- Normalized MAC (e.g. 00:11:22...)
    device_name VARCHAR(120),
    status VARCHAR(32) NOT NULL,                          -- ACTIVE, BLOCKED
    first_seen_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL,
    last_seen_ip VARCHAR(64),
    notes VARCHAR(300)
);
```

### Plans Table (`plans`)
Contains packages available for purchase.
```sql
CREATE TABLE plans (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,                           -- e.g. "1 Day Plan"
    description VARCHAR(500),
    price NUMERIC(12, 2) NOT NULL,                        -- Pricing in local currency (TZS)
    duration_minutes INTEGER NOT NULL,                    -- Plan length
    active BOOLEAN NOT NULL DEFAULT TRUE,
    download_mbps INTEGER,                                -- Bandwidth ceiling
    upload_mbps INTEGER,
    data_cap_mb BIGINT,                                   -- Data limit in MB
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
```

### Payments Table (`payments`)
Logs financial records of plan purchases.
```sql
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    device_id BIGINT NOT NULL REFERENCES devices(id),
    plan_id BIGINT NOT NULL REFERENCES plans(id),
    amount NUMERIC(12, 2) NOT NULL,
    provider VARCHAR(64) NOT NULL,                        -- MOCK_MONEY, CLICKPESA, FLUTTERWAVE
    provider_reference VARCHAR(120) NOT NULL,             -- External billing transaction ID
    status VARCHAR(32) NOT NULL,                          -- PENDING, SUCCESS, FAILED, CANCELLED
    requested_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ,
    raw_payload TEXT
);
```

### Access Sessions Table (`access_sessions`)
Maintains active internet access permissions. A 1-to-1 link between `payment_id` and `access_sessions` ensures a session cannot be spawned without an associated successful payment.
```sql
CREATE TABLE access_sessions (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    device_id BIGINT NOT NULL REFERENCES devices(id),
    plan_id BIGINT NOT NULL REFERENCES plans(id),
    payment_id BIGINT NOT NULL UNIQUE REFERENCES payments(id), -- Enforces 1-to-1 payment-to-session rule
    status VARCHAR(32) NOT NULL,                               -- ACTIVE, EXPIRED, TERMINATED
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    granted_at TIMESTAMPTZ,
    terminated_at TIMESTAMPTZ,
    termination_reason VARCHAR(200),
    router_session_ref VARCHAR(120)                            -- Router session tracking identifier
);
```

### RADIUS Accounts Table (`radius_accounts`)
Provides authentication credentials queried by FreeRADIUS.
```sql
CREATE TABLE radius_accounts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(120) NOT NULL UNIQUE,                 -- Matches normalized client MAC
    password_hash VARCHAR(255) NOT NULL,                   -- Hashed password (normally MAC address value)
    password_plain VARCHAR(255) NOT NULL,                  -- Plain text password for PAP comparison
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    device_id BIGINT NOT NULL REFERENCES devices(id),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,                                -- When access profile expires
    download_mbps INTEGER,                                 -- Speed limits synced from active Plan
    upload_mbps INTEGER,
    data_cap_mb BIGINT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
```

### RADIUS Sessions Table (`radius_sessions`)
Receives accounting usage statistics sent from routers.
```sql
CREATE TABLE radius_sessions (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(120) NOT NULL,
    session_id VARCHAR(120) NOT NULL,                      -- RADIUS Acct-Session-Id
    access_session_id BIGINT REFERENCES access_sessions(id),
    router_node_id BIGINT REFERENCES router_nodes(id),
    start_time TIMESTAMPTZ NOT NULL,
    stop_time TIMESTAMPTZ,
    bytes_in BIGINT NOT NULL DEFAULT 0,                    -- Download volume
    bytes_out BIGINT NOT NULL DEFAULT 0,                   -- Upload volume
    duration_seconds BIGINT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_radius_sessions_session_id UNIQUE (session_id)
);
```

---

## 3. Performance Indexing Strategy

To support fast lookups on high-traffic public captive nodes, indexes are placed on foreign key reference columns and timestamp ranges:

```sql
-- Fast query mappings for client devices
CREATE INDEX idx_devices_customer_id ON devices(customer_id);

-- Speed up payment lookup when verifying transaction status
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_device_status ON payments(device_id, status);

-- Retrieve latest OTP request quickly to limit sms floods
CREATE INDEX idx_otp_phone_created_at ON otp_verifications(phone_number, created_at DESC);
CREATE INDEX idx_otp_mac_created_at ON otp_verifications(mac_address, created_at DESC);

-- Retrieve latest access session to check expiration thresholds
CREATE INDEX idx_access_sessions_device_end_time ON access_sessions(device_id, end_time DESC);

-- Find dynamic RADIUS profiles for active devices
CREATE INDEX idx_radius_accounts_device_id ON radius_accounts(device_id);

-- Pull historical bytes accounting logs for user reports
CREATE INDEX idx_radius_sessions_start_time ON radius_sessions(start_time DESC);
```
