# Changelog — WiFi-Media

All notable changes to this project will be documented in this file.  
تمام تغییرات مهم در این فایل مستند می‌شوند.  
جميع التغييرات المهمة موثقة في هذا الملف.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/)

---

## [1.0.0] — 2024-01-01

### 🎉 Initial Release | انتشار اولیه | الإصدار الأول

#### ✨ Added | اضافه شد | تمت الإضافة

**Backend (Node.js + TypeScript)**
- Express REST API with JWT authentication (admin/viewer roles)
- SQLite database with WAL mode (better-sqlite3)
- TVHeadend HTTP API integration — channels, EPG, HLS streams
- Media scanner — recursive scan, filename metadata extraction
- Socket.io WebSocket server — watch party sync + real-time chat
- HTTP range request support for video seeking
- Redis sessions + pub/sub
- Docker healthcheck endpoint (`/api/health`)

**Frontend (React 18 + Vite + Tailwind)**
- Home dashboard — Continue Watching, Live Now, Trending
- Live TV — channel grid, EPG, category filters, favorites
- Media Library — Movies, Series, Music, Videos with search
- Games page — LAN Trivia, Pong, Chess, Word Chain
- Watch Party — room management, synchronized playback, chat
- Network Status — service health, endpoints
- Admin Panel — user management, media scan, stats
- Settings — theme, language selector
- Profile — watch history, watchlist
- HLS.js video player with mini/fullscreen modes
- Zustand state management (auth + player)
- TanStack Query with offline caching

**i18n — Internationalization**
- 🇬🇧 English (LTR)
- 🇮🇷 Persian / فارسی (RTL) — Vazirmatn font
- 🇸🇦 Arabic / العربية (RTL)
- Language switcher in topbar + Settings page
- Persistent language preference (localStorage)
- Full RTL layout flip (sidebar, topbar, margins)

**Captive Portal (deploy/)**
- `install.sh` — one-command auto-install for Ubuntu/Debian
- `hostapd.conf` — WiFi Access Point (2.4/5 GHz, WPA2)
- `dnsmasq.conf` — DHCP + DNS redirect (all domains → server)
- `iptables.sh` — Captive portal redirect rules
  - Android `/generate_204` detection
  - Apple iOS `/hotspot-detect.html` detection
  - Windows `/connecttest.txt` detection
  - Firefox `/success.txt` detection
- `nginx-portal.conf` — Reverse proxy + portal endpoints
- `wifi-media.service` — Systemd auto-start service
- Full Farsi setup guide (`راهنما.md`)

**Infrastructure**
- Docker Compose multi-service (backend, frontend, tvheadend, redis, preview)
- nginx reverse proxy with WebSocket upgrade + stream proxying
- Preview service (nginx:alpine, zero build required)
- Particle canvas background animation
- Glassmorphism dark UI design

**GitHub**
- CI workflow (build + lint on push/PR)
- Release workflow (tagged releases with deploy archive)
- Issue templates (Bug, Feature) in FA/AR/EN
- PR template with i18n checklist

#### 🎯 Supported Hardware
- Raspberry Pi 4/5 (4GB+ RAM)
- Intel N100 / NUC Mini-PC
- Any x86_64 machine with Ubuntu Server 22.04

#### 📱 Tested Devices
- iOS (iPhone/iPad) — Captive portal auto-detected ✅
- Android — `/generate_204` redirect ✅
- Windows — NCSI check ✅
- macOS — CNA redirect ✅

---

## [Unreleased]

### 🔮 Planned | برنامه‌ریزی شده

- [ ] Draw & Guess LAN game
- [ ] Quick Quiz game with custom questions
- [ ] DLNA/UPnP discovery
- [ ] Subtitle support (SRT, VTT)
- [ ] Mobile app (PWA installable)
- [ ] Multi-server federation
- [ ] Vietnamese (VI) language support
- [ ] Chinese (ZH) language support
