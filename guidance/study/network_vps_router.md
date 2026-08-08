# BilluNet Captive Portal: VPS & Router Network Configuration Study Guide

This document explains the network architecture, OpenVPN tunnel integration, routing rules, and router-level firewall settings required to run the captive portal system.

---

## 1. Network Topology Map

```
  [ VPS Server ] (Public IP: 178.238.233.102)
        │
        ▼ (OpenVPN Server Subnet: 10.20.20.1)
   [ OVPN Tunnel ]
        ▲ (OpenVPN Client Static IP: 10.20.20.10)
        │
  [ MikroTik Router ] (LAN Gateway IP: 192.168.88.1)
        ├────── ether1 (WAN - gets local gateway internet)
        ├────── ether2 (LAN Hotspot Bridge - 192.168.88.0/24)
        └────── ether3 (Admin Host-Only Port - 192.168.56.10)
```

---

## 2. VPS OpenVPN Server Configuration

The VPS runs an OpenVPN daemon configured to push static IP mappings using a Client Configuration Directory (`ccd`).

### Sample Server Config (`/etc/openvpn/server.conf`):
```text
port 1194
proto tcp-server
dev tun
ca /etc/openvpn/easy-rsa/pki/ca.crt
cert /etc/openvpn/easy-rsa/pki/issued/server.crt
key /etc/openvpn/easy-rsa/pki/private/server.key
dh /etc/openvpn/easy-rsa/pki/dh.pem
topology subnet
server 10.20.20.0 255.255.255.0

# Critical: Directs OpenVPN to look up static client profiles by Common Name (routerCode)
client-config-dir /etc/openvpn/ccd

keepalive 10 120
cipher AES-256-GCM
auth SHA256
user nobody
group nogroup
persist-key
persist-tun
status /var/log/openvpn/openvpn-status.log
verb 3
```

---

## 3. Router-Level OpenVPN Configuration (MikroTik CLI)

Once certificates are downloaded and imported onto the router's storage, the OpenVPN client interface is added:

```routeros
# Configure Client VPN tunnel connection parameters
/interface ovpn-client
add name=ovpn-billunet \
    connect-to=178.238.233.102 \
    port=1194 \
    mode=ip \
    protocol=tcp \
    user="mikrotik-client-01" \
    profile=default-encryption \
    certificate=client.crt \
    auth=sha256 \
    cipher=aes256-gcm \
    add-default-route=no \
    disabled=no
```

---

## 4. IP Routing Configurations

To allow communication between the VPS backend (running on `10.20.20.1`) and the Hotspot client devices (connected behind the router on `192.168.88.0/24`), routing must be declared.

### Route from VPS to Guest Subnets:
1. **OpenVPN CCD Routing Profile** (tells the OpenVPN daemon that the subnet `192.168.88.0/24` is accessible behind client `router-01`):
   Create a file inside `/etc/openvpn/ccd/router-01` with:
   ```text
   ifconfig-push 10.20.20.10 255.255.255.0
   iroute 192.168.88.0 255.255.255.0
   ```
2. **VPS Operating System Route** (tells Linux to route any guest traffic through the virtual tunnel interface):
   ```bash
   ip route add 192.168.88.0/24 via 10.20.20.10
   ```

---

## 5. Router Firewall & Walled Garden Configuration

Security rules must allow initial, unauthenticated HTTP connection handshakes with your portal while blocking other general internet access until login.

### Walled Garden (Bypasses Portal Intercept for specific IPs/ports)
```routeros
/ip hotspot walled-garden
# Allow guests to fetch CSS/JS from your host PC
add dst-host=192.168.56.1 action=allow
# Allow DNS lookups (must work to trigger browser captive detection)
add dst-port=53 protocol=udp action=allow
```

### Admin management API restrictions
The router's REST API must be restricted to prevent brute-force attacks from the internet or WAN interfaces:
```routeros
# Accept WWW/REST API traffic only if originating from the secure VPN tunnel
/ip firewall filter
add chain=input action=accept protocol=tcp dst-port=80 src-address=10.20.20.0/24 comment="Allow REST API over VPN only"

# Drop any external SSH/Winbox attempt from WAN
/ip firewall filter
add chain=input action=drop protocol=tcp dst-port=8291,22 in-interface=ether1 comment="Block external WAN Management"
```
