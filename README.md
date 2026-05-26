<div align="center">

# 📡 WiFi-Media

### Local Network Entertainment Platform

**Live TV · Movies · Music · Games · Watch Party**  
*Works completely offline — no internet required*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/kish210/wifi-media?color=brightgreen)](https://github.com/kish210/wifi-media/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/kish210/wifi-media/ci.yml?label=CI)](https://github.com/kish210/wifi-media/actions)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](docker-compose.yml)
[![Node](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](backend/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](frontend/)
[![RTL](https://img.shields.io/badge/Language-FA%20%7C%20AR%20%7C%20EN-8b5cf6)](preview.html)

[**🔴 Live Preview →**](https://raw.githack.com/kish210/wifi-media/main/preview.html) · [Setup Guide](#-quick-setup) · [فارسی](#-راهنمای-فارسی) · [العربية](#-دليل-عربي)

</div>

---

## ✨ Features

| Category | Features |
|----------|----------|
| 📺 **Live TV** | TVHeadend integration, EPG guide, HLS adaptive bitrate, channel categories |
| 🎬 **Media Center** | Movies, TV series, music, uploaded videos — offline streaming |
| 🎮 **LAN Games** | Trivia, Pong, Chess, Word Chain — no internet needed |
| 🎉 **Watch Party** | Synchronized playback, real-time chat, room management |
| 📶 **Captive Portal** | Auto-redirect all WiFi clients, works on iOS/Android/Windows |
| 🌐 **i18n** | Full Persian (RTL), Arabic (RTL), English support |
| 📱 **PWA** | Offline-first, installable on mobile |
| 🔐 **Auth** | JWT-based, multi-user, admin/viewer roles |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   WiFi Clients                       │
│         📱 iOS  🤖 Android  💻 Windows  🖥 macOS     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (any URL)
                       ▼
┌─────────────────────────────────────────────────────┐
│              iptables Captive Portal                 │
│         Redirects all port 80 → server              │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│                nginx (port 80)                       │
│  /generate_204  /hotspot-detect.html  /connecttest  │
│  → proxy to WiFi-Media App (8181)                   │
│  → /api/ proxy to Backend (4000)                    │
│  → /stream/ proxy to TVHeadend (9981)               │
└────────────┬────────────┬──────────────┬────────────┘
             ▼            ▼              ▼
    ┌──────────────┐ ┌─────────┐ ┌──────────────┐
    │   Frontend   │ │ Backend │ │  TVHeadend   │
    │ React + Vite │ │ Node.js │ │  Live TV     │
    │   port 8181  │ │  4000   │ │    9981      │
    └──────────────┘ └────┬────┘ └──────────────┘
                          ▼
                  ┌──────────────┐
                  │   SQLite DB  │
                  │    Redis     │
                  └──────────────┘
```

---

## 🚀 Quick Setup

### Prerequisites
- Ubuntu Server 22.04 LTS (recommended) or Raspberry Pi OS 64-bit
- WiFi adapter with AP mode support
- Docker & Docker Compose v2

### 1 — One-command install (Linux)

```bash
git clone https://github.com/kish210/wifi-media
cd wifi-media/deploy
sudo bash install.sh
```

Custom configuration:
```bash
sudo WIFI_SSID="My Network" WIFI_PASS="mypassword123" bash install.sh
```

### 2 — Docker only (no captive portal)

```bash
cp .env.example .env
docker compose up -d
```

Open: **http://localhost:8181**

### 3 — Preview (no Docker needed)

```bash
docker compose up preview --no-deps
```

Open: **http://localhost:8181**

---

## 📁 Project Structure

```
wifi-media/
├── backend/              # Node.js + Express + Socket.io
│   ├── src/
│   │   ├── routes/       # auth, channels, media, rooms, admin
│   │   ├── services/     # tvheadend, mediaScanner
│   │   ├── db/           # SQLite schema + seed
│   │   └── websocket/    # Watch party + chat
│   └── Dockerfile
├── frontend/             # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── pages/        # All app pages
│   │   ├── components/   # Player, Sidebar, etc.
│   │   ├── store/        # Zustand (auth, player)
│   │   └── services/     # Axios API client
│   └── Dockerfile
├── deploy/               # Captive portal deployment
│   ├── install.sh        # Auto-install script
│   ├── hostapd.conf      # WiFi AP config
│   ├── dnsmasq.conf      # DHCP + DNS
│   ├── iptables.sh       # Firewall rules
│   ├── nginx-portal.conf # Captive portal web server
│   └── wifi-media.service # Systemd auto-start
├── nginx/                # Production reverse proxy
├── preview.html          # Interactive UI demo (standalone)
└── docker-compose.yml    # Full stack deployment
```

---

## 🌐 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/channels` | Live TV channel list |
| GET | `/api/channels/:uuid/stream` | HLS stream URL |
| GET | `/api/media` | Media library (paginated) |
| GET | `/api/media/stream/:id` | Stream video (range support) |
| GET | `/api/rooms` | Watch party rooms |
| WS | `/socket.io` | Real-time events |
| GET | `/api/network/status` | Server status (no auth) |

---

## ⚙️ Environment Variables

```env
JWT_SECRET=your-secret-here
TVHEADEND_URL=http://tvheadend:9981
TVHEADEND_USER=admin
TVHEADEND_PASS=admin
MEDIA_PATH=/mnt/media
DB_PATH=/data/wifi-media.db
LOCAL_IP=192.168.100.1
TZ=Asia/Tehran
```

---

## 🎯 Use Cases

- 🚂 **Trains & Buses** — Entertainment for passengers, no internet required
- ✈️ **Aircraft** — In-flight media system
- 🏨 **Hotels** — Room entertainment with live TV
- 🏕️ **Camps** — Offline media for remote locations
- 🏢 **Buildings** — Local network TV + media sharing

---

## 📱 Supported Devices

All devices that can connect to WiFi and open a browser:
- iOS (iPhone/iPad) — Captive portal auto-detected
- Android phones & tablets
- Windows / macOS / Linux laptops
- Smart TVs with browser
- Any device with a modern browser

---

## 🔧 Hardware Recommendations

| Hardware | Price | Best For |
|----------|-------|----------|
| Raspberry Pi 4 (4GB) | ~$80 | Small deployments, 20 users |
| Intel N100 Mini-PC | ~$150 | Medium, 50 users |
| Intel NUC / Fanless PC | ~$200 | Large, 100+ users |

---

## 🌍 راهنمای فارسی

<div dir="rtl">

**WiFi-Media** یک پلتفرم سرگرمی کامل برای شبکه‌های محلی است — بدون نیاز به اینترنت.

### ✨ ویژگی‌ها

| بخش | توضیح |
|-----|-------|
| 📺 **تلویزیون زنده** | ادغام با TVHeadend، برنامه EPG، پخش HLS |
| 🎬 **مرکز رسانه** | فیلم، سریال، موسیقی، ویدیو — آفلاین |
| 🎮 **بازی‌های LAN** | Trivia، Pong، Chess، Word Chain |
| 🎉 **تماشای گروهی** | پخش همزمان، چت real-time |
| 📶 **Captive Portal** | redirect خودکار همه دستگاه‌ها (iOS/Android/Windows) |
| 🌐 **چندزبانه** | پشتیبانی کامل فارسی و عربی (RTL) |

### 🚀 نصب سریع

```bash
git clone https://github.com/kish210/wifi-media
cd wifi-media/deploy
sudo bash install.sh
```

تنظیمات سفارشی:
```bash
sudo WIFI_SSID="شبکه من" WIFI_PASS="رمزعبور" bash install.sh
```

### 📋 پیش‌نیازها

- Ubuntu Server 22.04 LTS یا Raspberry Pi OS 64-bit
- آداپتور WiFi با قابلیت Access Point
- Docker و Docker Compose v2
- حداقل ۴ گیگابایت RAM (Raspberry Pi 4 به بالا)

### 🔧 سخت‌افزار پیشنهادی

| سخت‌افزار | قیمت | مناسب برای |
|-----------|-------|------------|
| Raspberry Pi 4 (4GB) | ~۳,۵۰۰,۰۰۰ تومان | استقرار کوچک، ۲۰ کاربر |
| Intel N100 Mini-PC | ~۶,۵۰۰,۰۰۰ تومان | متوسط، ۵۰ کاربر |
| Intel NUC | ~۸,۵۰۰,۰۰۰ تومان | بزرگ، ۱۰۰+ کاربر |

📖 [راهنمای کامل نصب فارسی ←](deploy/راهنما.md)

</div>

---

## 🌍 دليل عربي

<div dir="rtl">

**WiFi-Media** منصة ترفيه محلية كاملة للشبكات المحلية — بدون الحاجة إلى الإنترنت.

### ✨ الميزات

| القسم | الوصف |
|-------|-------|
| 📺 **البث المباشر** | تكامل TVHeadend، دليل EPG، بث HLS |
| 🎬 **مركز الوسائط** | أفلام، مسلسلات، موسيقى — بدون إنترنت |
| 🎮 **ألعاب الشبكة** | Trivia، Pong، Chess، Word Chain |
| 🎉 **حفلة المشاهدة** | تشغيل متزامن، دردشة فورية |
| 📶 **Captive Portal** | إعادة توجيه تلقائية لجميع الأجهزة |
| 🌐 **متعدد اللغات** | دعم كامل للعربية والفارسية (RTL) |

### 🚀 التثبيت السريع

```bash
git clone https://github.com/kish210/wifi-media
cd wifi-media/deploy
sudo bash install.sh
```

### 📋 المتطلبات

- Ubuntu Server 22.04 LTS أو Raspberry Pi OS 64-bit
- محول WiFi يدعم وضع نقطة الوصول
- Docker و Docker Compose v2
- ذاكرة وصول عشوائي لا تقل عن 4 جيجابايت

</div>

---

## 🤝 Contributing

Contributions are welcome in any language! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT © 2024 — Free for personal and commercial use.  
See [LICENSE](LICENSE) for full text.

---

<div align="center">
Made with ❤️ for offline entertainment
</div>
