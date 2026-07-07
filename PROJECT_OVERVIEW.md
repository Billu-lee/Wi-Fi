# BilluNet Wi-Fi Portal - Project Overview

**Project Name:** BilluNet  
**Description:** A captive portal and Wi-Fi hotspot management system for commercial internet service providers. Users connect to Wi-Fi, are redirected to a captive portal, verify their phone via OTP, purchase internet plans, and gain internet access through MikroTik router integration. An admin panel provides full management of customers, devices, payments, routers, and sessions.

---

## 1. Tech Stack

| Layer        | Technology                                                    |
|-------------|--------------------------------------------------------------|
| **Backend**  | Java 21, Spring Boot 4.0.5, Spring Security, Spring Data JPA |
| **Frontend** | React 19, TypeScript 5.8, Vite 7, React Router DOM 7         |
| **Database** | PostgreSQL (with Supabase support)                            |
| **Migrations** | Flyway                                                     |
| **Auth (Admin)** | JWT (JJWT 0.12.6), BCrypt                               |
| **Auth (Users)** | OTP via SMS (mock sender)                                |
| **API Docs** | SpringDoc OpenAPI 2.8.6 (Swagger UI)                         |
| **CSS**      | Bootstrap 5.3.7                                               |
| **HTTP Client** | Axios 1.9                                                 |
| **Testing**  | Spring Boot Test, Vitest 3.2, React Testing Library           |
| **Deployment** | Vercel (frontend), configurable backend                     |
| **Router Integration** | MikroTik REST API, FreeRADIUS                      |

---

## 2. Project Structure

```
Wi-Fi/
├── backend/                             # Spring Boot API server
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/wifi/portal/
│   │   │   │   ├── BilluNetPortalApplication.java   # Entry point
│   │   │   │   ├── bootstrap/                       # Admin user seeding
│   │   │   │   ├── config/                          # App properties, OpenAPI, CORS
│   │   │   │   ├── controller/                      # REST controllers (15 files)
│   │   │   │   ├── dto/                             # Request/response DTOs (10 files)
│   │   │   │   ├── entity/                          # JPA entities & enums (22 files)
│   │   │   │   ├── exception/                       # Global error handling
│   │   │   │   ├── integration/                     # MikroTik, payment, SMS providers
│   │   │   │   ├── repository/                      # Spring Data JPA repos (14 files)
│   │   │   │   ├── scheduler/                       # Session expiry & router health crons
│   │   │   │   ├── security/                        # JWT filter, Spring Security config
│   │   │   │   └── service/                         # Business logic (20 files)
│   │   │   └── resources/
│   │   │       ├── application.yml                  # Spring config (env-driven)
│   │   │       └── db/migration/                    # Flyway SQL migrations (V1-V10)
│   │   └── test/java/                               # Backend tests
│   ├── pom.xml                                      # Maven dependencies
│   └── .env.example                                 # Environment variables template
│
├── frontend-wifi/                       # React SPA
│   ├── src/
│   │   ├── app/App.tsx                              # Router & route definitions
│   │   ├── pages/                                   # 33 page components
│   │   ├── components/                              # 5 reusable UI components
│   │   ├── services/                                # API client layer (5 files)
│   │   ├── context/                                 # AuthContext, PortalContext
│   │   ├── types/api.ts                             # TypeScript interfaces (140+)
│   │   ├── utils/                                   # Error handling, formatters
│   │   ├── hooks/                                   # useCountdown custom hook
│   │   ├── layouts/                                 # PortalLayout, AdminLayout
│   │   └── tests/                                   # Component tests (5 files)
│   ├── package.json                                 # NPM dependencies
│   ├── vercel.json                                  # Vercel deployment config
│   └── tsconfig.json                                # TypeScript config
│
├── router/                              # MikroTik router agent
│   └── billunet-heartbeat.sh                        # Heartbeat script for routers
│
└── .github/                             # CI/CD workflows
```

---

## 3. Key Features Implemented

### Public Captive Portal (User-Facing)

| Feature | Description | Key Files |
|---------|------------|-----------|
| **Captive Portal Detection** | Identifies devices by MAC address from MikroTik redirect, determines portal state (new device, active session, expired, blocked) | `CaptivePortalController.java`, `CaptivePortalService.java`, `PortalLandingPage.tsx` |
| **OTP Phone Verification** | 6-digit OTP sent via SMS, BCrypt-hashed storage, expiry/rate-limiting/cooldown enforcement | `OtpService.java`, `PublicAuthController.java`, `PhoneVerificationPage.tsx` |
| **Device Registration & Linking** | Links MAC addresses to customer accounts, supports device swap between accounts | `DeviceService.java`, `OtpService.java` |
| **Plan Selection** | Lists available internet plans with pricing, duration, and bandwidth info | `PlanService.java`, `PublicPlanController.java`, `PlanSelectionPage.tsx` |
| **Payment Processing** | Initiates payment, mock payment confirmation flow, activates plan on success | `PaymentService.java`, `PlanActivationService.java`, `PaymentPage.tsx` |
| **Session Management** | Creates time-bound access sessions, countdown timer, auto-expiry via scheduler | `AccessSessionService.java`, `AccessSessionExpiryScheduler.java`, `SessionActivePage.tsx` |
| **Device Swap** | Transfers active session from one device to another owned by the same customer | `OtpService.swapDevice()`, `AccessSessionService.swapActiveSessionToDevice()`, `DeviceSwapChoicePage.tsx` |
| **Internet Access Grant** | Generates MikroTik continue URL with RADIUS credentials to grant hotspot access | `MikroTikHotspotService.java`, `CaptivePortalService.continueAccess()` |
| **Session Status Polling** | Frontend polls backend every 30 seconds for session validity, auto-redirects on expiry | `SessionActivePage.tsx`, `CaptivePortalService.getPortalStatus()` |

### Admin Panel

| Feature | Description | Key Files |
|---------|------------|-----------|
| **Admin Authentication** | JWT-based login, token stored in localStorage, protected routes | `AdminAuthController.java`, `JwtService.java`, `SecurityConfig.java`, `AdminLoginPage.tsx` |
| **Dashboard** | KPIs: total customers, devices, routers, revenue, active sessions | `DashboardService.java`, `AdminDashboardPage.tsx` |
| **Customer Management** | List, view details, linked devices & payment history per customer | `AdminCustomerController.java`, `CustomersPage.tsx`, `CustomerDetailsPage.tsx` |
| **Device Management** | List devices, block/unblock devices | `AdminDeviceController.java`, `DevicesPage.tsx` |
| **Plan CRUD** | Create, update, delete internet plans with bandwidth profiles | `AdminPlanController.java`, `PlansManagementPage.tsx` |
| **Payment History** | Paginated payment log with status, provider, and timestamps | `AdminPaymentController.java`, `PaymentsPage.tsx` |
| **Session Management** | View and manually terminate active sessions | `AdminSessionController.java`, `SessionsPage.tsx` |
| **Router Management** | Auto-registration, heartbeat monitoring, enable/disable routers | `RouterNodeService.java`, `AdminRouterController.java`, `RouterListPage.tsx`, `RouterDetailsPage.tsx` |
| **Access Point Monitoring** | View WiFi access points per router with signal quality & user counts | `RouterMonitoringService.java`, `AccessPointsPage.tsx` |
| **Connected Users** | Live snapshot of devices connected to each router | `ConnectedUserMonitoringService.java`, `ConnectedUsersPage.tsx` |
| **RADIUS Session Accounting** | Track RADIUS sessions with bytes in/out, duration, start/stop times | `RadiusSessionService.java`, `RadiusSessionsPage.tsx` |
| **Site Management** | Geographic/organizational grouping of routers | `SiteService.java`, `SitesOverviewPage.tsx` |

### Infrastructure & Integrations

| Feature | Description | Key Files |
|---------|------------|-----------|
| **MikroTik REST API** | Create/remove hotspot users, disconnect MACs, fetch active users, system health | `DefaultMikroTikIntegrationService.java` |
| **MikroTik Captive Portal Flow** | Build continue URLs with RADIUS username/password for hotspot login | `MikroTikHotspotService.java` |
| **RADIUS Provisioning** | Create RADIUS accounts with bandwidth limits, credential rotation, disable on expiry | `RadiusProvisioningService.java` |
| **Router Heartbeat Agent** | Shell script running on MikroTik routers, sends health data to backend | `billunet-heartbeat.sh`, `RouterAgentController.java` |
| **Router Status Scheduler** | Marks routers as DEGRADED (2min) or OFFLINE (5min) based on last heartbeat | `RouterStatusScheduler.java`, `RouterNodeService.markOfflineRouters()` |
| **Session Expiry Scheduler** | Cron job (every minute) expires overdue access sessions | `AccessSessionExpiryScheduler.java` |
| **Admin Seeding** | Auto-creates admin user on first startup | `AdminBootstrap.java` |

---

## 4. Database Schema

### Core Tables

#### `customers`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| phone_number | VARCHAR(32) | NOT NULL, UNIQUE |
| phone_verified | BOOLEAN | NOT NULL, DEFAULT FALSE |
| full_name | VARCHAR(150) | |
| status | VARCHAR(32) | NOT NULL (ACTIVE, INACTIVE, SUSPENDED) |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

#### `devices`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| customer_id | BIGINT | NOT NULL, FK -> customers(id) |
| mac_address | VARCHAR(32) | NOT NULL, UNIQUE |
| device_name | VARCHAR(120) | |
| status | VARCHAR(32) | NOT NULL (ACTIVE, BLOCKED) |
| first_seen_at | TIMESTAMPTZ | NOT NULL |
| last_seen_at | TIMESTAMPTZ | NOT NULL |
| last_seen_ip | VARCHAR(64) | |
| notes | VARCHAR(300) | |

#### `plans`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| name | VARCHAR(120) | NOT NULL |
| description | VARCHAR(500) | |
| price | NUMERIC(12,2) | NOT NULL |
| duration_minutes | INTEGER | NOT NULL |
| active | BOOLEAN | NOT NULL, DEFAULT TRUE |
| download_mbps | INTEGER | |
| upload_mbps | INTEGER | |
| data_cap_mb | BIGINT | |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

**Seed data (V2 + V8):**
| Plan | Price | Duration | Download | Upload | Data Cap |
|------|-------|----------|----------|--------|----------|
| 1 Hour | 500 | 60 min | 5 Mbps | 2 Mbps | 1024 MB |
| 3 Hours | 1000 | 180 min | 10 Mbps | 5 Mbps | 3072 MB |
| 1 Day | 2000 | 1440 min | 5 Mbps | 2 Mbps | 1024 MB |
| 7 Days | 10000 | 10080 min | 20 Mbps | 10 Mbps | Unlimited |

