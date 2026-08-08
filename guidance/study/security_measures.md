# BilluNet Captive Portal: Security Measures Study Guide

This document reviews the security architecture, authentication methods, filter pipelines, and sanitization practices deployed across the codebase.

---

## 1. JSON Web Token (JWT) Security (Admin Interfaces)

All administrative REST APIs are secured using standard HTTP Bearer tokens (JSON Web Tokens).

### Authentication Filters & Configuration
* Admin routes under `/api/admin/**` are filtered using `JwtAuthenticationFilter`.
* The filter extracts the `Authorization: Bearer <token>` header, parses the payload claims, verifies the signature using a system-configured secret (`JWT_SECRET`), and registers the user context into the `SecurityContextHolder`.

### Admin Auth Endpoints (`AdminAuthController.java`):
Admin authentication utilizes PBKDF2 or bcrypt password-hashing schemes to verify user credentials:
```java
@PostMapping("/auth/login")
public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
    AdminUser admin = adminUserService.findByEmail(request.email())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Invalid email or password."));

    if (!passwordEncoder.matches(request.password(), admin.getPasswordHash())) {
        throw new ApiException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Invalid email or password.");
    }

    String token = jwtTokenProvider.generateToken(admin.getEmail(), admin.getRole().name());
    return ResponseEntity.ok(new LoginResponse(token, admin.getEmail(), admin.getRole().name()));
}
```

---

## 2. Telemetry Heartbeat Authentication (`X-Router-Key`)

Heartbeats sent from the router to `/api/router-agent/heartbeat` are publicly accessible but protected against spoofing.

### Heartbeat Security:
* The endpoint requires an `X-Router-Key` header.
* The header value must match the `agentKey` generated for that specific router inside the database.
* The heartbeat payload is sanitized.

```java
@PostMapping("/router-agent/heartbeat")
public ResponseEntity<HeartbeatResponse> receiveHeartbeat(
        @RequestHeader(name = "X-Router-Key", required = true) String agentKey,
        @RequestBody HeartbeatRequest request
) {
    RouterNode router = routerNodeRepository.findByRouterCode(request.routerCode())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_ROUTER", "Router code is not registered."));

    // Verify key matches db record
    if (!router.getAgentKey().equals(agentKey)) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    routerNodeService.updateTelemetry(router, request);
    return ResponseEntity.ok(new HeartbeatResponse("OK"));
}
```

---

## 3. Router REST API Subnet Isolation

The MikroTik router REST API (used for active user audits and session lookup) is enabled on port 80/443. To prevent external intrusion or local hotspot client access:

1. **Firewall Isolation**: The API is restricted so it only accepts connections originating from the private OpenVPN subnet (`10.20.20.0/24`). Hotspot guests (`192.168.88.x`) or WAN requests are instantly dropped.
2. **Dedicated REST User**: A custom user (`portal-api`) is created on the router with restricted API groups, ensuring that even if credentials were leaked, the user cannot access other system commands.

---

## 4. Input Sanitization & Process Protection

When dynamically executing operating system commands (like Easy-RSA key signing), inputs are strictly sanitized to prevent Command Injection.

### Shell/Path Injection Prevention:
```java
// VpnCertController.java: Clean routeCode parameter of any path traversal or shell operator characters
String cleanCode = routerCode.replaceAll("[^a-zA-Z0-9\\-_]", "");
if (cleanCode.isBlank()) {
    return;
}

// Spawns ProcessBuilder using array of separate arguments, preventing command shell execution interpolation
ProcessBuilder genPb = new ProcessBuilder("./easyrsa", "--batch", "gen-req", cleanCode, "nopass");
```
By passing arguments to `ProcessBuilder` as distinct array items, the OS executes them as raw strings without parsing operators like `;`, `&`, `|`, or `$()`.
