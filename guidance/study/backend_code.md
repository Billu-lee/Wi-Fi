# BilluNet Captive Portal System: Backend Code-by-Code Study Guide

This document provides a detailed, line-by-line and component-level code breakdown of the **Spring Boot backend** for the BilluNet Captive Portal. It is designed to help you study the exact code implementation.

---

## 1. Captive Portal API Flow (`CaptivePortalController` & `CaptivePortalService`)

The captive portal endpoints manage guest redirection, status evaluation, and session handoffs.

### API Entry Point: `CaptivePortalController.java`
This controller exposes the endpoints used by the client browser during redirection.
* **`POST /api/captive/identify`**: Fired when the React app first loads. It inspects the client's MAC address to check if the device is new, blocked, or has an active session.
* **`GET /api/portal/status`**: Polled by the frontend to fetch real-time session status.
* **`POST /api/captive/continue`**: Called at the end of the signup/payment flow to authorize internet access.

### Core Business Logic: `CaptivePortalService.java`

#### `identify()` Method Breakdown:
```java
@Transactional
public CaptiveDtos.IdentifyResponse identify(CaptiveDtos.IdentifyRequest request) {
    String normalizedMac = IdentifierNormalizer.normalizeMac(request.macAddress());
    Optional<Device> deviceOptional = deviceRepository.findByMacAddress(normalizedMac);

    // Case 1: Device is completely new to the system
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
    
    // Case 2: Device is blacklisted/blocked by the admin
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

    // Case 3: Device has a valid active internet session
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

    // Case 4: No active session (checks if the last session just expired or if they never had one)
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
```

---

## 2. Zero-Touch OpenVPN Dynamic Certification & Provisioning

The `VpnCertController` handles OpenVPN certificate sign-and-download functionality for new routers.

### Automatic CA Sign & IP Allocation: `VpnCertController.java`
When a router requests its client certificate, the controller dynamically spawns `easyrsa` in batch mode (without prompting for passwords) and allocates a static private IP inside the OpenVPN subnet (`10.20.20.0/24`).

```java
private synchronized void generateCertIfNotExist(String routerCode) {
    if (routerCode == null || routerCode.isBlank()) {
        return;
    }

    // Clean router code to prevent shell injection or path traversal
    String cleanCode = routerCode.replaceAll("[^a-zA-Z0-9\\-_]", "");
    if (cleanCode.isBlank()) {
        return;
    }

    File certFile = new File("/etc/openvpn/easy-rsa/pki/issued/" + cleanCode + ".crt");
    File keyFile = new File("/etc/openvpn/easy-rsa/pki/private/" + cleanCode + ".key");

    boolean certExists = certFile.exists() && keyFile.exists();

    if (!certExists) {
        try {
            // 1. Generate certificate request in batch mode
            ProcessBuilder genPb = new ProcessBuilder(
                    "./easyrsa", "--batch", "gen-req", cleanCode, "nopass"
            );
            genPb.directory(new File("/etc/openvpn/easy-rsa"));
            Process genProc = genPb.start();
            genProc.waitFor();

            // 2. Sign certificate request as a client in batch mode
            ProcessBuilder signPb = new ProcessBuilder(
                    "./easyrsa", "--batch", "sign-req", "client", cleanCode
            );
            signPb.directory(new File("/etc/openvpn/easy-rsa"));
            Process signProc = signPb.start();
            signProc.waitFor();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // 3. Auto-allocate private VPN IP and write the client configuration (CCD file)
    try {
        Optional<RouterNode> routerOpt = routerNodeRepository.findByRouterCode(cleanCode);
        if (routerOpt.isPresent()) {
            RouterNode router = routerOpt.get();
            String currentIp = router.getManagementIp();
            
            // Allocate a new IP in the 10.20.20.X subnet if not already assigned
            if (currentIp == null || currentIp.isBlank()) {
                List<RouterNode> allRouters = routerNodeRepository.findAll();
                Set<String> assignedIps = allRouters.stream()
                        .map(RouterNode::getManagementIp)
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .collect(Collectors.toSet());
                
                String allocatedIp = null;
                for (int i = 2; i <= 254; i++) {
                    String candidate = "10.20.20." + i;
                    if (!assignedIps.contains(candidate)) {
                        allocatedIp = candidate;
                        break;
                    }
                }
                
                if (allocatedIp != null) {
                    router.setManagementIp(allocatedIp);
                    routerNodeRepository.save(router);
                    currentIp = allocatedIp;
                }
            }
            
            // Write the OpenVPN CCD (Client Config Directory) file
            if (currentIp != null && !currentIp.isBlank()) {
                String ccdDir = appProperties.getVpn().getCcdPath();
                File dir = new File(ccdDir);
                if (!dir.exists()) {
                    dir.mkdirs();
                }
                File ccdFile = new File(dir, cleanCode);
                // Write the push routing configuration
                try (java.io.FileWriter writer = new java.io.FileWriter(ccdFile)) {
                    writer.write("ifconfig-push " + currentIp + " 255.255.255.0\n");
                }
            }
        }
    } catch (Exception e) {
        e.printStackTrace();
    }
}
```

---

