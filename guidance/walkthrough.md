# Walkthrough - Secure OpenVPN Certificate Download & Dynamic Provisioning

We have successfully implemented and verified the secure OpenVPN certificate download and dynamic provisioning system. Below is a summary of the completed tasks and how to use the automated system.

## Changes Made

### 1. Backend Configuration
* **Modified** [AppProperties.java](file:///d:/BIlluProject/Wi-Fi/backend/src/main/java/com/wifi/portal/config/AppProperties.java): Exposes the static inner configuration class `Vpn` under the prefix `app.vpn`, holding fields for `certContent`, `downloadPassword`, `clientCertContent`, `clientKeyContent`, `caCertPath`, `clientCertPath`, and `clientKeyPath`.
* **Modified** [application.yml](file:///d:/BIlluProject/Wi-Fi/backend/src/main/resources/application.yml): Configured the environment mapping so that you can specify settings in your `.env` or environment variables:
  * `app.vpn.cert-content`: `${VPN_CERT_CONTENT:}`
  * `app.vpn.download-password`: `${VPN_DOWNLOAD_PASSWORD:change-me-vpn-password}`
  * `app.vpn.client-cert-content`: `${VPN_CLIENT_CERT_CONTENT:}`
  * `app.vpn.client-key-content`: `${VPN_CLIENT_KEY_CONTENT:}`
  * `app.vpn.ca-cert-path`: `${VPN_CA_CERT_PATH:/etc/openvpn/easy-rsa/pki/ca.crt}`
  * `app.vpn.client-cert-path`: `${VPN_CLIENT_CERT_PATH:/etc/openvpn/easy-rsa/pki/issued/client1.crt}`
  * `app.vpn.client-key-path`: `${VPN_CLIENT_KEY_PATH:/etc/openvpn/easy-rsa/pki/private/client1.key}`

### 2. REST API Controller
* **Created/Rewritten** [VpnCertController.java](file:///d:/BIlluProject/Wi-Fi/backend/src/main/java/com/wifi/portal/controller/VpnCertController.java): Implemented three secure endpoints:
  * `/api/public/vpn/download-cert`: Downloads the CA certificate (`ca.crt`).
  * `/api/public/vpn/download-client-cert`: Downloads the unique client certificate (`client.crt`) for a given router.
  * `/api/public/vpn/download-client-key`: Downloads the unique private key (`client.key`) for a given router.
* **On-The-Fly Generation:** Added automated certificate generation. If a request is received for a new router (using the `routerCode` query parameter) and its certificate does not exist yet on the VPS, the controller automatically signs and generates a new client certificate and private key using non-interactive Easy-RSA commands (`--batch` mode) and serves them instantly.

### 3. Integration Guide
* **Modified** [mikrotik_setup_guide.md](file:///C:/Users/sheby/.gemini/antigravity-ide/brain/55513e6c-bd0a-4967-8a2f-acbb37a9322e/mikrotik_setup_guide.md): Updated Step 2.1 to replace manual SFTP instructions with the direct MikroTik Terminal command to download the CA certificate, client certificate, and private key securely, and added static DNS steps to bypass Cloudflare.

---

## How to use the feature (Zero-Touch Provisioning)

### 1. Download on the MikroTik Router
To set up a new router (e.g., `router-05`), run these commands on its terminal. The backend will automatically generate the certs and keys on-the-fly:

```routeros
# 1. Bypass Cloudflare to connect directly to the VPS Nginx
/ip dns static add name=billunet-api.lupestationery.org address=178.238.233.102

# 2. Download the CA certificate
/tool fetch url="https://billunet-api.lupestationery.org/api/public/vpn/download-cert?password=24558" dst-path=ca.crt keep-result=yes check-certificate=no

# 3. Download the unique client certificate (auto-generated on-the-fly)
/tool fetch url="https://billunet-api.lupestationery.org/api/public/vpn/download-client-cert?password=24558&routerCode=router-05" dst-path=client.crt keep-result=yes check-certificate=no

# 4. Download the unique client private key (auto-generated on-the-fly)
/tool fetch url="https://billunet-api.lupestationery.org/api/public/vpn/download-client-key?password=24558&routerCode=router-05" dst-path=client.key keep-result=yes check-certificate=no
```

### 2. Import & Connect
```routeros
# Import CA, client cert, and client private key
/certificate import file-name=ca.crt name=ca.crt
/certificate import file-name=client.crt name=client.crt
/certificate import file-name=client.key name=client.key

# Configure the OpenVPN client interface
/interface ovpn-client set [find name="ovpn-billunet"] protocol=tcp cipher=aes256-gcm certificate=client.crt auth=sha256
```