#### `payments`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| customer_id | BIGINT | NOT NULL, FK -> customers(id) |
| device_id | BIGINT | NOT NULL, FK -> devices(id) |
| plan_id | BIGINT | NOT NULL, FK -> plans(id) |
| amount | NUMERIC(12,2) | NOT NULL |
| provider | VARCHAR(64) | NOT NULL |
| provider_reference | VARCHAR(120) | NOT NULL |
| status | VARCHAR(32) | NOT NULL (PENDING, PAID, FAILED, REFUNDED) |
| requested_at | TIMESTAMPTZ | NOT NULL |
| confirmed_at | TIMESTAMPTZ | |
| raw_payload | TEXT | |
| router_node_id | BIGINT | FK -> router_nodes(id) |

#### `access_sessions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| customer_id | BIGINT | NOT NULL, FK -> customers(id) |
| device_id | BIGINT | NOT NULL, FK -> devices(id) |
| plan_id | BIGINT | NOT NULL, FK -> plans(id) |
| payment_id | BIGINT | NOT NULL, UNIQUE, FK -> payments(id) |
| status | VARCHAR(32) | NOT NULL (PENDING, ACTIVE, EXPIRED, TERMINATED) |
| start_time | TIMESTAMPTZ | NOT NULL |
| end_time | TIMESTAMPTZ | NOT NULL |
| granted_at | TIMESTAMPTZ | |
| terminated_at | TIMESTAMPTZ | |
| termination_reason | VARCHAR(200) | |
| router_session_ref | VARCHAR(120) | |
| router_node_id | BIGINT | FK -> router_nodes(id) |

#### `otp_verifications`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| phone_number | VARCHAR(32) | NOT NULL |
| otp_hash | VARCHAR(200) | NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| used | BOOLEAN | NOT NULL, DEFAULT FALSE |
| attempts | INTEGER | NOT NULL, DEFAULT 0 |
| mac_address | VARCHAR(32) | |
| created_at | TIMESTAMPTZ | NOT NULL |

#### `admin_users`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| email | VARCHAR(150) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(200) | NOT NULL |
| active | BOOLEAN | NOT NULL, DEFAULT TRUE |
| role | VARCHAR(32) | NOT NULL, DEFAULT 'SUPER_ADMIN' |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

### Router & Monitoring Tables

#### `router_nodes`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| router_code | VARCHAR(120) | NOT NULL, UNIQUE |
| name | VARCHAR(160) | |
| location_name | VARCHAR(160) | |
| location_code | VARCHAR(80) | |
| site_id | BIGINT | FK -> sites(id) |
| site_name | VARCHAR(160) | |
| gateway_name | VARCHAR(180) | |
| status | VARCHAR(32) | NOT NULL (ONLINE, DEGRADED, OFFLINE, DISABLED, DISCOVERED) |
| wan_ip | VARCHAR(64) | |
| lan_ip | VARCHAR(64) | |
| public_ip | VARCHAR(64) | |
| connected_clients | INTEGER | NOT NULL, DEFAULT 0 |
| authenticated_clients | INTEGER | NOT NULL, DEFAULT 0 |
| uptime_seconds | BIGINT | |
| mikrotik_running | BOOLEAN | |
| router_model | VARCHAR(120) | |
| router_os_version | VARCHAR(64) | |
| serial_number | VARCHAR(120) | |
| cpu_usage | INTEGER | |
| memory_usage | INTEGER | |
| latitude | DOUBLE PRECISION | |
| longitude | DOUBLE PRECISION | |
| last_seen_at | TIMESTAMPTZ | |
| first_seen_at | TIMESTAMPTZ | NOT NULL |
| auto_registered | BOOLEAN | NOT NULL, DEFAULT TRUE |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

#### `router_access_points`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| router_id | BIGINT | NOT NULL, FK -> router_nodes(id) ON DELETE CASCADE |
| ap_code | VARCHAR(80) | NOT NULL |
| ap_name | VARCHAR(160) | |
| mac_address | VARCHAR(32) | |
| ip_address | VARCHAR(64) | |
| status | VARCHAR(32) | NOT NULL (ONLINE, OFFLINE, DEGRADED) |
| signal_quality | INTEGER | |
| connected_users | INTEGER | NOT NULL, DEFAULT 0 |
| latitude/longitude | DOUBLE PRECISION | |
| last_seen_at | TIMESTAMPTZ | |
| created_at/updated_at | TIMESTAMPTZ | NOT NULL |
| | | UNIQUE(router_id, ap_code) |

#### `sites`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| code | VARCHAR(80) | NOT NULL, UNIQUE |
| name | VARCHAR(160) | NOT NULL |
| region | VARCHAR(120) | |
| address | VARCHAR(500) | |
| latitude | DOUBLE PRECISION | |
| longitude | DOUBLE PRECISION | |
| created_at/updated_at | TIMESTAMPTZ | NOT NULL |

#### `radius_accounts`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| username | VARCHAR(120) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| password_plain | VARCHAR(255) | |
| customer_id | BIGINT | NOT NULL, FK -> customers(id) |
| device_id | BIGINT | NOT NULL, FK -> devices(id) |
| enabled | BOOLEAN | NOT NULL, DEFAULT TRUE |
| expires_at | TIMESTAMPTZ | |
| download_mbps | INTEGER | |
| upload_mbps | INTEGER | |
| data_cap_mb | BIGINT | |
| created_at/updated_at | TIMESTAMPTZ | NOT NULL |

#### `radius_sessions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| username | VARCHAR(120) | NOT NULL |
| session_id | VARCHAR(120) | NOT NULL, UNIQUE |
| access_session_id | BIGINT | FK -> access_sessions(id) |
| router_node_id | BIGINT | FK -> router_nodes(id) |
| start_time | TIMESTAMPTZ | NOT NULL |
| stop_time | TIMESTAMPTZ | |
| bytes_in | BIGINT | NOT NULL, DEFAULT 0 |
| bytes_out | BIGINT | NOT NULL, DEFAULT 0 |
| duration_seconds | BIGINT | |
| created_at/updated_at | TIMESTAMPTZ | NOT NULL |

#### `connected_user_snapshots`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| router_node_id | BIGINT | NOT NULL, FK -> router_nodes(id) ON DELETE CASCADE |
| access_point_id | BIGINT | FK -> router_access_points(id) ON DELETE SET NULL |
| customer_id | BIGINT | FK -> customers(id) ON DELETE SET NULL |
| device_id | BIGINT | FK -> devices(id) ON DELETE SET NULL |
| mac_address | VARCHAR(32) | NOT NULL |
| ip_address | VARCHAR(64) | |
| signal_quality | INTEGER | |
| authenticated | BOOLEAN | NOT NULL, DEFAULT FALSE |
| connected_at/last_seen_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

#### `portal_sessions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PRIMARY KEY |
| client_mac | VARCHAR(32) | NOT NULL |
| client_ip | VARCHAR(64) | |
| gateway_name | VARCHAR(120) | |
| auth_action | VARCHAR(300) | |
| redir | TEXT | |
| token | TEXT | |
| router_node_id | BIGINT | FK -> router_nodes(id) |
| router_code | VARCHAR(120) | |
| router_name | VARCHAR(160) | |
| link_login | TEXT | |
| link_orig | TEXT | |
| ssid | VARCHAR(120) | |
| created_at | TIMESTAMPTZ | NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |

#### `captive_request_logs`
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| mac_address | VARCHAR(32) | |
| client_ip | VARCHAR(64) | |
| gateway_name | VARCHAR(120) | |
| token | VARCHAR(300) | |
| redir | TEXT | |
| auth_action | VARCHAR(300) | |
| result_status | VARCHAR(64) | NOT NULL |
| router_node_id | BIGINT | FK -> router_nodes(id) |
| router_name | VARCHAR(160) | |
| link_login | TEXT | |
| link_orig | TEXT | |
| ssid | VARCHAR(120) | |
| created_at | TIMESTAMPTZ | NOT NULL |

### Relationships Diagram

```
customers 1──N devices 1──N payments
    │               │           │
    │               │           └── 1──1 access_sessions
    │               │
    │               └── 1──1 radius_accounts
    │
    └── 1──N access_sessions

plans 1──N payments
plans 1──N access_sessions

sites 1──N router_nodes 1──N router_access_points
                │
                ├── 1──N connected_user_snapshots
                ├── 1──N radius_sessions
                ├── 1──N portal_sessions
                ├── 1──N access_sessions
                ├── 1──N payments
                └── 1──N captive_request_logs
```

---

## 5. Main Code Files

### 5.1 `backend/src/main/java/com/wifi/portal/service/CaptivePortalService.java`

Core captive portal logic: identifies devices, determines portal flow state, resolves continue URLs, handles MikroTik authorization.

