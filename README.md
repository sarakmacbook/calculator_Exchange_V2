# 💱 P2P Exchange Calculator

> **Live Demo:** [https://sarakmacbook.github.io/p2p_exchange_calculator](https://sarakmacbook.github.io/p2p_exchange_calculator)  
> **GitHub:** [https://github.com/sarakmacbook/p2p_exchange_calculator](https://github.com/sarakmacbook/p2p_exchange_calculator)

A sleek, dark-themed **P2P exchange calculator** for converting **US Dollar (USD)** and **Iraqi Dinar (IQD)** to **USDT**. Built as a single static file — zero dependencies, blazing fast, and fully responsive across **all devices**.

![Dark Theme](https://img.shields.io/badge/theme-dark-black?style=flat-square) ![PWA Ready](https://img.shields.io/badge/PWA-ready-c5f000?style=flat-square) ![Zero Dependencies](https://img.shields.io/badge/deps-zero-success?style=flat-square) ![Responsive](https://img.shields.io/badge/responsive-all_devices-blue?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **🔄 Dual Currency** | Switch between **USD** and **IQD** instantly |
| **⚡ Real-time** | Result updates as you type — no submit button |
| **📊 Scale Table** | See preset conversions at your current rate |
| **📋 Tap to Copy** | One tap copies the result (works on all devices) |
| **💾 Persistent** | Remembers your last rate & amount (localStorage) |
| **🎯 Quick Chips** | Tap 500 / 1K / 1.5K / 2K (USD) or 500K / 1M / 1.5M / 2M (IQD) |
| **📱 PWA Ready** | Add to home screen on iOS & Android |
| **🌙 Dark Mode** | Clean black theme with lime green accents |
| **🖥️ Desktop Frame** | Phone-like centered layout on desktop |

---

## 📱 Responsive Design

Works perfectly on **every screen size**:

| Device | Experience |
|--------|-----------|
| **📱 iPhone / Android** | Full screen native app feel |
| **📟 iPad / Tablet** | Balanced wide layout |
| **🖥️ Desktop** | Centered phone frame with glow shadow |
| **🔄 Landscape** | Auto-compact layout |
| **📟 Small phone (SE)** | Shrunk fonts to fit |
| **🖥️ Large monitor** | Bigger frame, larger fonts |

---

## 🚀 Quick Start

### One-Command VPS Install

```bash
curl -sL https://raw.githubusercontent.com/sarakmacbook/p2p_exchange_calculator/main/install.sh | sudo bash
```

### Clone & Install

```bash
git clone https://github.com/sarakmacbook/p2p_exchange_calculator.git
cd p2p_exchange_calculator
sudo bash install.sh
```

The installer is **fully interactive** — it asks you:
- 🌐 **Domain** (optional, defaults to IP)
- 🔌 **Port** (default: 80)
- ⚙️ **Server** — Nginx / Caddy / Docker
- 📁 **File path** (default: `/var/www/iqd-usdt-calc`)

### Example Session
```
🌐 Step 1: Domain (optional)
   Enter domain [e.g., calc.yoursite.com]: calc.mysite.com

🔌 Step 2: Port
   Enter port [80]: 80

⚙️  Step 3: Web Server
   1) Nginx     2) Caddy     3) Docker
   Choose [1/2/3] (default: 1): 1

📁 Step 4: Where to store files
   Enter path [/var/www/iqd-usdt-calc]:

📋 Installation Summary:
   Domain:    calc.mysite.com
   Port:      80
   Service:   nginx
   Files:     /var/www/iqd-usdt-calc

   Proceed? [Y/n]: Y
```

---

## 🐳 Docker

```bash
docker build -t p2p-calc .
docker run -d -p 80:80 --name p2p-calc --restart unless-stopped p2p-calc
```

Or use the interactive installer and pick **Docker**.

---

## 📤 Manual Deploy

Just upload `index.html` — it works on **any** static host:

| Platform | Method |
|----------|--------|
| **GitHub Pages** | Enable Pages → `main` branch → root |
| **Cloudflare Pages** | Drag & drop |
| **Vercel / Netlify** | Connect repo or drag & drop |
| **Nginx / Apache** | Copy to web root |
| **S3 / GCS / R2** | Upload file |

---

## 🖼️ Screenshots

### Mobile
```
┌─────────────────────────┐
│  Calculator             │
│  [ USD ] [ IQD ]        │
│                         │
│       Receive           │
│     500.00 USDT         │
│  500 USD ÷ 1            │
│      tap to copy        │
│                         │
│  Unit price      reset  │
│  1                      │
│  USD per 1 USDT         │
│                         │
│  Amount send     clear  │
│  500                    │
│  USD                    │
│                         │
│  [500][1K][1.5K][2K]   │
│                         │
│  Scale at current rate  │
│  500 USD   →  500.00    │
│  1K USD    →  1000.00   │
│  1.5K USD  →  1500.00   │
│  2K USD    →  2000.00   │
└─────────────────────────┘
```

### Desktop
```
        ┌─────────────────────┐
        │   💱 Calculator     │
        │  [USD]  [IQD]       │
        │                     │
        │     Receive         │
        │   500.00 USDT       │
        │    tap to copy      │
        │                     │
        │  Unit price  reset  │
        │  1                  │
        │  USD per 1 USDT     │
        │                     │
        │  Amount send clear  │
        │  500                │
        │  USD                │
        │                     │
        │ [500][1K][1.5K][2K]│
        │                     │
        │  Scale at rate      │
        │  500  → 500.00      │
        │  1K   → 1000.00     │
        │  1.5K → 1500.00     │
        │  2K   → 2000.00     │
        └─────────────────────┘
              ↑ lime glow
```

---

## 📝 Default Rates

| Currency | Rate |
|----------|------|
| **USD** | 1 USD = 1 USDT |
| **IQD** | 14 IQD = 1 USDT |

Tap **reset** to restore defaults.

---

## 🛠️ Tech Stack

- **HTML5** — semantic markup, viewport-fit=cover
- **CSS3** — flexbox, media queries, safe-area insets, env()
- **Vanilla JS** — no frameworks, no build step
- **Single file** — everything in `index.html`
- **Zero dependencies** — no npm, no bundler

---

## 📂 File Structure

```
p2p_exchange_calculator/
├── index.html          # The entire app (responsive, PWA-ready)
├── install.sh          # Interactive VPS installer
├── README.md           # This file
├── Caddyfile           # Caddy server config
├── docker-compose.yml  # Docker Compose setup
└── .gitignore
```

---

## 🤝 Contributing

Pull requests welcome! This is a single-file app — keep it simple.

---

## 📄 License

**MIT** — free to use, modify, and distribute.
