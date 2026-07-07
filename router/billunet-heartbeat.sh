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