```java
package com.wifi.portal.service;

import com.wifi.portal.dto.CaptiveDtos;
import com.wifi.portal.entity.AccessSession;
import com.wifi.portal.entity.Device;
import com.wifi.portal.entity.DeviceStatus;
import com.wifi.portal.entity.PortalNextStep;
import com.wifi.portal.exception.ApiException;
import com.wifi.portal.integration.mikrotik.MikroTikHotspotService;
import com.wifi.portal.repository.DeviceRepository;
import com.wifi.portal.repository.RadiusAccountRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CaptivePortalService {

    private final DeviceRepository deviceRepository;
    private final DeviceService deviceService;
    private final AccessSessionService accessSessionService;
    private final PortalContextService portalContextService;
    private final MikroTikHotspotService mikroTikHotspotService;
    private final PlanService planService;
    private final RadiusAccountRepository radiusAccountRepository;
    private final RadiusProvisioningService radiusProvisioningService;
    private final Clock clock;

    public CaptivePortalService(
            DeviceRepository deviceRepository,
            DeviceService deviceService,
            AccessSessionService accessSessionService,
            PortalContextService portalContextService,
            MikroTikHotspotService mikroTikHotspotService,
            PlanService planService,
            RadiusAccountRepository radiusAccountRepository,
            RadiusProvisioningService radiusProvisioningService,
            Clock clock
    ) {
        this.deviceRepository = deviceRepository;
        this.deviceService = deviceService;
        this.accessSessionService = accessSessionService;
        this.portalContextService = portalContextService;
        this.mikroTikHotspotService = mikroTikHotspotService;
        this.planService = planService;
        this.radiusAccountRepository = radiusAccountRepository;
        this.radiusProvisioningService = radiusProvisioningService;
        this.clock = clock;
    }

    @Transactional
    public CaptiveDtos.IdentifyResponse identify(CaptiveDtos.IdentifyRequest request) {
        String normalizedMac = IdentifierNormalizer.normalizeMac(request.macAddress());
        Optional<Device> deviceOptional = deviceRepository.findByMacAddress(normalizedMac);

        if (deviceOptional.isEmpty()) {
            CaptiveDtos.PortalContext portalContext = portalContextService.capture(request, PortalNextStep.NEW_DEVICE_REQUIRES_OTP.name());
            return new CaptiveDtos.IdentifyResponse(
                    PortalNextStep.NEW_DEVICE_REQUIRES_OTP.name(),
                    portalContext,
                    "New device detected. Phone verification is required.",
                    null,
                    new CaptiveDtos.DeviceSummary(null, normalizedMac, "UNKNOWN"),
                    null,
                    null,
                    null
            );
        }

        Device device = deviceOptional.get();
        deviceService.recordSeen(device, request.clientIp());
        if (device.getStatus() == DeviceStatus.BLOCKED) {
            CaptiveDtos.PortalContext portalContext = portalContextService.capture(request, PortalNextStep.BLOCKED_DEVICE.name());
            return new CaptiveDtos.IdentifyResponse(
                    PortalNextStep.BLOCKED_DEVICE.name(),
                    portalContext,
                    "This device is blocked.",
                    toCustomerSummary(device),
                    toDeviceSummary(device),
                    null,
                    null,
                    null
            );
        }

        Optional<AccessSession> activeSession = accessSessionService.findActiveSession(device);
        if (activeSession.isPresent()) {
            CaptiveDtos.PortalContext portalContext = portalContextService.capture(request, PortalNextStep.KNOWN_ACTIVE_SESSION.name());
            return new CaptiveDtos.IdentifyResponse(
                    PortalNextStep.KNOWN_ACTIVE_SESSION.name(),
                    portalContext,
                    "Active internet session found.",
                    toCustomerSummary(device),
                    toDeviceSummary(device),
                    toPlanSummary(activeSession.get()),
                    toSessionSummary(activeSession.get(), portalContext),
                    accessSessionService.remainingMinutes(activeSession.get())
            );
        }

        PortalNextStep nextStep = accessSessionService.findLatestSession(device)
                .filter(session -> session.getEndTime().isBefore(Instant.now(clock)) || session.getStatus().name().equals("EXPIRED"))
                .map(session -> PortalNextStep.SESSION_EXPIRED)
                .orElse(PortalNextStep.KNOWN_NO_ACTIVE_PLAN);

        CaptiveDtos.PortalContext portalContext = portalContextService.capture(request, nextStep.name());
        return new CaptiveDtos.IdentifyResponse(
                nextStep.name(),
                portalContext,
                nextStep == PortalNextStep.SESSION_EXPIRED ? "Previous session has expired." : "No active plan found for this device.",
                toCustomerSummary(device),
                toDeviceSummary(device),
                null,
                null,
                null
        );
    }

    @Transactional(readOnly = true)
    public CaptiveDtos.PortalStatusResponse getPortalStatus(CaptiveDtos.PortalStatusRequest request) {
        String normalizedMac = IdentifierNormalizer.normalizeMac(request.macAddress());
        CaptiveDtos.PortalContext portalContext = portalContextService.mergeWithLatestContext(request);
        Device device = deviceRepository.findByMacAddress(normalizedMac).orElse(null);
        if (device == null) {
            return emptyStatus(portalContext, normalizedMac, PortalNextStep.NEW_DEVICE_REQUIRES_OTP.name());
        }
        if (device.getStatus() == DeviceStatus.BLOCKED) {
            return statusForDevice(device, portalContext, PortalNextStep.BLOCKED_DEVICE.name(), false, null);
        }

        Optional<AccessSession> activeSession = accessSessionService.findActiveSession(device);
        if (activeSession.isPresent()) {
            AccessSession session = activeSession.get();
            String continueUrl = resolveContinueUrl(device, portalContext);
            return new CaptiveDtos.PortalStatusResponse(
                    toCustomerSummary(device),
                    toDeviceSummary(device),
                    toPlanSummary(session),
                    toSessionSummary(session, portalContext, continueUrl),
                    true,
                    accessSessionService.remainingMinutes(session),
                    session.getPlan().getName(),
                    session.getEndTime(),
                    continueUrl,
                    PortalNextStep.KNOWN_ACTIVE_SESSION.name(),
                    device.getMacAddress(),
                    device.getCustomer().getPhoneNumber(),
                    portalContext.authAction(),
                    portalContext.token(),
                    portalContext.redir(),
                    portalContext.routerCode(),
                    portalContext.locationCode(),
                    portalContext.routerName(),
                    portalContext.linkLogin(),
                    portalContext.linkOrig(),
                    portalContext.ssid()
            );
        }

        PortalNextStep nextStep = accessSessionService.findLatestSession(device)
                .filter(session -> session.getEndTime().isBefore(Instant.now(clock)) || session.getStatus().name().equals("EXPIRED"))
                .map(session -> PortalNextStep.SESSION_EXPIRED)
                .orElse(PortalNextStep.KNOWN_NO_ACTIVE_PLAN);
        return statusForDevice(device, portalContext, nextStep.name(), false, null);
    }

    @Transactional
    public CaptiveDtos.ContinueResponse continueAccess(CaptiveDtos.ContinueRequest request) {
        String normalizedMac = IdentifierNormalizer.normalizeMac(request.macAddress());
        Device device = deviceRepository.findByMacAddress(normalizedMac)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEVICE_NOT_FOUND", "Device not found."));
        if (device.getStatus() == DeviceStatus.BLOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "BLOCKED_DEVICE", "Blocked devices cannot continue.");
        }
        AccessSession session = accessSessionService.findActiveSession(device)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "NO_ACTIVE_SESSION", "No active session found for this device."));

        CaptiveDtos.PortalContext context = portalContextService.capture(request, PortalNextStep.KNOWN_ACTIVE_SESSION.name());
        String username = radiusAccountRepository.findByDeviceId(device.getId())
                .map(account -> account.getUsername())
                .orElseGet(() -> radiusProvisioningService.buildUsername(device));
        String password = null;
        if (radiusAccountRepository.findByDeviceId(device.getId()).isPresent()) {
            RadiusProvisioningService.RadiusCredentials credentials = radiusProvisioningService.rotateCredentials(
                    device,
                    session.getPlan(),
                    session.getEndTime()
            );
            username = credentials.account().getUsername();
            password = credentials.plainPassword();
        }
        MikroTikHotspotService.MikroTikAuthorizationResult result = mikroTikHotspotService.authorizeClient(session, context, username, password);
        if (result.routerSessionRef() != null) {
            accessSessionService.attachRouterReference(session, result.routerSessionRef());
        }
        return new CaptiveDtos.ContinueResponse(result.allowed(), result.continueUrl(), result.message());
    }

    private String resolveContinueUrl(Device device, CaptiveDtos.PortalContext portalContext) {
        return mikroTikHotspotService.buildContinueUrl(portalContext);
    }

    private CaptiveDtos.PortalStatusResponse emptyStatus(CaptiveDtos.PortalContext portalContext, String mac, String nextStep) {
        return new CaptiveDtos.PortalStatusResponse(
                null, new CaptiveDtos.DeviceSummary(null, mac, "UNKNOWN"), null, null,
                false, null, null, null, null, nextStep, mac, null,
                portalContext.authAction(), portalContext.token(), portalContext.redir(),
                portalContext.routerCode(), portalContext.locationCode(), portalContext.routerName(),
                portalContext.linkLogin(), portalContext.linkOrig(), portalContext.ssid()
        );
    }

    private CaptiveDtos.PortalStatusResponse statusForDevice(Device device, CaptiveDtos.PortalContext portalContext, String nextStep, boolean hasActiveSession, CaptiveDtos.SessionSummary sessionSummary) {
        return new CaptiveDtos.PortalStatusResponse(
                toCustomerSummary(device), toDeviceSummary(device), null, sessionSummary,
                hasActiveSession, null, null, null, null, nextStep,
                device.getMacAddress(), device.getCustomer().getPhoneNumber(),
                portalContext.authAction(), portalContext.token(), portalContext.redir(),
                portalContext.routerCode(), portalContext.locationCode(), portalContext.routerName(),
                portalContext.linkLogin(), portalContext.linkOrig(), portalContext.ssid()
        );
    }

    private CaptiveDtos.CustomerSummary toCustomerSummary(Device device) {
        return new CaptiveDtos.CustomerSummary(device.getCustomer().getId(), device.getCustomer().getPhoneNumber(), device.getCustomer().isPhoneVerified(), device.getCustomer().getStatus().name());
    }

    private CaptiveDtos.DeviceSummary toDeviceSummary(Device device) {
        return new CaptiveDtos.DeviceSummary(device.getId(), device.getMacAddress(), device.getStatus().name());
    }

    private CaptiveDtos.PlanSummary toPlanSummary(AccessSession session) {
        return new CaptiveDtos.PlanSummary(session.getPlan().getId(), session.getPlan().getName(), session.getPlan().getDescription(), planService.formatTzs(session.getPlan().getPrice()), session.getPlan().getDurationMinutes(), session.getPlan().getDownloadMbps(), session.getPlan().getUploadMbps(), session.getPlan().getDataCapMb());
    }

    private CaptiveDtos.SessionSummary toSessionSummary(AccessSession session, CaptiveDtos.PortalContext portalContext) {
        return toSessionSummary(session, portalContext, mikroTikHotspotService.buildContinueUrl(portalContext));
    }

    private CaptiveDtos.SessionSummary toSessionSummary(AccessSession session, CaptiveDtos.PortalContext portalContext, String continueUrl) {
        return new CaptiveDtos.SessionSummary(session.getId(), session.getStatus().name(), session.getStartTime(), session.getEndTime(), accessSessionService.remainingMinutes(session), continueUrl);
    }
}
```

### 5.2 `backend/src/main/java/com/wifi/portal/service/OtpService.java`

OTP generation, verification, rate limiting, and device swap logic.

