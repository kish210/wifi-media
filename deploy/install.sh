#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║          WiFi-Media — نصب خودکار Captive Portal                        ║
# ║          Ubuntu Server 22.04 LTS  /  Raspberry Pi OS (64-bit)          ║
# ║          اجرا به عنوان root:  sudo bash install.sh                      ║
# ╚══════════════════════════════════════════════════════════════════════════╝
set -euo pipefail

# ── رنگ‌ها ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

banner() {
echo -e "${BLUE}${BOLD}"
cat <<'EOF'
 ██╗    ██╗██╗███████╗██╗    ███╗   ███╗███████╗██████╗ ██╗ █████╗
 ██║    ██║██║██╔════╝██║    ████╗ ████║██╔════╝██╔══██╗██║██╔══██╗
 ██║ █╗ ██║██║█████╗  ██║    ██╔████╔██║█████╗  ██║  ██║██║███████║
 ██║███╗██║██║██╔══╝  ██║    ██║╚██╔╝██║██╔══╝  ██║  ██║██║██╔══██║
 ╚███╔███╔╝██║██║     ██║    ██║ ╚═╝ ██║███████╗██████╔╝██║██║  ██║
  ╚══╝╚══╝ ╚═╝╚═╝     ╚═╝    ╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝╚═╝  ╚═╝
                   Captive Portal  ·  Local Entertainment
EOF
echo -e "${NC}"
}

# ══════════════════════════════════════════════════════════════════════════
# ── تنظیمات قابل تغییر ────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════
WIFI_IFACE="${WIFI_IFACE:-wlan0}"          # کارت وایرلس
ETH_IFACE="${ETH_IFACE:-eth0}"            # کارت اترنت (اختیاری)
WIFI_SSID="${WIFI_SSID:-WiFi-Media}"       # نام شبکه
WIFI_PASS="${WIFI_PASS:-wifimedia2024}"    # رمز شبکه
SERVER_IP="${SERVER_IP:-192.168.100.1}"   # IP سرور
DHCP_START="192.168.100.10"
DHCP_END="192.168.100.200"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/wifi-media}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ══════════════════════════════════════════════════════════════════════════
banner

# ── بررسی root ──────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && err "این اسکریپت باید به عنوان root اجرا شود: sudo bash install.sh"

# ── بررسی OS ────────────────────────────────────────────────────────────
. /etc/os-release 2>/dev/null || true
if [[ "${ID:-}" != "ubuntu" && "${ID:-}" != "debian" && "${ID:-}" != "raspbian" ]]; then
    warn "این اسکریپت برای Ubuntu/Debian/Raspbian نوشته شده. سیستم شما: ${PRETTY_NAME:-unknown}"
    read -rp "آیا ادامه می‌دهید؟ [y/N] " yn; [[ "${yn,,}" == "y" ]] || exit 1
fi

# ── بررسی کارت وایرلس ──────────────────────────────────────────────────
if ! ip link show "$WIFI_IFACE" &>/dev/null; then
    warn "کارت وایرلس '$WIFI_IFACE' پیدا نشد. لیست کارت‌های شبکه:"
    ip link show | grep -E "^[0-9]" | awk '{print "  "$2}'
    read -rp "نام کارت وایرلس را وارد کنید: " WIFI_IFACE
fi

info "شروع نصب WiFi-Media Captive Portal..."
info "کارت وایرلس : $WIFI_IFACE"
info "آدرس سرور   : $SERVER_IP"
info "نام شبکه    : $WIFI_SSID"
echo ""

# ══════════════════════════════════════════════════════════════════════════
# مرحله ۱: آپدیت و نصب بسته‌ها
# ══════════════════════════════════════════════════════════════════════════
info "نصب بسته‌های مورد نیاز..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
    hostapd dnsmasq iptables iptables-persistent \
    nginx curl wget git ca-certificates gnupg \
    net-tools iw rfkill iproute2 \
    python3 python3-pip 2>/dev/null || true
log "بسته‌ها نصب شدند"

# ══════════════════════════════════════════════════════════════════════════
# مرحله ۲: نصب Docker
# ══════════════════════════════════════════════════════════════════════════
if ! command -v docker &>/dev/null; then
    info "نصب Docker..."
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker "${SUDO_USER:-$USER}" 2>/dev/null || true
    systemctl enable docker --now
    log "Docker نصب شد: $(docker --version)"
else
    log "Docker قبلاً نصب شده: $(docker --version)"
fi

# ══════════════════════════════════════════════════════════════════════════
# مرحله ۳: تنظیم IP ثابت روی کارت وایرلس
# ══════════════════════════════════════════════════════════════════════════
info "تنظیم IP ثابت روی $WIFI_IFACE..."