## 3. RADIUS Dynamic CoA (Disconnect-Request)

When a session expires or is manually disconnected from the admin dashboard, the backend triggers a Disconnect-Request to the router over UDP.

### Manual UDP Packet Assembly: `RadiusCoaService.java`
The system crafts standard RADIUS Change-of-Authorization (CoA) packets from scratch using MD5 HMAC signatures, bypassing the need for heavy external libraries:

```java
public void sendDisconnectRequest(RouterNode router, Device device, String username) {
    String secret = appProperties.getRadius().getSharedSecret();
    if (!StringUtils.hasText(secret)) {
        LOGGER.warn("RADIUS shared secret is not configured; skipping Disconnect-Request");
        return;
    }

    // Resolve target IP (Management IP via VPN is preferred)
    String targetIp = router.getManagementIp();
    if (!StringUtils.hasText(targetIp)) targetIp = router.getPublicIp();
    if (!StringUtils.hasText(targetIp)) targetIp = router.getWanIp();
    
    if (!StringUtils.hasText(targetIp)) {
        LOGGER.warn("No valid IP found for router {}; skipping Disconnect-Request", router.getRouterCode());
        return;
    }

    int port = appProperties.getRadius().getCoaPort(); // Default is 3799
    try {
        byte[] packetBytes = buildDisconnectPacket(username, device.getMacAddress(), secret);
        InetAddress address = InetAddress.getByName(targetIp);
        try (DatagramSocket socket = new DatagramSocket()) {
            DatagramPacket packet = new DatagramPacket(packetBytes, packetBytes.length, address, port);
            socket.send(packet);
            LOGGER.info("Sent RADIUS Disconnect-Request to {}:{} for user={}", targetIp, port, username);
        }
    } catch (Exception e) {
        LOGGER.error("Failed to send RADIUS Disconnect-Request to router: {}", e.getMessage());
    }
}

private byte[] buildDisconnectPacket(String username, String macAddress, String secret) throws Exception {
    byte code = 40; // RADIUS Disconnect-Request Code
    byte identifier = (byte) (System.currentTimeMillis() & 0xFF);

    // Attributes: User-Name (Type 1) and Calling-Station-Id (Type 31)
    byte[] attrUserName = buildAttribute((byte) 1, username.getBytes("UTF-8"));
    byte[] attrCallingStationId = buildAttribute((byte) 31, macAddress.getBytes("UTF-8"));

    int attrLength = attrUserName.length + attrCallingStationId.length;
    int totalLength = 20 + attrLength; // 20 bytes standard header

    byte[] packet = new byte[totalLength];
    packet[0] = code;
    packet[1] = identifier;
    packet[2] = (byte) ((totalLength >> 8) & 0xFF);
    packet[3] = (byte) (totalLength & 0xFF);

    // Initialize 16-byte Authenticator field with zeros
    for (int i = 4; i < 20; i++) {
        packet[i] = 0;
    }

    // Copy attributes into packet array
    int offset = 20;
    System.arraycopy(attrUserName, 0, packet, offset, attrUserName.length);
    offset += attrUserName.length;
    System.arraycopy(attrCallingStationId, 0, packet, offset, attrCallingStationId.length);

    // Calculate Authenticator hash: MD5(Code + ID + Length + 16 zero octets + Attributes + Shared Secret)
    byte[] secretBytes = secret.getBytes("UTF-8");
    byte[] authBuffer = new byte[totalLength + secretBytes.length];
    System.arraycopy(packet, 0, authBuffer, 0, totalLength);
    System.arraycopy(secretBytes, 0, authBuffer, totalLength, secretBytes.length);

    MessageDigest md5 = MessageDigest.getInstance("MD5");
    byte[] authenticator = md5.digest(authBuffer);

    // Insert calculated authenticator into the header (offset 4 to 19)
    System.arraycopy(authenticator, 0, packet, 4, 16);

    return packet;
}
```

---

## 4. RADIUS User Provisioning

When a purchase completes, the backend provisions credentials in the FreeRADIUS shared database.

### Account Provisioning: `RadiusProvisioningService.java`
To support seamless **MAC Authentication**, the username and the password are set directly to the device's MAC address.

```java
@Transactional
public RadiusCredentials createRadiusUser(Customer customer, Device device, Plan plan, Instant expiresAt) {
    String username = buildUsername(device); // Normalized MAC address (AA:BB:CC...)
    String plainPassword = username; 
    
    RadiusAccount account = radiusAccountRepository.findByDeviceId(device.getId()).orElse(new RadiusAccount());
    account.setUsername(username);
    account.setPasswordHash(passwordEncoder.encode(plainPassword));
    account.setPasswordPlain(plainPassword);
    account.setCustomer(customer);
    account.setDevice(device);
    account.setEnabled(true);
    account.setExpiresAt(expiresAt);
    
    // Assign Plan Throttling and Data Cap Attributes
    account.setDownloadMbps(plan.getDownloadMbps());
    account.setUploadMbps(plan.getUploadMbps());
    account.setDataCapMb(plan.getDataCapMb());
    
    RadiusAccount saved = radiusAccountRepository.save(account);
    return new RadiusCredentials(saved, plainPassword);
}
```