```java
package com.wifi.portal.service;

import com.wifi.portal.config.AppProperties;
import com.wifi.portal.dto.AuthDtos;
import com.wifi.portal.entity.AccessSession;
import com.wifi.portal.entity.Customer;
import com.wifi.portal.entity.OtpVerification;
import com.wifi.portal.entity.PortalNextStep;
import com.wifi.portal.exception.ApiException;
import com.wifi.portal.integration.SmsSender;
import com.wifi.portal.repository.OtpVerificationRepository;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OtpService {

    private final OtpVerificationRepository otpVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final SmsSender smsSender;
    private final CustomerService customerService;
    private final DeviceService deviceService;
    private final AccessSessionService accessSessionService;
    private final PortalContextService portalContextService;
    private final AppProperties appProperties;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public OtpService(
            OtpVerificationRepository otpVerificationRepository,
            PasswordEncoder passwordEncoder,
            SmsSender smsSender,
            CustomerService customerService,
            DeviceService deviceService,
            AccessSessionService accessSessionService,
            PortalContextService portalContextService,
            AppProperties appProperties,
            Clock clock
    ) {
        this.otpVerificationRepository = otpVerificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.smsSender = smsSender;
        this.customerService = customerService;
        this.deviceService = deviceService;
        this.accessSessionService = accessSessionService;
        this.portalContextService = portalContextService;
        this.appProperties = appProperties;
        this.clock = clock;
    }

    @Transactional
    public AuthDtos.SimpleActionResponse sendOtp(AuthDtos.SendOtpRequest request) {
        String phone = IdentifierNormalizer.normalizePhone(request.phoneNumber());
        String mac = IdentifierNormalizer.normalizeMac(request.macAddress());
        Instant now = Instant.now(clock);
        Instant oneHourAgo = now.minus(Duration.ofHours(1));

        if (otpVerificationRepository.countByPhoneNumberAndCreatedAtAfter(phone, oneHourAgo) >= appProperties.getOtp().getHourlyRateLimit()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_PHONE_RATE_LIMIT", "OTP request limit reached for this phone number.");
        }
        if (otpVerificationRepository.countByMacAddressAndCreatedAtAfter(mac, oneHourAgo) >= appProperties.getOtp().getHourlyRateLimit()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_MAC_RATE_LIMIT", "OTP request limit reached for this device.");
        }

        OtpVerification latest = otpVerificationRepository.findTopByPhoneNumberAndMacAddressOrderByCreatedAtDesc(phone, mac).orElse(null);
        if (latest != null) {
            long elapsed = Duration.between(latest.getCreatedAt(), now).getSeconds();
            long cooldown = appProperties.getOtp().getResendCooldownSeconds() - elapsed;
            if (cooldown > 0) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_COOLDOWN_ACTIVE", "OTP resend cooldown active for " + cooldown + " seconds.");
            }
        }

        String otpCode = generateOtp();
        OtpVerification verification = new OtpVerification();
        verification.setPhoneNumber(phone);
        verification.setMacAddress(mac);
        verification.setOtpHash(passwordEncoder.encode(otpCode));
        verification.setExpiresAt(now.plus(Duration.ofMinutes(appProperties.getOtp().getExpiryMinutes())));
        verification.setUsed(false);
        verification.setAttempts(0);
        verification.setCreatedAt(now);
        otpVerificationRepository.save(verification);
        smsSender.sendOtp(phone, otpCode);
        portalContextService.capture(request, "OTP_SENT");

        return new AuthDtos.SimpleActionResponse(true, appProperties.getOtp().getResendCooldownSeconds(), "OTP sent successfully.");
    }

    @Transactional
    public AuthDtos.VerifyOtpResponse verifyOtp(AuthDtos.VerifyOtpRequest request) {
        String phone = IdentifierNormalizer.normalizePhone(request.phoneNumber());
        String mac = IdentifierNormalizer.normalizeMac(request.macAddress());
        Instant now = Instant.now(clock);

        OtpVerification verification = otpVerificationRepository.findTopByPhoneNumberAndMacAddressOrderByCreatedAtDesc(phone, mac)
                .or(() -> otpVerificationRepository.findTopByPhoneNumberOrderByCreatedAtDesc(phone))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "OTP_NOT_FOUND", "No OTP request found for this phone number."));

        if (verification.isUsed()) {
            throw new ApiException(HttpStatus.CONFLICT, "OTP_ALREADY_USED", "OTP code has already been used.");
        }
        if (verification.getExpiresAt().isBefore(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_EXPIRED", "OTP code has expired.");
        }
        if (verification.getAttempts() >= appProperties.getOtp().getMaxAttempts()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_ATTEMPTS_EXCEEDED", "Maximum OTP verification attempts exceeded.");
        }
        if (!passwordEncoder.matches(request.otp(), verification.getOtpHash())) {
            verification.setAttempts(verification.getAttempts() + 1);
            otpVerificationRepository.save(verification);
            throw new ApiException(HttpStatus.BAD_REQUEST, "WRONG_OTP", "Incorrect OTP code.");
        }

        verification.setUsed(true);
        verification.setAttempts(verification.getAttempts() + 1);
        otpVerificationRepository.save(verification);

        Customer customer = customerService.findOrCreateVerifiedCustomer(phone);
        var existingDevice = deviceService.findByMacAddress(mac);
        if (existingDevice != null && !existingDevice.getCustomer().getId().equals(customer.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "DEVICE_RELINK_FORBIDDEN", "This device already belongs to another customer.");
        }
        var device = deviceService.linkDevice(customer, mac, null);
        var swapCandidate = accessSessionService.findActiveSessionForCustomerExcludingDevice(customer, device)
                .map(this::toSwapCandidate);

        String nextStep = swapCandidate.isPresent() ? PortalNextStep.SWAP_OR_BUY.name() : PortalNextStep.KNOWN_NO_ACTIVE_PLAN.name();
        portalContextService.capture(request, nextStep);

        return new AuthDtos.VerifyOtpResponse(true, customer.getId(), device.getId(), nextStep, customer.getPhoneNumber(), device.getMacAddress(), swapCandidate.orElse(null));
    }

    @Transactional
    public AuthDtos.SwapDeviceResponse swapDevice(AuthDtos.SwapDeviceRequest request) {
        Customer customer = customerService.requireCustomer(request.customerId());
        var targetDevice = deviceService.requireDevice(request.deviceId());
        if (!targetDevice.getCustomer().getId().equals(customer.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DEVICE_CUSTOMER_MISMATCH", "Device does not belong to the verified customer.");
        }
        String normalizedMac = IdentifierNormalizer.normalizeMac(request.macAddress());
        if (!targetDevice.getMacAddress().equals(normalizedMac)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DEVICE_MAC_MISMATCH", "Router MAC context does not match the verified device.");
        }
        var session = accessSessionService.swapActiveSessionToDevice(customer, targetDevice);
        deviceService.recordSeen(targetDevice, request.clientIp());
        portalContextService.capture(request, PortalNextStep.KNOWN_ACTIVE_SESSION.name());
        return new AuthDtos.SwapDeviceResponse(true, session.getId(), PortalNextStep.KNOWN_ACTIVE_SESSION.name(), "Active plan moved to this device.");
    }

    private String generateOtp() {
        int code = secureRandom.nextInt(900000) + 100000;
        return Integer.toString(code);
    }

    private AuthDtos.SwapCandidate toSwapCandidate(AccessSession session) {
        return new AuthDtos.SwapCandidate(session.getId(), session.getDevice().getId(), session.getDevice().getMacAddress(), session.getPlan().getName(), session.getEndTime(), accessSessionService.remainingMinutes(session));
    }
}
```

### 5.3 `backend/src/main/java/com/wifi/portal/service/PaymentService.java`

Payment initiation, mock confirmation, and plan activation orchestration.

