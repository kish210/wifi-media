#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════
# network-setup.sh — تنظیم سریع شبکه
# اجرا کنید: sudo bash network-setup.sh
# ══════════════════════════════════════════════════════════════════════════

WIFI_IFACE="${1:-wlan0}"
SERVER_IP="${2:-192.168.100.1}"

echo "═══ WiFi-Media Network Setup ═══"
echo "Interface : $WIFI_IFACE"
echo "Server IP : $SERVER_IP"

# بررسی AP mode
echo ""
echo "→ بررسی قابلیت AP mode..."
if iw phy 2>/dev/null | grep -q "AP"; then
    echo "✓ AP mode پشتیبانی می‌شود"
else
    echo "⚠ AP mode پشتیبانی نشد — ممکن است نیاز به driver داشته باشید"
fi

# باند و کانال
echo ""
echo "→ کانال‌های در دسترس:"
iw phy 2>/dev/null | grep "MHz" | grep -v disabled | head -20 || echo "  اطلاعات در دسترس نیست"

# IP فعلی
echo ""
echo "→ آدرس‌های IP فعلی:"
ip addr show "$WIFI_IFACE" 2>/dev/null || echo "  کارت $WIFI_IFACE پیدا نشد"

# اعمال IP
echo ""
echo "→ اعمال IP $SERVER_IP..."
ip link set "$WIFI_IFACE" up 2>/dev/null
ip addr flush dev "$WIFI_IFACE" 2>/dev/null
ip addr add "$SERVER_IP/24" dev "$WIFI_IFACE" 2>/dev/null && \
    echo "✓ IP $SERVER_IP اعمال شد" || \
    echo "⚠ خطا در اعمال IP (ممکن است قبلاً تنظیم شده باشد)"

# نمایش وضعیت
echo ""
echo "→ وضعیت نهایی:"
ip addr show "$WIFI_IFACE"
