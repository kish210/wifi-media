# Security Policy | سیاست امنیتی | سياسة الأمان

## 🔒 Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Yes |
| < 1.0   | ❌ No |

---

## 🐛 Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

### How to Report

Send a private report via **GitHub Security Advisories**:

1. Go to the [Security tab](https://github.com/kish210/wifi-media/security)
2. Click **"Report a vulnerability"**
3. Fill in the details

Or email: open a private GitHub advisory (preferred).

### What to Include

- Type of vulnerability (XSS, CSRF, SQL injection, auth bypass, etc.)
- File path(s) and line number(s)
- Steps to reproduce
- Potential impact

---

## ⏱️ Response Timeline

| Step | Timeframe |
|------|-----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 7 days |
| Fix released | Within 30 days for critical |

---

## 🛡️ Security Scope

This project runs on a **local network only** (no internet). Key security considerations:

### In Scope
- Authentication bypass (JWT issues)
- Path traversal in media file serving
- Remote code execution via media scanner
- SQL injection in SQLite queries
- WebSocket session hijacking in Watch Party
- Captive portal bypass

### Out of Scope
- Attacks requiring physical access to the server hardware
- Issues in third-party services (TVHeadend, Redis)
- Denial of service on local network (by design, server is LAN-only)

---

## 🔐 Security Best Practices for Deployment

When deploying WiFi-Media:

1. **Change default credentials** — update `JWT_SECRET` in `.env`
2. **Use strong WiFi password** — change from default in `hostapd.conf`
3. **Restrict admin access** — admin panel is JWT-protected
4. **Keep Docker images updated** — `docker compose pull && docker compose up -d`
5. **Review iptables rules** — ensure port 22 (SSH) is only accessible from trusted networks

---

<div dir="rtl">

## راهنمای امنیتی فارسی

برای گزارش آسیب‌پذیری امنیتی، لطفاً از طریق **GitHub Security Advisories** اقدام کنید و آن را به صورت عمومی منتشر نکنید.

## إرشادات الأمان بالعربية

للإبلاغ عن ثغرة أمنية، يرجى استخدام **GitHub Security Advisories** وعدم نشرها علنًا.

</div>