```java
package com.wifi.portal.service;

import com.wifi.portal.dto.ApiPage;
import com.wifi.portal.dto.CaptiveDtos;
import com.wifi.portal.dto.PaymentDtos;
import com.wifi.portal.integration.mikrotik.MikroTikHotspotService;
import com.wifi.portal.entity.Device;
import com.wifi.portal.service.RadiusProvisioningService;
import com.wifi.portal.entity.DeviceStatus;
import com.wifi.portal.entity.Payment;
import com.wifi.portal.entity.PaymentStatus;
import com.wifi.portal.entity.RouterNode;
import com.wifi.portal.exception.ApiException;
import com.wifi.portal.integration.PaymentProvider;
import com.wifi.portal.integration.PaymentProviderResponse;
import com.wifi.portal.repository.PaymentRepository;
import java.time.Clock;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final CustomerService customerService;
    private final DeviceService deviceService;
    private final PlanService planService;
    private final PaymentProvider paymentProvider;
    private final AccessSessionService accessSessionService;
    private final PortalContextService portalContextService;
    private final RouterNodeService routerNodeService;
    private final PlanActivationService planActivationService;
    private final MikroTikHotspotService mikroTikHotspotService;
    private final RadiusProvisioningService radiusProvisioningService;
    private final Clock clock;

    public PaymentService(
            PaymentRepository paymentRepository, CustomerService customerService,
            DeviceService deviceService, PlanService planService,
            PaymentProvider paymentProvider, AccessSessionService accessSessionService,
            PortalContextService portalContextService, RouterNodeService routerNodeService,
            PlanActivationService planActivationService, MikroTikHotspotService mikroTikHotspotService,
            RadiusProvisioningService radiusProvisioningService, Clock clock
    ) {
        this.paymentRepository = paymentRepository;
        this.customerService = customerService;
        this.deviceService = deviceService;
        this.planService = planService;
        this.paymentProvider = paymentProvider;
        this.accessSessionService = accessSessionService;
        this.portalContextService = portalContextService;
        this.routerNodeService = routerNodeService;
        this.planActivationService = planActivationService;
        this.mikroTikHotspotService = mikroTikHotspotService;
        this.radiusProvisioningService = radiusProvisioningService;
        this.clock = clock;
    }

    @Transactional
    public PaymentDtos.PaymentActionResponse initiatePayment(PaymentDtos.InitiatePaymentRequest request) {
        var customer = customerService.requireCustomer(request.customerId());
        Device device = deviceService.requireDevice(request.deviceId());
        var plan = planService.requireActivePlan(request.planId());
        if (!device.getCustomer().getId().equals(customer.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DEVICE_CUSTOMER_MISMATCH", "Device does not belong to the specified customer.");
        }
        if (!device.getMacAddress().equals(IdentifierNormalizer.normalizeMac(request.macAddress()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "DEVICE_MAC_MISMATCH", "Router MAC context does not match the selected device.");
        }
        if (device.getStatus() == DeviceStatus.BLOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "BLOCKED_DEVICE", "Blocked devices cannot purchase plans.");
        }
        if (accessSessionService.findActiveSession(device).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "SECOND_ACTIVE_PLAN_NOT_ALLOWED", "This device already has an active plan.");
        }

        Payment pendingPayment = paymentRepository.findFirstByDeviceAndStatusOrderByRequestedAtDesc(device, PaymentStatus.PENDING).orElse(null);
        if (pendingPayment != null) {
            if (!pendingPayment.getPlan().getId().equals(plan.getId())) {
                throw new ApiException(HttpStatus.CONFLICT, "PENDING_PAYMENT_EXISTS", "This device already has a pending payment for another plan.");
            }
            CaptiveDtos.PortalContext portalContext = portalContextService.capture(request, "PAYMENT_PENDING");
            RouterNode routerNode = routerNodeService.findEnabledByRouterCodeOrNull(portalContext.routerCode());
            attachRouterToPaymentIfMissing(pendingPayment, routerNode);
            return new PaymentDtos.PaymentActionResponse(toView(pendingPayment), null, "PAYMENT_PENDING", "Existing pending payment reused.");
        }

        CaptiveDtos.PortalContext portalContext = portalContextService.capture(request, "PAYMENT_PENDING");
        RouterNode routerNode = routerNodeService.findEnabledByRouterCodeOrNull(portalContext.routerCode());
        PaymentProviderResponse providerResponse = paymentProvider.initiate(customer, device, plan, plan.getPrice());
        Payment payment = new Payment();
        payment.setCustomer(customer);
        payment.setDevice(device);
        payment.setPlan(plan);
        payment.setAmount(plan.getPrice());
        payment.setProvider(providerResponse.provider());
        payment.setProviderReference(providerResponse.providerReference());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setRouterNode(routerNode);
        payment.setRequestedAt(Instant.now(clock));
        payment.setRawPayload(providerResponse.rawPayload());
        paymentRepository.save(payment);
        return new PaymentDtos.PaymentActionResponse(toView(payment), null, "PAYMENT_PENDING", "Payment initiated successfully.");
    }

    @Transactional
    public PaymentDtos.PaymentActionResponse confirmMockPayment(PaymentDtos.MockConfirmPaymentRequest request) {
        Payment payment = requirePayment(request.paymentId());
        if (!payment.getDevice().getMacAddress().equals(IdentifierNormalizer.normalizeMac(request.macAddress()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PAYMENT_MAC_MISMATCH", "Router MAC context does not match this payment.");
        }
        if (payment.getStatus() == PaymentStatus.PAID) {
            CaptiveDtos.PortalContext portalContext = portalContextService.capture(request, "KNOWN_ACTIVE_SESSION");
            RouterNode routerNode = routerNodeService.findEnabledByRouterCodeOrNull(portalContext.routerCode());
            attachRouterToPaymentIfMissing(payment, routerNode);
            var existingSession = accessSessionService.findByPaymentId(payment.getId()).orElse(null);
            if (existingSession != null && existingSession.getRouterNode() == null && payment.getRouterNode() != null) {
                accessSessionService.attachRouterNode(existingSession, payment.getRouterNode());
            }
            var radiusAccount = radiusProvisioningService.findByDevice(payment.getDevice()).orElse(null);
            String username = radiusAccount != null ? radiusAccount.getUsername() : null;
            String password = radiusAccount != null ? radiusAccount.getPasswordPlain() : null;
            String continueUrl = mikroTikHotspotService.buildContinueUrl(portalContext, username, password);
            return new PaymentDtos.PaymentActionResponse(toView(payment), existingSession == null ? null : existingSession.getId(), "KNOWN_ACTIVE_SESSION", "Payment already confirmed.", continueUrl, username, password);
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_NOT_CONFIRMABLE", "Only pending payments can be confirmed.");
        }
        CaptiveDtos.PortalContext portalContext = portalContextService.capture(request, "KNOWN_ACTIVE_SESSION");
        RouterNode routerNode = routerNodeService.findEnabledByRouterCodeOrNull(portalContext.routerCode());
        attachRouterToPaymentIfMissing(payment, routerNode);
        payment.setStatus(PaymentStatus.PAID);
        payment.setConfirmedAt(Instant.now(clock));
        paymentRepository.save(payment);
        PlanActivationService.ActivationResult activation = planActivationService.activatePaidPlan(payment);
        CaptiveDtos.PortalContext activationContext = portalContextService.capture(request, "KNOWN_ACTIVE_SESSION");
        String continueUrl = mikroTikHotspotService.buildContinueUrl(activationContext, activation.radiusUsername(), activation.radiusPassword());
        return new PaymentDtos.PaymentActionResponse(toView(payment), activation.session().getId(), "KNOWN_ACTIVE_SESSION", "Payment confirmed successfully.", continueUrl, activation.radiusUsername(), activation.radiusPassword());
    }

    @Transactional(readOnly = true)
    public Payment requirePayment(Long paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", "Payment not found."));
    }

    @Transactional(readOnly = true)
    public ApiPage<com.wifi.portal.dto.AdminDtos.PaymentListItem> getPayments(Pageable pageable) {
        Page<com.wifi.portal.dto.AdminDtos.PaymentListItem> page = paymentRepository.findAll(pageable)
                .map(payment -> new com.wifi.portal.dto.AdminDtos.PaymentListItem(
                        payment.getId(), payment.getCustomer().getId(), payment.getCustomer().getPhoneNumber(),
                        payment.getDevice().getId(), payment.getDevice().getMacAddress(),
                        payment.getPlan().getId(), payment.getPlan().getName(), payment.getAmount(),
                        payment.getProvider(), payment.getStatus().name(), payment.getRequestedAt(), payment.getConfirmedAt()));
        return ApiPage.from(page);
    }

    public PaymentDtos.PaymentView toView(Payment payment) {
        return new PaymentDtos.PaymentView(
                payment.getId(), payment.getCustomer().getId(), payment.getCustomer().getPhoneNumber(),
                payment.getDevice().getId(), payment.getDevice().getMacAddress(),
                payment.getPlan().getId(), payment.getPlan().getName(), payment.getAmount(),
                payment.getProvider(), payment.getProviderReference(), payment.getStatus().name(),
                payment.getRequestedAt(), payment.getConfirmedAt());
    }

    private void attachRouterToPaymentIfMissing(Payment payment, RouterNode routerNode) {
        if (payment.getRouterNode() == null && routerNode != null) {
            payment.setRouterNode(routerNode);
            paymentRepository.save(payment);
        }
    }
}
```

### 5.4 `backend/src/main/java/com/wifi/portal/integration/mikrotik/DefaultMikroTikIntegrationService.java`

MikroTik REST API client: creates/removes hotspot users, disconnects MACs, queries active users and system health.

```java
package com.wifi.portal.integration.mikrotik;

import com.wifi.portal.config.AppProperties;
import com.wifi.portal.entity.Device;
import com.wifi.portal.entity.Plan;
import com.wifi.portal.entity.RouterNode;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class DefaultMikroTikIntegrationService implements MikroTikIntegrationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(DefaultMikroTikIntegrationService.class);
    private final AppProperties appProperties;
    private final RestTemplate restTemplate;

    public DefaultMikroTikIntegrationService(AppProperties appProperties) {
        this.appProperties = appProperties;
        this.restTemplate = new RestTemplate();
    }

    @Override
    public HotspotUserResult createHotspotUser(RouterNode router, Device device, Plan plan, Instant expiresAt, String username, String password) {
        if (!appProperties.getMikrotik().isEnabled()) {
            LOGGER.info("MikroTik integration disabled; skipping hotspot user create [router={}, mac={}, user={}]", router.getRouterCode(), device.getMacAddress(), username);
            return new HotspotUserResult(true, "MikroTik integration disabled (simulated success)", "simulated-" + username);
        }
        try {
            String baseUrl = resolveRouterApiBase(router);
            HttpHeaders headers = basicAuthHeaders();
            var body = new MikroTikHotspotUserRequest(username, password, device.getMacAddress(), plan.getDownloadMbps(), plan.getUploadMbps(), expiresAt == null ? null : expiresAt.toString());
            ResponseEntity<String> response = restTemplate.exchange(baseUrl + "/ip/hotspot/user", HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            boolean ok = response.getStatusCode().is2xxSuccessful();
            return new HotspotUserResult(ok, ok ? "Hotspot user created" : "Hotspot user create failed", username);
        } catch (RestClientException exception) {
            LOGGER.warn("Failed to create MikroTik hotspot user on {}: {}", router.getRouterCode(), exception.getMessage());
            return new HotspotUserResult(false, exception.getMessage(), null);
        }
    }

    @Override
    public void removeHotspotUser(RouterNode router, String username) {
        if (!appProperties.getMikrotik().isEnabled()) { return; }
        try {
            String baseUrl = resolveRouterApiBase(router);
            restTemplate.exchange(baseUrl + "/ip/hotspot/user/" + username, HttpMethod.DELETE, new HttpEntity<>(basicAuthHeaders()), Void.class);
        } catch (RestClientException exception) {
            LOGGER.warn("Failed to remove MikroTik hotspot user {} on {}: {}", username, router.getRouterCode(), exception.getMessage());
        }
    }

    @Override
    public void disconnectUser(RouterNode router, String macAddress) {
        if (!appProperties.getMikrotik().isEnabled()) { return; }
        try {
            String baseUrl = resolveRouterApiBase(router);
            restTemplate.exchange(baseUrl + "/ip/hotspot/active/remove-mac", HttpMethod.POST, new HttpEntity<>(new DisconnectMacRequest(macAddress), basicAuthHeaders()), Void.class);
        } catch (RestClientException exception) {
            LOGGER.warn("Failed to disconnect {} on {}: {}", macAddress, router.getRouterCode(), exception.getMessage());
        }
    }

    @Override
    public List<ActiveHotspotUser> getActiveUsers(RouterNode router) {
        if (!appProperties.getMikrotik().isEnabled()) { return Collections.emptyList(); }
        try {
            String baseUrl = resolveRouterApiBase(router);
            ResponseEntity<ActiveHotspotUser[]> response = restTemplate.exchange(baseUrl + "/ip/hotspot/active", HttpMethod.GET, new HttpEntity<>(basicAuthHeaders()), ActiveHotspotUser[].class);
            return response.getBody() == null ? Collections.emptyList() : List.of(response.getBody());
        } catch (RestClientException exception) {
            LOGGER.warn("Failed to fetch active hotspot users on {}: {}", router.getRouterCode(), exception.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public List<ConnectedDevice> getConnectedDevices(RouterNode router) {
        if (!appProperties.getMikrotik().isEnabled()) { return Collections.emptyList(); }
        try {
            String baseUrl = resolveRouterApiBase(router);
            ResponseEntity<ConnectedDevice[]> response = restTemplate.exchange(baseUrl + "/interface/wireless/registration-table", HttpMethod.GET, new HttpEntity<>(basicAuthHeaders()), ConnectedDevice[].class);
            return response.getBody() == null ? Collections.emptyList() : List.of(response.getBody());
        } catch (RestClientException exception) {
            LOGGER.warn("Failed to fetch connected devices on {}: {}", router.getRouterCode(), exception.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public Optional<RouterHealth> getSystemHealth(RouterNode router) {
        if (router.getCpuUsage() != null && router.getMemoryUsage() != null && router.getUptimeSeconds() != null) {
            return Optional.of(new RouterHealth(router.getCpuUsage(), router.getMemoryUsage(), router.getUptimeSeconds(), router.getRouterOsVersion()));
        }
        if (!appProperties.getMikrotik().isEnabled()) { return Optional.empty(); }
        try {
            String baseUrl = resolveRouterApiBase(router);
            ResponseEntity<RouterHealth> response = restTemplate.exchange(baseUrl + "/system/resource", HttpMethod.GET, new HttpEntity<>(basicAuthHeaders()), RouterHealth.class);
            return Optional.ofNullable(response.getBody());
        } catch (RestClientException exception) {
            LOGGER.warn("Failed to fetch system health on {}: {}", router.getRouterCode(), exception.getMessage());
            return Optional.empty();
        }
    }

    private String resolveRouterApiBase(RouterNode router) {
        AppProperties.Mikrotik config = appProperties.getMikrotik();
        if (StringUtils.hasText(router.getLanIp())) {
            return "http://" + router.getLanIp().trim() + config.getRestApiPath();
        }
        return config.getDefaultApiBaseUrl();
    }

    private HttpHeaders basicAuthHeaders() {
        AppProperties.Mikrotik config = appProperties.getMikrotik();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBasicAuth(config.getApiUsername(), config.getApiPassword());
        return headers;
    }

    private record MikroTikHotspotUserRequest(String name, String password, String macAddress, Integer downloadMbps, Integer uploadMbps, String expiresAt) {}
    private record DisconnectMacRequest(String macAddress) {}
}
```

