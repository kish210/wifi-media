#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════
# iptables.sh — WiFi-Media Captive Portal Firewall Rules
# ══════════════════════════════════════════════════════════════════════════

WIFI_IFACE="__WIFI_IFACE__"   # کارت وایرلس
ETH_IFACE="__ETH_IFACE__"    # کارت اترنت (اگر داری)
SERVER_IP="__SERVER_IP__"     # IP سرور

# ── پاکسازی قوانین قبلی ──────────────────────────────────────────────────
iptables -F
iptables -t nat -F
iptables -t mangle -F
iptables -X 2>/dev/null || true

# ── IP Forwarding ────────────────────────────────────────────────────────
echo 1 > /proc/sys/net/ipv4/ip_forward

# ══════════════════════════════════════════════════════════════════════════
# FILTER table — کنترل ترافیک
# ══════════════════════════════════════════════════════════════════════════

# پیش‌فرض
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# ── INPUT ─────────────────────────────────────────────────────────────────
# ترافیک loopback
iptables -A INPUT -i lo -j ACCEPT
# ترافیک established
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
# SSH (برای مدیریت از راه دور)
iptables -A INPUT -i "$ETH_IFACE" -p tcp --dport 22 -j ACCEPT
# DNS و DHCP از WiFi
iptables -A INPUT -i "$WIFI_IFACE" -p udp --dport 53  -j ACCEPT
iptables -A INPUT -i "$WIFI_IFACE" -p tcp --dport 53  -j ACCEPT
iptables -A INPUT -i "$WIFI_IFACE" -p udp --dport 67  -j ACCEPT
# HTTP/HTTPS از WiFi (برای Captive Portal و WiFi-Media)
iptables -A INPUT -i "$WIFI_IFACE" -p tcp --dport 80  -j ACCEPT
iptables -A INPUT -i "$WIFI_IFACE" -p tcp --dport 443 -j ACCEPT
# WiFi-Media backend
iptables -A INPUT -i "$WIFI_IFACE" -p tcp --dport 4000 -j ACCEPT
# TVHeadend
iptables -A INPUT -i "$WIFI_IFACE" -p tcp --dport 9981 -j ACCEPT
iptables -A INPUT -i "$WIFI_IFACE" -p tcp --dport 9982 -j ACCEPT
# WebSocket
iptables -A INPUT -i "$WIFI_IFACE" -p tcp --dport 8181 -j ACCEPT
# ICMP (ping)
iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# ── FORWARD ───────────────────────────────────────────────────────────────
# ترافیک LAN داخلی (WiFi → سرور و بالعکس)
iptables -A FORWARD -i "$WIFI_IFACE" -d "$SERVER_IP/24" -j ACCEPT
iptables -A FORWARD -s "$SERVER_IP/24" -o "$WIFI_IFACE" -j ACCEPT
# ترافیک established
iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
# اگر اینترنت می‌خواهی به کاربران بدهی، این خط را فعال کن:
# iptables -A FORWARD -i "$WIFI_IFACE" -o "$ETH_IFACE" -j ACCEPT

# ══════════════════════════════════════════════════════════════════════════
# NAT table — Captive Portal Redirect
# ══════════════════════════════════════════════════════════════════════════

# ── HTTP redirect → nginx captive portal ────────────────────────────────
# تمام ترافیک HTTP از WiFi clients به nginx محلی redirect
iptables -t nat -A PREROUTING \
    -i "$WIFI_IFACE" \
    -p tcp --dport 80 \
    ! -d "$SERVER_IP" \
    -j DNAT --to-destination "$SERVER_IP:80"

# ── HTTPS redirect (اختیاری — certificate warning نشان می‌دهد) ──────────
# iptables -t nat -A PREROUTING \
#     -i "$WIFI_IFACE" \
#     -p tcp --dport 443 \
#     ! -d "$SERVER_IP" \
#     -j DNAT --to-destination "$SERVER_IP:443"

# ── Masquerade برای اینترنت (اگر اینترنت داری) ─────────────────────────
# iptables -t nat -A POSTROUTING -o "$ETH_IFACE" -j MASQUERADE

# ── DNS redirect (اگر دستگاهی DNS سخت‌کد دارد مثل 8.8.8.8) ──────────────
iptables -t nat -A PREROUTING \
    -i "$WIFI_IFACE" \
    -p udp --dport 53 \
    ! -d "$SERVER_IP" \
    -j DNAT --to-destination "$SERVER_IP:53"

iptables -t nat -A PREROUTING \
    -i "$WIFI_IFACE" \
    -p tcp --dport 53 \
    ! -d "$SERVER_IP" \
    -j DNAT --to-destination "$SERVER_IP:53"

echo "✓ iptables rules applied"
iptables -t nat -L PREROUTING -n --line-numbers
