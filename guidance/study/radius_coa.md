# BilluNet Captive Portal: FreeRADIUS & Dynamic CoA Integration Study Guide

This document describes how the authentication, authorization, and session accounting flows integrate with **FreeRADIUS** and the Spring Boot backend.

---

## 1. FreeRADIUS Database Schemas

FreeRADIUS queries PostgreSQL directly to authenticate users and fetch bandwidth limits. Standard FreeRADIUS setups map to three primary logical concepts:

### SQL Authorization (`radcheck`)
Lists the credentials and checking parameters required to log in. In BilluNet, we map this concept to the `radius_accounts` table:
* **Username**: Normalized guest device MAC address (e.g. `00:11:22:33:44:55`).
* **Attribute**: `Cleartext-Password` (PAP).
* **Value**: Normalized MAC address (acting as the password).
* **Operator**: `:=`.

### SQL Attributes (`radreply`)
Contains the configuration settings sent back to the router upon successful login (e.g. bandwidth limits).
* **Mikrotik-Rate-Limit**: Formatted bandwidth ceiling string (e.g., `2M/5M` for Upload/Download limit, representing Upload Burst / Download Burst, etc.).
* **Session-Timeout**: Maximum allowed session time (duration in seconds derived from the plan).

### SQL Accounting (`radacct` -> `radius_sessions`)
Captures usage logs sent by the router periodically (Interim Updates) and on session stop:
* **Acct-Session-Id**: Unique session identifier.
* **Acct-Input-Octets**: Sent bytes (download volume).
* **Acct-Output-Octets**: Received bytes (upload volume).
* **Acct-Session-Time**: Session duration in seconds.

---

## 2. Dynamic CoA (Change of Authorization)

**Change-of-Authorization (CoA)** (defined in RFC 3576 / RFC 5176) allows the backend server to dynamically alter or disconnect an active user session on the router without waiting for the user to re-authenticate.

### The Kick/Disconnect Flow:
1. Admin clicks **Disconnect** in the dashboard, or a plan runs out of data/time.
2. Spring Boot creates a **Disconnect-Request (Code 40)** packet.
3. The packet contains the client's **Calling-Station-Id** (MAC Address) and **User-Name**.
4. The packet is signed using an **MD5 HMAC** authenticator combined with the shared secret:
   $$\text{Authenticator} = \text{MD5}(\text{Code} \parallel \text{Identifier} \parallel \text{Length} \parallel \text{16 Zeros} \parallel \text{Attributes} \parallel \text{Shared Secret})$$
5. The packet is sent via UDP to port **`3799`** on the router.
6. The router inspects the signature, matches the active session by MAC address, terminates the session, and replies with a **Disconnect-ACK (Code 41)**.

### MikroTik Router Configuration to Listen for CoA:
```routeros
# Enable incoming CoA requests on the router
/radius incoming
set accept=yes port=3799
```

---

## 3. Session Accounting Polling & Telemetry

While RADIUS provides asynchronous start/stop/interim updates, the Spring Boot server also polls the router periodically to verify active states.

### Periodic Session Audits
* The system schedules a polling thread via `@Scheduled` running every 60 seconds.
* It calls the MikroTik REST API endpoint `/rest/ip/hotspot/active` to fetch currently authenticated hosts.
* It compares this listing with active `AccessSession` entities in the database.
* If a host is active in the database but missing from the router's active list (due to manual kick or device disconnect), the backend marks the database session status as `TERMINATED`.