### 5.5 `backend/src/main/java/com/wifi/portal/integration/mikrotik/MikroTikHotspotService.java`

Builds MikroTik hotspot continue URLs with RADIUS credentials for captive portal login.

```java
package com.wifi.portal.integration.mikrotik;

import com.wifi.portal.dto.CaptiveDtos;
import com.wifi.portal.entity.AccessSession;
import com.wifi.portal.entity.Device;
import com.wifi.portal.entity.PortalNextStep;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class MikroTikHotspotService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MikroTikHotspotService.class);
    private final MikroTikIntegrationService mikroTikIntegrationService;

    public MikroTikHotspotService(MikroTikIntegrationService mikroTikIntegrationService) {
        this.mikroTikIntegrationService = mikroTikIntegrationService;
    }

    public MikroTikAuthorizationResult authorizeClient(AccessSession session, CaptiveDtos.PortalContext context, String username, String password) {
        String continueUrl = buildContinueUrl(context, username, password);
        if (!StringUtils.hasText(continueUrl)) {
            return new MikroTikAuthorizationResult(false, null, "Missing MikroTik link-login URL. Please reconnect to WiFi.", null);
        }
        return new MikroTikAuthorizationResult(true, continueUrl, "Client is eligible for internet access", session.getId() == null ? null : "session-" + session.getId());
    }

    public String buildContinueUrl(CaptiveDtos.PortalContext context) {
        return buildContinueUrl(context, null, null);
    }

    public String buildContinueUrl(CaptiveDtos.PortalContext context, String username, String password) {
        if (context == null) {
            LOGGER.warn("Unable to build MikroTik continue URL because portal context is missing.");
            return null;
        }
        String linkLogin = firstNonBlank(context.linkLogin(), context.authAction());
        if (!StringUtils.hasText(linkLogin)) {
            LOGGER.warn("Unable to build MikroTik continue URL because linkLogin is missing.");
            return null;
        }
        if (!StringUtils.hasText(username) || !StringUtils.hasText(password)) {
            if (StringUtils.hasText(context.linkOrig())) {
                return linkLogin + (linkLogin.contains("?") ? "&" : "?") + "dst=" + encode(context.linkOrig());
            }
            return linkLogin;
        }
        String separator = linkLogin.contains("?") ? "&" : "?";
        StringBuilder builder = new StringBuilder(linkLogin);
        builder.append(separator).append("username=").append(encode(username)).append("&password=").append(encode(password));
        if (StringUtils.hasText(context.linkOrig())) {
            builder.append("&dst=").append(encode(context.linkOrig()));
        }
        LOGGER.info("Generated MikroTik continue URL for MAC {}", context.macAddress());
        return builder.toString();
    }

    public MikroTikAuthorizationResult rejectClient(Device device, CaptiveDtos.PortalContext context, PortalNextStep nextStep) {
        String message = switch (nextStep) {
            case BLOCKED_DEVICE -> "Device is blocked";
            case NEW_DEVICE_REQUIRES_OTP -> "Device requires phone verification";
            case SWAP_OR_BUY -> "Device can buy a new plan or swap an existing active plan";
            case KNOWN_NO_ACTIVE_PLAN, SESSION_EXPIRED -> "Device has no active internet session";
            case KNOWN_ACTIVE_SESSION -> "Device already has an active session";
        };
        return new MikroTikAuthorizationResult(false, null, message, device == null ? null : "device-" + device.getId());
    }

    private String firstNonBlank(String primary, String fallback) {
        if (StringUtils.hasText(primary)) { return primary; }
        return StringUtils.hasText(fallback) ? fallback : null;
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public record MikroTikAuthorizationResult(boolean allowed, String continueUrl, String message, String routerSessionRef) {}
}
```

### 5.6 `backend/src/main/java/com/wifi/portal/service/PlanActivationService.java`

Orchestrates plan activation: creates session, provisions RADIUS account, creates MikroTik hotspot user.

```java
package com.wifi.portal.service;

import com.wifi.portal.entity.AccessSession;
import com.wifi.portal.entity.Device;
import com.wifi.portal.entity.DeviceStatus;
import com.wifi.portal.entity.Payment;
import com.wifi.portal.entity.Plan;
import com.wifi.portal.entity.RadiusAccount;
import com.wifi.portal.entity.RouterNode;
import com.wifi.portal.integration.mikrotik.MikroTikIntegrationService;
import com.wifi.portal.repository.DeviceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class PlanActivationService {

    private final AccessSessionService accessSessionService;
    private final RadiusProvisioningService radiusProvisioningService;
    private final MikroTikIntegrationService mikroTikIntegrationService;
    private final DeviceRepository deviceRepository;

    public PlanActivationService(
            AccessSessionService accessSessionService,
            RadiusProvisioningService radiusProvisioningService,
            MikroTikIntegrationService mikroTikIntegrationService,
            DeviceRepository deviceRepository
    ) {
        this.accessSessionService = accessSessionService;
        this.radiusProvisioningService = radiusProvisioningService;
        this.mikroTikIntegrationService = mikroTikIntegrationService;
        this.deviceRepository = deviceRepository;
    }

    @Transactional
    public ActivationResult activatePaidPlan(Payment payment) {
        AccessSession session = accessSessionService.createSessionFromPayment(payment);
        Device device = payment.getDevice();
        Plan plan = payment.getPlan();
        RouterNode router = payment.getRouterNode();

        RadiusProvisioningService.RadiusCredentials credentials = radiusProvisioningService.createRadiusUser(payment.getCustomer(), device, plan, session.getEndTime());
        String radiusPassword = credentials.plainPassword();
        String radiusUsername = credentials.account().getUsername();

        if (router != null) {
            mikroTikIntegrationService.createHotspotUser(router, device, plan, session.getEndTime(), radiusUsername, radiusPassword);
        }

        if (device.getStatus() != DeviceStatus.ACTIVE) {
            device.setStatus(DeviceStatus.ACTIVE);
            deviceRepository.save(device);
        }

        return new ActivationResult(session, radiusUsername, radiusPassword);
    }

    @Transactional
    public void deactivateDeviceAccess(Device device, RouterNode router) {
        radiusProvisioningService.disableRadiusUser(device);
        radiusProvisioningService.findByDevice(device).ifPresent(account -> {
            if (router != null && StringUtils.hasText(account.getUsername())) {
                mikroTikIntegrationService.removeHotspotUser(router, account.getUsername());
            }
            if (router != null) {
                mikroTikIntegrationService.disconnectUser(router, device.getMacAddress());
            }
        });
    }

    public record ActivationResult(AccessSession session, String radiusUsername, String radiusPassword) {}
}
```

### 5.7 `backend/src/main/java/com/wifi/portal/service/RadiusProvisioningService.java`

RADIUS account lifecycle: creates users with bandwidth limits, rotates credentials, disables expired accounts.

```java
package com.wifi.portal.service;

import com.wifi.portal.entity.AccessSession;
import com.wifi.portal.entity.Customer;
import com.wifi.portal.entity.Device;
import com.wifi.portal.entity.Plan;
import com.wifi.portal.entity.RadiusAccount;
import com.wifi.portal.repository.RadiusAccountRepository;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RadiusProvisioningService {

    private static final String PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private final RadiusAccountRepository radiusAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public RadiusProvisioningService(RadiusAccountRepository radiusAccountRepository, PasswordEncoder passwordEncoder, Clock clock) {
        this.radiusAccountRepository = radiusAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Transactional
    public RadiusCredentials createRadiusUser(Customer customer, Device device, Plan plan, Instant expiresAt) {
        String username = buildUsername(device);
        String plainPassword = generatePassword();
        RadiusAccount account = radiusAccountRepository.findByDeviceId(device.getId()).orElse(new RadiusAccount());
        account.setUsername(username);
        account.setPasswordHash(passwordEncoder.encode(plainPassword));
        account.setPasswordPlain(plainPassword);
        account.setCustomer(customer);
        account.setDevice(device);
        account.setEnabled(true);
        account.setExpiresAt(expiresAt);
        account.setDownloadMbps(plan.getDownloadMbps());
        account.setUploadMbps(plan.getUploadMbps());
        account.setDataCapMb(plan.getDataCapMb());
        RadiusAccount saved = radiusAccountRepository.save(account);
        return new RadiusCredentials(saved, plainPassword);
    }

    @Transactional
    public void disableRadiusUser(Device device) {
        radiusAccountRepository.findByDeviceId(device.getId()).ifPresent(account -> {
            account.setEnabled(false);
            account.setExpiresAt(Instant.now(clock));
            radiusAccountRepository.save(account);
        });
    }

    @Transactional
    public RadiusCredentials rotateCredentials(Device device, Plan plan, Instant expiresAt) {
        return createRadiusUser(device.getCustomer(), device, plan, expiresAt);
    }

    @Transactional
    public RadiusAccount updateRadiusExpiration(Device device, Plan plan, Instant expiresAt) {
        RadiusAccount account = radiusAccountRepository.findByDeviceId(device.getId())
                .orElseThrow(() -> new IllegalStateException("Radius account not found for device " + device.getId()));
        account.setEnabled(true);
        account.setExpiresAt(expiresAt);
        account.setDownloadMbps(plan.getDownloadMbps());
        account.setUploadMbps(plan.getUploadMbps());
        account.setDataCapMb(plan.getDataCapMb());
        return radiusAccountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public java.util.Optional<RadiusAccount> findByDevice(Device device) {
        return radiusAccountRepository.findByDeviceId(device.getId());
    }

    public String buildUsername(Device device) {
        String mac = device.getMacAddress().replace(":", "").replace("-", "").toLowerCase(Locale.ROOT);
        return "bn-" + mac;
    }

    private String generatePassword() {
        StringBuilder builder = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            builder.append(PASSWORD_ALPHABET.charAt(secureRandom.nextInt(PASSWORD_ALPHABET.length())));
        }
        return builder.toString();
    }

    public record RadiusCredentials(RadiusAccount account, String plainPassword) {}
}
```