# غیرفعال کردن NetworkManager برای این کارت (اگر وجود داشت)
if command -v nmcli &>/dev/null; then
    nmcli device set "$WIFI_IFACE" managed no 2>/dev/null || true
fi

# netplan (Ubuntu 20.04+)
if [ -d /etc/netplan ]; then
    cat > /etc/netplan/99-wifi-media.yaml <<EOF
network:
  version: 2
  renderer: networkd
  ethernets: {}
  wifis:
    ${WIFI_IFACE}:
      dhcp4: no
      addresses:
        - ${SERVER_IP}/24
      nameservers:
        addresses: [${SERVER_IP}]
EOF
    netplan apply 2>/dev/null || true
else
    # /etc/network/interfaces (Debian/Raspbian)
    if ! grep -q "$WIFI_IFACE" /etc/network/interfaces 2>/dev/null; then
        cat >> /etc/network/interfaces <<EOF

auto ${WIFI_IFACE}
iface ${WIFI_IFACE} inet static
    address ${SERVER_IP}
    netmask 255.255.255.0
    network 192.168.100.0
    broadcast 192.168.100.255
EOF
    fi
fi

# اعمال فوری
ip addr flush dev "$WIFI_IFACE" 2>/dev/null || true
ip addr add "$SERVER_IP/24" dev "$WIFI_IFACE" 2>/dev/null || true
ip link set "$WIFI_IFACE" up 2>/dev/null || true
log "IP تنظیم شد: $SERVER_IP روی $WIFI_IFACE"

# ══════════════════════════════════════════════════════════════════════════
# مرحله ۴: hostapd — نقطه دسترسی WiFi
# ══════════════════════════════════════════════════════════════════════════
info "تنظیم hostapd (WiFi Access Point)..."

# غیرفعال کردن rfkill
rfkill unblock all 2>/dev/null || true

# پیدا کردن باند پشتیبانی شده
HW_MODE="g"
if iw phy 2>/dev/null | grep -q "5180\|5200\|5240"; then
    HW_MODE="a"; CHANNEL=36
else
    HW_MODE="g"; CHANNEL=6
fi

cat > /etc/hostapd/hostapd.conf <<EOF
# WiFi-Media Captive Portal — hostapd config
interface=${WIFI_IFACE}
driver=nl80211
ssid=${WIFI_SSID}
hw_mode=${HW_MODE}
channel=${CHANNEL:-6}
ieee80211n=1
wmm_enabled=1
ht_capab=[HT40][SHORT-GI-20][SHORT-GI-40]
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=${WIFI_PASS}
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP CCMP
rsn_pairwise=CCMP
# حداکثر کاربر همزمان
max_num_sta=100
# قطع کاربران غیرفعال بعد از ۳۰ دقیقه
ap_max_inactivity=1800
EOF

# فعال‌سازی
echo 'DAEMON_CONF="/etc/hostapd/hostapd.conf"' > /etc/default/hostapd
systemctl unmask hostapd
systemctl enable hostapd
log "hostapd تنظیم شد (SSID: $WIFI_SSID, Channel: ${CHANNEL:-6})"

# ══════════════════════════════════════════════════════════════════════════
# مرحله ۵: dnsmasq — DHCP + DNS
# ══════════════════════════════════════════════════════════════════════════
info "تنظیم dnsmasq (DHCP + DNS)..."

# پشتیبان‌گیری از فایل اصلی
[[ -f /etc/dnsmasq.conf ]] && cp /etc/dnsmasq.conf /etc/dnsmasq.conf.bak

cp "$SCRIPT_DIR/dnsmasq.conf" /etc/dnsmasq.conf

# جایگزینی متغیرها
sed -i "s|__WIFI_IFACE__|${WIFI_IFACE}|g" /etc/dnsmasq.conf
sed -i "s|__SERVER_IP__|${SERVER_IP}|g"   /etc/dnsmasq.conf
sed -i "s|__DHCP_START__|${DHCP_START}|g" /etc/dnsmasq.conf
sed -i "s|__DHCP_END__|${DHCP_END}|g"     /etc/dnsmasq.conf

# غیرفعال کردن systemd-resolved (تداخل با port 53)
if systemctl is-active systemd-resolved &>/dev/null; then
    systemctl disable --now systemd-resolved 2>/dev/null || true
    ln -sf /run/systemd/resolve/resolv.conf /etc/resolv.conf 2>/dev/null || true
    echo "nameserver 8.8.8.8" > /etc/resolv.conf
fi

systemctl enable dnsmasq
log "dnsmasq تنظیم شد (DHCP: $DHCP_START - $DHCP_END)"

# ══════════════════════════════════════════════════════════════════════════
# مرحله ۶: iptables — Captive Portal Redirect
# ══════════════════════════════════════════════════════════════════════════
info "تنظیم iptables (Captive Portal)..."

