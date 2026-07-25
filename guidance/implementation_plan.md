# Implementation Plan - Secure OpenVPN Certificate Download

Provide a secure download endpoint on the BilluNet VPS backend to allow new routers to fetch the OpenVPN client certificate/CA file during initial installation, requiring a password to be supplied via query parameters or request headers.

## User Review Required

> [!IMPORTANT]
> The new endpoint `/api/public/vpn/download-cert` is exposed publicly (bypassing the JWT filter) to allow routers to download the certificate *before* they establish their VPN tunnel. However, it is secured using a configured download password. You should set `VPN_DOWNLOAD_PASSWORD` and `VPN_CERT_CONTENT` in your server's `.env` environment variables.

---

## Proposed Changes

### Backend Configuration

#### [MODIFY] [AppProperties.java](file:///d:/BIlluProject/Wi-Fi/backend/src/main/java/com/wifi/portal/config/AppProperties.java)
- Add a nested static `Vpn` configuration class with properties for `certContent` and `downloadPassword`.
- Instantiate and expose the `Vpn` properties class under the prefix `app.vpn`.

#### [MODIFY] [application.yml](file:///d:/BIlluProject/Wi-Fi/backend/src/main/resources/application.yml)
- Map environment variables `VPN_CERT_CONTENT` and `VPN_DOWNLOAD_PASSWORD` to `app.vpn.cert-content` and `app.vpn.download-password` respectively.

---

### REST APIs

#### [NEW] [VpnCertController.java](file:///d:/BIlluProject/Wi-Fi/backend/src/main/java/com/wifi/portal/controller/VpnCertController.java)
- Create a Spring Web `@RestController` mapped to `/api/public/vpn`.
- Define a `GET /download-cert` endpoint.
- Retrieve the configuration properties, authenticate the password parameter or `X-Download-Password` header, and stream/return the certificate file content as `ca.crt`.

---

### Documentation

#### [MODIFY] [mikrotik_setup_guide.md](file:///C:/Users/sheby/.gemini/antigravity-ide/brain/55513e6c-bd0a-4967-8a2f-acbb37a9322e/mikrotik_setup_guide.md)
- Update Step 2 with instructions and CLI commands showing how to download the certificate on the router directly from the VPS using `/tool fetch` with the password:
  ```routeros
  /tool fetch url="http://<VPS_PUBLIC_IP>:<PORT>/api/public/vpn/download-cert?password=YOUR_PASSWORD" dst-path=ca.crt keep-result=yes
  ```

---

## Verification Plan

### Automated Tests
- We will build the backend using:
  ```bash
  mvn clean compile
  ```
- We will execute the test suite:
  ```bash
  mvn test
  ```

### Manual Verification
- Verify that requesting `http://localhost:8081/api/public/vpn/download-cert` returns `401 Unauthorized` without the password parameter.
- Verify that providing the correct `password` query parameter returns `200 OK` and the certificate content as a file download.