### 5.8 `backend/src/main/java/com/wifi/portal/security/SecurityConfig.java`

Spring Security configuration: stateless JWT, CORS, public/admin route authorization.

```java
package com.wifi.portal.security;

import com.wifi.portal.config.AppProperties;
import com.wifi.portal.service.AdminUserService;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AdminUserService adminUserService;
    private final AppProperties appProperties;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, AdminUserService adminUserService, AppProperties appProperties) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.adminUserService = adminUserService;
        this.appProperties = appProperties;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/admin/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/error").permitAll()
                        .requestMatchers("/api/admin/**").authenticated()
                        .anyRequest().permitAll()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(adminUserService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        String allowedOrigin = appProperties.getCors().getAllowedOrigin();
        if (allowedOrigin != null && !allowedOrigin.isBlank()) {
            if ("*".equals(allowedOrigin)) {
                configuration.addAllowedOriginPattern("*");
            } else {
                configuration.setAllowedOriginPatterns(List.of(allowedOrigin));
            }
        }
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

### 5.9 `frontend-wifi/src/app/App.tsx`

Main React router configuration with all portal and admin routes.

```tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PortalLayout } from "../layouts/PortalLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { AdminRoute } from "../components/AdminRoute";
import { PortalLandingPage } from "../pages/PortalLandingPage";
import { PhoneVerificationPage } from "../pages/PhoneVerificationPage";
import { DeviceSwapChoicePage } from "../pages/DeviceSwapChoicePage";
import { PlanSelectionPage } from "../pages/PlanSelectionPage";
import { PaymentPage } from "../pages/PaymentPage";
import { SessionActivePage } from "../pages/SessionActivePage";
import { SessionExpiredPage } from "../pages/SessionExpiredPage";
import { BlockedDevicePage } from "../pages/BlockedDevicePage";
import { AdminLoginPage } from "../pages/AdminLoginPage";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { PlansManagementPage } from "../pages/PlansManagementPage";
import { CustomersPage } from "../pages/CustomersPage";
import { CustomerDetailsPage } from "../pages/CustomerDetailsPage";
import { DevicesPage } from "../pages/DevicesPage";
import { PaymentsPage } from "../pages/PaymentsPage";
import { SessionsPage } from "../pages/SessionsPage";
import { RouterListPage } from "../pages/RouterListPage";
import { RouterDetailsPage } from "../pages/RouterDetailsPage";
import { ConnectedUsersPage } from "../pages/ConnectedUsersPage";
import { AccessPointsPage } from "../pages/AccessPointsPage";
import { SitesOverviewPage } from "../pages/SitesOverviewPage";
import { RadiusSessionsPage } from "../pages/RadiusSessionsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PortalLayout />}>
          <Route index element={<PortalLandingPage />} />
          <Route path="/portal/verify-phone" element={<PhoneVerificationPage />} />
          <Route path="/portal/device-choice" element={<DeviceSwapChoicePage />} />
          <Route path="/portal/plans" element={<PlanSelectionPage />} />
          <Route path="/portal/payment" element={<PaymentPage />} />
          <Route path="/portal/session-active" element={<SessionActivePage />} />
          <Route path="/portal/session-expired" element={<SessionExpiredPage />} />
          <Route path="/portal/blocked" element={<BlockedDevicePage />} />
        </Route>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="plans" element={<PlansManagementPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:customerId" element={<CustomerDetailsPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="routers" element={<RouterListPage />} />
          <Route path="routers/:routerId" element={<RouterDetailsPage />} />
          <Route path="access-points" element={<AccessPointsPage />} />
          <Route path="connected-users" element={<ConnectedUsersPage />} />
          <Route path="radius-sessions" element={<RadiusSessionsPage />} />
          <Route path="sites" element={<SitesOverviewPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="sessions" element={<SessionsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 5.10 `frontend-wifi/src/context/PortalContext.tsx`

React context managing the captive portal session state, persisted in sessionStorage.

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Plan, PortalStore, SwapCandidate } from "../types/api";

const STORAGE_KEY = "billunet.portal.store";

interface PortalContextValue {
  store: PortalStore;
  setCaptiveContext: (payload: PortalStore["captive"]) => void;
  setVerifiedCustomer: (payload: { customerId: number; customerPhone: string; deviceId: number; macAddress: string }) => void;
  setSwapCandidate: (swapCandidate: SwapCandidate | null) => void;
  clearSwapCandidate: () => void;
  setSelectedPlan: (plan: Plan | null) => void;
  setPayment: (payment: PortalStore["payment"]) => void;
  resetPurchaseFlow: () => void;
}

const PortalContext = createContext<PortalContextValue | undefined>(undefined);

const initialStore: PortalStore = {
  captive: {},
  customerId: null,
  customerPhone: null,
  deviceId: null,
  swapCandidate: null,
  selectedPlan: null,
  payment: null,
};

function isCaptiveContextEqual(left: PortalStore["captive"], right: PortalStore["captive"]) {
  return (
    left.authAction === right.authAction && left.clientIp === right.clientIp &&
    left.gatewayName === right.gatewayName && left.token === right.token &&
    left.redir === right.redir && left.macAddress === right.macAddress &&
    left.routerCode === right.routerCode && left.locationCode === right.locationCode &&
    left.routerName === right.routerName && left.linkLogin === right.linkLogin &&
    left.linkOrig === right.linkOrig && left.ssid === right.ssid
  );
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<PortalStore>(() => {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PortalStore) : initialStore;
  });

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  const setCaptiveContext = useCallback((payload: PortalStore["captive"]) => {
    setStore((current) => {
      const nextCaptive = { ...current.captive, ...payload };
      if (isCaptiveContextEqual(current.captive, nextCaptive)) { return current; }
      return { ...current, captive: nextCaptive };
    });
  }, []);

  const setVerifiedCustomer = useCallback(
    ({ customerId, customerPhone, deviceId, macAddress }: { customerId: number; customerPhone: string; deviceId: number; macAddress: string }) => {
      setStore((current) => {
        const nextCaptive = current.captive.macAddress === macAddress ? current.captive : { ...current.captive, macAddress };
        if (current.customerId === customerId && current.customerPhone === customerPhone && current.deviceId === deviceId && nextCaptive === current.captive) { return current; }
        return { ...current, customerId, customerPhone, deviceId, captive: nextCaptive };
      });
    }, [],
  );

  const setSelectedPlan = useCallback((plan: Plan | null) => {
    setStore((current) => (current.selectedPlan === plan ? current : { ...current, selectedPlan: plan }));
  }, []);

  const setSwapCandidate = useCallback((swapCandidate: SwapCandidate | null) => {
    setStore((current) => (current.swapCandidate === swapCandidate ? current : { ...current, swapCandidate }));
  }, []);

  const clearSwapCandidate = useCallback(() => {
    setStore((current) => (current.swapCandidate === null ? current : { ...current, swapCandidate: null }));
  }, []);

  const setPayment = useCallback((payment: PortalStore["payment"]) => {
    setStore((current) => (current.payment === payment ? current : { ...current, payment }));
  }, []);

  const resetPurchaseFlow = useCallback(() => {
    setStore((current) => {
      if (current.selectedPlan === null && current.payment === null) { return current; }
      return { ...current, selectedPlan: null, payment: null };
    });
  }, []);

  const value = useMemo<PortalContextValue>(
    () => ({ store, setCaptiveContext, setVerifiedCustomer, setSwapCandidate, clearSwapCandidate, setSelectedPlan, setPayment, resetPurchaseFlow }),
    [clearSwapCandidate, resetPurchaseFlow, setCaptiveContext, setPayment, setSelectedPlan, setSwapCandidate, setVerifiedCustomer, store],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortalContext() {
  const context = useContext(PortalContext);
  if (!context) { throw new Error("PortalContext is not available"); }
  return context;
}
```

### 5.11 `router/billunet-heartbeat.sh`

Shell script deployed on MikroTik routers to send periodic heartbeat data to the backend.

```bash
#!/bin/sh
# BilluNet MikroTik router heartbeat agent
# Schedule via RouterOS scheduler or cron on a management host.

API_URL="${BILLUNET_API_URL:-https://api.billunet.com/api/router-agent/heartbeat}"
ROUTER_KEY="${BILLUNET_ROUTER_KEY:-change-router-agent-key}"
ROUTER_CODE="${BILLUNET_ROUTER_CODE:-DSM-KARUME-001}"
ROUTER_NAME="${BILLUNET_ROUTER_NAME:-BilluNet Router}"

payload=$(cat <<EOF
{
  "routerCode": "${ROUTER_CODE}",
  "routerName": "${ROUTER_NAME}",
  "locationCode": "${BILLUNET_LOCATION_CODE:-KARUME}",
  "locationName": "${BILLUNET_LOCATION_NAME:-Karume}",
  "siteName": "${BILLUNET_SITE_NAME:-Karume Site}",
  "wanIp": "${BILLUNET_WAN_IP:-}",
  "lanIp": "${BILLUNET_LAN_IP:-192.168.10.1}",
  "cpuUsage": ${BILLUNET_CPU_USAGE:-0},
  "memoryUsage": ${BILLUNET_MEMORY_USAGE:-0},
  "uptimeSeconds": ${BILLUNET_UPTIME_SECONDS:-0},
  "connectedUsers": ${BILLUNET_CONNECTED_USERS:-0},
  "authenticatedUsers": ${BILLUNET_AUTHENTICATED_USERS:-0},
  "routerOsVersion": "${BILLUNET_ROUTER_OS:-7.19}",
  "routerModel": "${BILLUNET_ROUTER_MODEL:-RB5009}",
  "serialNumber": "${BILLUNET_SERIAL:-}",
  "aps": [],
  "liveUsers": []
}
EOF
)

curl -sS -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -H "X-Router-Key: ${ROUTER_KEY}" \
  -d "${payload}"
```

### 5.12 `backend/src/main/java/com/wifi/portal/controller/RouterAgentController.java`

Receives heartbeat from router agents, validates the shared secret key using constant-time comparison.

```java
package com.wifi.portal.controller;

import com.wifi.portal.config.AppProperties;
import com.wifi.portal.dto.RouterDtos;
import com.wifi.portal.exception.ApiException;
import com.wifi.portal.service.RouterNodeService;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/router-agent")
public class RouterAgentController {

    private final RouterNodeService routerNodeService;
    private final AppProperties appProperties;

    public RouterAgentController(RouterNodeService routerNodeService, AppProperties appProperties) {
        this.routerNodeService = routerNodeService;
        this.appProperties = appProperties;
    }

    @PostMapping("/heartbeat")
    public RouterDtos.RouterSummaryResponse heartbeat(
            @RequestHeader(name = "X-Router-Key", required = false) String routerKey,
            @Valid @RequestBody RouterDtos.RouterHeartbeatRequest request
    ) {
        validateRouterKey(routerKey);
        return routerNodeService.updateHeartbeat(request);
    }

    private void validateRouterKey(String routerKey) {
        String configuredKey = appProperties.getRouter().getAgentKey();
        if (!StringUtils.hasText(configuredKey)) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "ROUTER_AGENT_KEY_NOT_CONFIGURED", "Router agent key is not configured.");
        }
        if (!StringUtils.hasText(routerKey) || !constantTimeEquals(configuredKey, routerKey)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_ROUTER_KEY", "Invalid router agent key.");
        }
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }
}
```

---

## 6. Configuration

### Backend Dependencies (`pom.xml`)

```xml
<dependencies>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>
    <dependency><groupId>org.springdoc</groupId><artifactId>springdoc-openapi-starter-webmvc-ui</artifactId><version>2.8.6</version></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-flyway</artifactId></dependency>
    <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-core</artifactId></dependency>
    <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-database-postgresql</artifactId></dependency>
    <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-api</artifactId><version>0.12.6</version></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-impl</artifactId><version>0.12.6</version><scope>runtime</scope></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-jackson</artifactId><version>0.12.6</version><scope>runtime</scope></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
    <dependency><groupId>org.springframework.security</groupId><artifactId>spring-security-test</artifactId><scope>test</scope></dependency>
</dependencies>
```

### Frontend Dependencies (`package.json`)

```json
{
  "dependencies": {
    "axios": "^1.9.0",
    "bootstrap": "^5.3.7",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-router-dom": "^7.6.3"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "@vitejs/plugin-react": "^5.0.2",
    "jsdom": "^26.1.0",
    "typescript": "^5.8.3",
    "vite": "^7.0.4",
    "vitest": "^3.2.4"
  }
}
```

### Environment Variables (`.env.example` - secrets masked)

```properties
DB_URL=jdbc:postgresql://localhost:5432/billunet
DB_USERNAME=your_db_user
DB_PASSWORD=********
SERVER_PORT=8081
FRONTEND_ORIGIN=http://localhost:5173
PORTAL_FRONTEND_URL=http://localhost:5173
JWT_SECRET=********************************
JWT_EXPIRES_HOURS=12
ADMIN_SEED_EMAIL=admin@billunet.com
ADMIN_SEED_PASSWORD=********
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_HOURLY_RATE_LIMIT=5
MOCK_PAYMENT_PROVIDER=MOCK_MOBILE_MONEY
MOCK_SMS_SENDER=BilluNet
PORTAL_SESSION_TTL_MINUTES=5
ROUTER_AGENT_KEY=********************************
MIKROTIK_API_ENABLED=true
MIKROTIK_API_USERNAME=portal-api
MIKROTIK_API_PASSWORD=********
MIKROTIK_API_BASE_URL=http://192.168.88.1/rest
```

### API Routes Summary

**Public (no auth required):**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/captive/identify` | Identify device by MAC, determine portal flow |
| GET | `/api/portal/status` | Get portal status with all MikroTik parameters |
| POST | `/api/captive/continue` | Continue to internet (get MikroTik login URL) |
| POST | `/api/auth/send-otp` | Send OTP to phone number |
| POST | `/api/auth/verify-otp` | Verify OTP and link device |
| POST | `/api/auth/swap-device` | Swap active session to current device |
| GET | `/api/plans/public` | List active plans |
| POST | `/api/payments/initiate` | Start payment for a plan |
| POST | `/api/payments/mock-confirm` | Confirm mock payment |
| POST | `/api/router-agent/heartbeat` | Router heartbeat (X-Router-Key auth) |

**Admin (JWT required):**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/auth/login` | Admin login |
| GET | `/api/admin/dashboard/summary` | Dashboard KPIs |
| CRUD | `/api/admin/plans` | Plan management |
| GET | `/api/admin/customers` | Customer listing |
| GET | `/api/admin/customers/{id}` | Customer details |
| GET | `/api/admin/devices` | Device listing |
| PATCH | `/api/admin/devices/{id}/block` | Block device |
| PATCH | `/api/admin/devices/{id}/unblock` | Unblock device |
| GET | `/api/admin/payments` | Payment history |
| GET | `/api/admin/sessions` | Session listing |
| POST | `/api/admin/sessions/{id}/terminate` | Terminate session |
| CRUD | `/api/admin/routers` | Router management |
| GET | `/api/admin/routers/{id}/connected-users` | Connected users |
| GET | `/api/admin/routers/{id}/status` | Router health |
| CRUD | `/api/admin/sites` | Site management |

### Frontend Deployment (`vercel.json`)

```json
{
  "installCommand": "npm ci",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

---

## 7. Integrations

### MikroTik Router Integration

**How it works:** The backend communicates with MikroTik routers via their REST API (available on RouterOS 7+). When a user purchases a plan, the system creates a hotspot user on the MikroTik router and generates a continue URL that logs the user into the MikroTik hotspot with RADIUS credentials.

**Files:**
- `DefaultMikroTikIntegrationService.java` - REST client for MikroTik API (`/ip/hotspot/user`, `/ip/hotspot/active`, `/interface/wireless/registration-table`, `/system/resource`)
- `MikroTikHotspotService.java` - Builds continue URLs with username/password for captive portal login
- `MikroTikIntegrationService.java` - Interface defining the MikroTik operations contract
- `billunet-heartbeat.sh` - Shell script running on router/management host, sends periodic health data

**Authentication:** BasicAuth with configurable username/password per router. Router heartbeat uses a shared secret key (`X-Router-Key` header) validated with constant-time comparison.

**Endpoints called:**
- `POST /ip/hotspot/user` - Create hotspot user
- `DELETE /ip/hotspot/user/{username}` - Remove hotspot user
- `POST /ip/hotspot/active/remove-mac` - Disconnect user by MAC
- `GET /ip/hotspot/active` - List active hotspot users
- `GET /interface/wireless/registration-table` - List connected wireless devices
- `GET /system/resource` - System health metrics

### FreeRADIUS Integration

**How it works:** When a plan is activated, the system creates a RADIUS account with bandwidth limits matching the plan. The MikroTik router authenticates users against FreeRADIUS, which reads credentials from the `radius_accounts` PostgreSQL table.

**Files:**
- `RadiusProvisioningService.java` - Creates/disables/rotates RADIUS accounts
- `RadiusSessionService.java` - Tracks RADIUS accounting sessions (bytes in/out, duration)
- `RadiusAccount` entity - RADIUS user credentials with bandwidth limits

**Username format:** `bn-{mac_without_colons}` (e.g., `bn-aabbccddeeff`)

### Mobile Money / M-Pesa (Mock)

**How it works:** Currently uses a mock payment provider that simulates mobile money transactions. The interface is designed for real M-Pesa/Tigo Pesa integration.

**Files:**
- `PaymentProvider.java` - Interface with `initiate()` method
- `MockPaymentProvider.java` - Returns simulated provider reference and payload
- `PaymentProviderResponse.java` - Response model (provider name, reference, raw payload)

**Status:** Mock only. Real mobile money integration (M-Pesa, Tigo Pesa) is planned but not implemented.

### SMS (Mock)

**How it works:** OTP codes are generated and "sent" via a mock SMS sender that logs the OTP to the console.

**Files:**
- `SmsSender.java` - Interface with `sendOtp()` method
- `MockSmsSender.java` - Logs OTP to stdout instead of sending a real SMS

**Status:** Mock only. Real SMS gateway integration (Africa's Talking, Twilio, or local provider) is planned.

### Cloud Hosting

**Frontend:** Deployed on Vercel with SPA rewrites (`vercel.json`).
**Backend:** Configurable via environment variables for any hosting (supports Supabase PostgreSQL via connection URI parsing in `PostgresConnectionUriParser.java`).
**Database:** PostgreSQL, with support for Supabase connection URIs.

---

## 8. What's Incomplete

| Area | Status | Details |
|------|--------|---------|
| **Real Payment Provider (M-Pesa/Tigo Pesa)** | Planned | Only a mock provider exists. The `PaymentProvider` interface is ready for a real implementation. |
| **Real SMS Gateway** | Planned | Only a mock SMS sender exists. The `SmsSender` interface is ready for Africa's Talking / Twilio / local SMS gateway. |
| **FreeRADIUS Server Setup** | Partial | RADIUS accounts are provisioned in the database, but the FreeRADIUS server configuration (SQL module, clients, policies) is not included in the project. |
| **MikroTik RouterOS Script** | Basic | The heartbeat script exists but doesn't dynamically read MikroTik system metrics. It uses static environment variables rather than pulling from RouterOS CLI (`/system resource print`, etc.). |
| **Admin User Roles** | Partial | `SUPER_ADMIN` and `SITE_ADMIN` roles exist in the schema, but role-based access control is not enforced in the backend (all admin endpoints require authentication only, no role checks). |
| **Data Cap Enforcement** | Schema only | `data_cap_mb` is stored in plans and RADIUS accounts, but actual enforcement requires FreeRADIUS counter attributes or MikroTik queue configuration not yet implemented. |
| **Site-Router Linking** | Partial | The `sites` table and `site_id` FK on `router_nodes` exist, but the admin UI for managing site-router associations is minimal. |
| **Bandwidth Enforcement** | Partial | Download/upload Mbps are sent to MikroTik when creating hotspot users, but actual queue/shaping configuration on the router is not managed by the system. |
| **Production Security** | Needs work | CSRF is disabled (appropriate for API-only), but the `.env.example` contains real credentials that should be rotated. `password_plain` column on `radius_accounts` stores plaintext passwords (necessary for MikroTik hotspot login but a security concern). |
| **Email Notifications** | Not started | No email integration for admin alerts, payment receipts, or session reminders. |
| **Reporting / Analytics** | Basic | Dashboard shows basic KPIs. No historical charts, usage trends, or exportable reports. |
| **Multi-tenant / Multi-ISP** | Not started | The system is single-tenant. No support for multiple ISP operators sharing the platform. |
| **Mobile App** | Not started | Only a responsive web portal exists. No native mobile app for users or admins. |
| **Automated Testing** | Minimal | 5 frontend component tests, basic Spring Boot test setup. No integration tests or E2E tests. |
