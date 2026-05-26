# Contributing to WiFi-Media

<div dir="rtl">

## مشارکت در WiFi-Media | المساهمة في WiFi-Media

</div>

Thank you for considering contributing! · ممنون از مشارکت شما! · شكرًا لاهتمامك بالمساهمة!

---

## 🌐 Language | زبان | اللغة

You can contribute in **English**, **فارسی**, or **العربية** — all three are welcome in issues, PRs, and discussions.

---

## 🚀 Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/wifi-media
cd wifi-media
```

### 2. Run Preview (no Docker needed)

```bash
# Open preview.html directly in your browser
start preview.html   # Windows
open preview.html    # macOS
xdg-open preview.html  # Linux
```

### 3. Run Full Stack

```bash
cp .env.example .env
docker compose up -d
```

---

## 📋 How to Contribute

### 🐛 Bug Reports

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml) and include:
- Steps to reproduce
- Expected vs actual behavior
- Browser / OS / device
- Docker logs (`docker compose logs`)

### ✨ Feature Requests

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml).

### 🔀 Pull Requests

1. Create a branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Test: `docker compose up` should work without errors
4. Push and open a PR using the [PR template](.github/PULL_REQUEST_TEMPLATE.md)

---

## 🌐 i18n — Translations

All UI strings live in `preview.html` in the `STRINGS` object:

```javascript
const STRINGS = {
  en: { key: "English text" },
  fa: { key: "متن فارسی" },
  ar: { key: "النص العربي" }
};
```

When adding a new UI string:
- Add it to all three language objects (`en`, `fa`, `ar`)
- Use RTL-appropriate punctuation for FA/AR (e.g., `،` instead of `,`)
- Test with the language switcher in the topbar

For the full React frontend (`frontend/src/`):
- Translation files: `frontend/src/i18n/`
- Add keys to `en.json`, `fa.json`, and `ar.json`

---

## ✅ Checklist Before Opening a PR

- [ ] `docker compose up` runs without errors
- [ ] `preview.html` renders correctly (open in browser)
- [ ] FA/AR translations added if UI text changed
- [ ] No API keys, tokens, or passwords in code
- [ ] No `node_modules/` or `dist/` files committed

---

## 📐 Code Style

| Area | Standard |
|------|----------|
| Backend (TS) | ESLint + Prettier, strict TypeScript |
| Frontend (React) | Tailwind utility classes, functional components |
| CSS | `[dir=rtl]` selectors for RTL overrides |
| Commits | Conventional Commits (`feat:`, `fix:`, `docs:`, etc.) |

---

## 🔐 Security

Found a vulnerability? Please **do not** open a public issue.  
See [SECURITY.md](SECURITY.md) for responsible disclosure.

---

## 💬 Questions?

Open a [Discussion](https://github.com/kish210/wifi-media/discussions) — in any language.

<div dir="rtl">

### راهنمای فارسی

برای مشارکت:
۱. یک Issue باز کنید یا یک PR ارسال کنید
۲. از template‌های موجود استفاده کنید
۳. اگر UI تغییر کرد، ترجمه FA/AR/EN را اضافه کنید

### دليل المساهمة بالعربية

للمساهمة:
١. افتح Issue أو أرسل PR
٢. استخدم القوالب المتاحة
٣. إذا تغهرت واجهة المستخدم، أضف ترجمات FA/AR/EN

</div>