cp "$SCRIPT_DIR/iptables.sh" /opt/wifi-media-iptables.sh
chmod +x /opt/wifi-media-iptables.sh
sed -i "s|__WIFI_IFACE__|${WIFI_IFACE}|g" /opt/wifi-media-iptables.sh
sed -i "s|__ETH_IFACE__|${ETH_IFACE}|g"   /opt/wifi-media-iptables.sh
sed -i "s|__SERVER_IP__|${SERVER_IP}|g"   /opt/wifi-media-iptables.sh

# اجرای فوری
bash /opt/wifi-media-iptables.sh

# ذخیره قوانین
netfilter-persistent save 2>/dev/null || iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
log "iptables تنظیم شد"

# ══════════════════════════════════════════════════════════════════════════
# مرحله ۷: nginx — Captive Portal Web Server
# ══════════════════════════════════════════════════════════════════════════
info "تنظیم nginx (Captive Portal redirect)..."

cp "$SCRIPT_DIR/nginx-portal.conf" /etc/nginx/sites-available/wifi-media
sed -i "s|__SERVER_IP__|${SERVER_IP}|g" /etc/nginx/sites-available/wifi-media

ln -sf /etc/nginx/sites-available/wifi-media /etc/nginx/sites-enabled/wifi-media
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl enable nginx
log "nginx تنظیم شد"

# ══════════════════════════════════════════════════════════════════════════
# مرحله ۸: Deploy WiFi-Media با Docker
# ══════════════════════════════════════════════════════════════════════════
info "Deploy WiFi-Media..."

mkdir -p "$DEPLOY_DIR"

if [ -f "$SCRIPT_DIR/../docker-compose.yml" ]; then
    cp -r "$SCRIPT_DIR/../"* "$DEPLOY_DIR/" 2>/dev/null || true
else
    warn "docker-compose.yml پیدا نشد — لطفاً فایل‌های پروژه را به $DEPLOY_DIR کپی کنید"
fi

# فایل .env
if [ ! -f "$DEPLOY_DIR/.env" ] && [ -f "$DEPLOY_DIR/.env.example" ]; then
    cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
    sed -i "s|LOCAL_IP=.*|LOCAL_IP=${SERVER_IP}|g" "$DEPLOY_DIR/.env"
fi

# ══════════════════════════════════════════════════════════════════════════
# مرحله ۹: systemd service — اجرای خودکار
# ══════════════════════════════════════════════════════════════════════════
info "تنظیم systemd service..."

cp "$SCRIPT_DIR/wifi-media.service" /etc/systemd/system/
sed -i "s|__DEPLOY_DIR__|${DEPLOY_DIR}|g" /etc/systemd/system/wifi-media.service

systemctl daemon-reload
systemctl enable wifi-media
log "Systemd service تنظیم شد"

# ══════════════════════════════════════════════════════════════════════════
# مرحله ۱۰: ip_forward
# ══════════════════════════════════════════════════════════════════════════
echo "net.ipv4.ip_forward=1" > /etc/sysctl.d/99-wifi-media.conf
sysctl -p /etc/sysctl.d/99-wifi-media.conf > /dev/null
log "IP forwarding فعال شد"

# ══════════════════════════════════════════════════════════════════════════
# راه‌اندازی نهایی
# ══════════════════════════════════════════════════════════════════════════
info "راه‌اندازی سرویس‌ها..."
systemctl restart dnsmasq  2>/dev/null || warn "dnsmasq restart failed"
systemctl restart hostapd  2>/dev/null || warn "hostapd restart failed"
systemctl restart nginx    2>/dev/null || warn "nginx restart failed"

if [ -f "$DEPLOY_DIR/docker-compose.yml" ]; then
    cd "$DEPLOY_DIR"
    docker compose up -d 2>/dev/null && log "Docker containers اجرا شدند" || warn "Docker compose failed — اجرا را پس از restart بررسی کنید"
fi

# ══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}   ✅  نصب WiFi-Media با موفقیت انجام شد!${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}📶 SSID     :${NC} $WIFI_SSID"
echo -e "  ${CYAN}🔑 Password :${NC} $WIFI_PASS"
echo -e "  ${CYAN}🌐 URL      :${NC} http://$SERVER_IP  یا  http://wifi.local"
echo -e "  ${CYAN}📺 TVH      :${NC} http://$SERVER_IP:9981"
echo -e "  ${CYAN}🔧 Admin    :${NC} admin / admin  ← فوری تغییر دهید!"
echo ""
echo -e "  ${YELLOW}پس از نصب، یکبار reboot کنید:${NC}  sudo reboot"
echo ""
