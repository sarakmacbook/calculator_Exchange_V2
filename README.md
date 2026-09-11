# 💱 P2P Exchange Calculator

> **Live Demo:** [https://sarakmacbook.github.io/calculator_Exchange_V2/](https://sarakmacbook.github.io/calculator_Exchange_V2/)  
> **GitHub:** [https://github.com/sarakmacbook/calculator_Exchange_V2](https://github.com/sarakmacbook/calculator_Exchange_V2)

A sleek, dark-themed **P2P exchange calculator** for converting **US Dollar (USD)** and **Iraqi Dinar (IQD)** to **USDT**. Built as a tiny static site — zero dependencies, blazing fast, and fully responsive across **all devices**.

![Dark Theme](https://img.shields.io/badge/theme-dark-black?style=flat-square) ![PWA Ready](https://img.shields.io/badge/PWA-ready-c5f000?style=flat-square) ![Zero Dependencies](https://img.shields.io/badge/deps-zero-success?style=flat-square) ![Responsive](https://img.shields.io/badge/responsive-all_devices-blue?style=flat-square) ![Made by AI](https://img.shields.io/badge/made_by_AI-Kimi_2.6-c5f000?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **🔄 Dual Currency** | One **Currency** dropdown on the left picks **USD** or **IQD** — no more juggling two tabs |
| **🔀 Direction Toggle** | **Send → Receive** switcher sits on the right of the same row, independent of the currency |
| **⚡ Real-time** | Result updates as you type — no submit button |
| **🔍 Find Unit Price** | Reverse-calculate the unit rate from a past trade (amount paid ÷ USDT received), then tap to apply it |
| **📈 Profit Calculator** | Separate panel for buy price, sell price, and USDT amount → cost, revenue, net profit, and profit % |
| **💹 Live Profit Row** | Side panel shows amount → converted value → profit for the current inputs, with a **%** tool for a cut of that profit |
| **🎯 Quick Chips** | Tap 500 / 1K / 1.5K / 2K (USD) or 500K / 1M / 1.5M / 2M (IQD); Receive mode uses 50 / 100 / 200 / 500 USDT |
| **➕ Quick Amount Math** | Use the calculator icon beside Amount to add, subtract, multiply, or divide before applying a new total |
| **📱 PWA Ready** | Branded tab, browser shortcut, and home-screen icon on iOS & Android |
| **🌙 Dark Mode** | Clean black theme with lime green accents |
| **🖥️ Desktop Frame** | Phone-like centered layout on desktop |
| **📸 Private Result Screenshot** | Hold the conversion result to save a PNG — no profit or percentage data, plus the site URL in the footer |
| **📋 Tap to Copy** | Quick-tap the result to copy the number to the clipboard |
| **🚀 Demo Deploy Button** | A **Deploy to GitHub** button that plays a mock Pages deploy — labelled `demo`, publishes nothing |
| **🧹 Fresh on Refresh** | No localStorage — rate and amount reset to defaults every time you reload (privacy-friendly) |

### Currency and direction

The header row is a single line: the **Currency** dropdown on the left (USD or IQD) and the **Send → Receive** switcher on the right.

* Picking a currency resets the unit price to that currency's default (USD **1**, IQD **14**), clears the amount, and reloads the quick chips, labels, and profit row.
* Changing the direction keeps the chosen currency — you can flip between Send and Receive without losing it.
* USD and IQD share the same layout: only labels, chips, and rounding change.

### Find Unit Price

Work backwards from a completed trade when you only know what you paid and how much USDT you got:

1. Tap **Find Unit Price**.
2. Enter **Amount Paid** (in the active currency) and **USDT Received**.
3. The panel shows `paid ÷ received` as the unit price, with the formula underneath.
4. Tap the result (or **Use this rate**) to drop it into the main Unit price field and close the panel.

Labels follow the active currency (USD or IQD). Nothing is stored — close the panel or refresh and the fields clear.

### Profit Calculator

A dedicated panel for buy/sell spreads, separate from the main conversion:

1. Tap **Profit Calculator**.
2. Enter **Buy Price**, **Sell Price** (both in currency/USDT), and **Amount (USDT)**.
3. Instantly see **Cost**, **Revenue**, **Net Profit**, and **Profit %** — green for gains, red for losses.
4. Tap **Reset** to clear the fields, or **Close** to hide the panel.

Currency units on the labels update with the USD/IQD dropdown. Like everything else, values are not persisted across reloads.

### Live profit row & % of profit

Once a valid unit price and amount are entered, the side panel shows a single live row:

* **Send mode:** `amount currency → received USDT → +/− profit currency`
* **Receive mode:** `amount USDT → sent currency → +/− profit currency`

Tap the **%** button on that row to open a small panel that takes a percentage of the current base profit (e.g. “what is 40% of this profit?”). Profit and percentage panels are never included in screenshots.

### Save a result screenshot

1. Enter a valid unit price and amount in either currency and Send/Receive mode.
2. **Hold the main result for about 0.65 seconds** (with a keyboard: focus the result and press Enter/Space).
3. Preview the image and choose **Save PNG**, or **Share** on browsers that support image sharing. On mobile, you can also hold the preview image to save it.

The image contains only the conversion result, formula, unit price, amount, and a footer with the **site URL** so anyone it gets forwarded to can find the calculator. The footer prints the address the page is actually served from — e.g. `https://calc.example.com` on your own domain, or `https://sarakmacbook.github.io/calculator_Exchange_V2` on GitHub Pages — and falls back to that public URL when the page is opened from `file://`, `localhost`, a raw IP, or a throwaway preview host. All profit and percentage panels are excluded, even when open; the calculator's values and panels are left unchanged. Short taps and scrolling do not capture an image. PNGs are generated locally using native canvas, with no upload, external library, or network connection required.

**Tap to copy:** a quick tap (without holding) on the main result copies the numeric result to your clipboard, so you can paste it anywhere. Hold still opens the screenshot.

### Quick amount math

1. Enter an amount, for example **10**.
2. Tap the small calculator icon beside **clear** in the amount field.
3. Choose **+**, **−**, **×**, or **÷**, then enter another value. For example, `10 + 10` previews **20**.
4. Tap **Use 20** (or press Enter) to put the total into the amount field and update the conversion.

The calculator prevents division by zero and totals of zero or less, so the exchange amount stays valid.

---

### Demo deploy button

At the bottom of the calculator there's a **Deploy to GitHub** button tagged `demo`. It exists only so the app can be shown in demos and screenshots as if it were deployable:

1. Tap it and the panel plays four fake Pages stages — build, upload artifact, `deploy-pages`, publish — with a progress bar.
2. It finishes with `Live at https://sarakmacbook.github.io/calculator_Exchange_V2 — not published; demo only`.
3. **Reset demo** puts it back to idle, so you can replay it.

Nothing is deployed. The button issues no `fetch`, `XMLHttpRequest`, beacon, or navigation, needs no token, and changes no calculator state — the conversion, currency dropdown, Send/Receive switch, tap-to-copy and hold-to-screenshot all behave exactly as before. For a real deploy, use the instructions below.

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
curl -sL https://raw.githubusercontent.com/sarakmacbook/calculator_Exchange_V2/main/install.sh | sudo bash
```

### Clone & Install

```bash
git clone https://github.com/sarakmacbook/calculator_Exchange_V2.git
cd calculator_Exchange_V2
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

Upload `index.html` together with `manifest.webmanifest` and the icon files — it works on **any** static host:

| Platform | Method |
|----------|--------|
| **GitHub Pages** | Enable Pages → `GitHub Actions` source → deploy on push (auto via `.github/workflows/pages.yml`) |
| **Cloudflare Pages** | Drag & drop |
| **Vercel / Netlify** | Connect repo or drag & drop |
| **Nginx / Apache** | Copy to web root |
| **S3 / GCS / R2** | Upload file |

> **GitHub Pages note:** The repo ships a ready-to-use workflow (`.github/workflows/pages.yml`) that builds and publishes the static site automatically on every push to `main`. To activate it, go to **Settings → Pages**, set **Source** to **GitHub Actions**, and push a commit. The live demo then appears at:
> `https://sarakmacbook.github.io/calculator_Exchange_V2/`

---

## 🖼️ Screenshots

### Mobile
```
┌───────────────────────────┐
│  Calculator               │
│  CURRENCY · US Dollar     │
│  [USD ▾]  [Send→Receive]  │
│                           │
│  [ Find Unit Price ]      │
│  [ Profit Calculator ]    │
│                           │
│       Receive             │
│     500.00 USDT           │
│   500 USD ÷ 1             │
│                           │
│  Unit price          reset│
│  1                        │
│  USD per 1 USDT           │
│                           │
│  Amount send   🧮 clear   │
│  500                      │
│  USD                      │
│                           │
│  [500][1K][1.5K][2K]      │
│                           │
│  [ Deploy to GitHub demo ]│
│                           │
│  Amount → USDT = Profit   │
│  500 USD  500.00  +0.00 % │
└───────────────────────────┘
```

### Desktop
```
        ┌────────────────────────────────────────┐
        │   Calculator                           │
        │   CURRENCY · US Dollar                 │
        │   [ USD   ▾ ]   [ Send → Receive ]     │
        │                                        │
        │   [ Find Unit Price ]                  │
        │   [ Profit Calculator ]                │
        │                                        │
        │          Receive                       │
        │        500.00 USDT                     │
        │                                        │
        │   Unit price        reset              │
        │   1                                    │
        │   USD per 1 USDT                       │
        │                                        │
        │   Amount send   🧮 clear               │
        │   500                                  │
        │   USD                                  │
        │                                        │
        │  [500][1K][1.5K][2K]                   │
        │                                        │
        │  [ Deploy to GitHub  · demo ]          │
        │                                        │
        │   Amount → USDT = Profit               │
        │   500 USD · 500.00 USDT · +0.00  [%]   │
        └────────────────────────────────────────┘
          ↑ Currency dropdown on the left · Send/Receive on the right
```

---

## 📝 Default Rates

| Currency | Rate |
|----------|------|
| **USD** | 1 USD = 1 USDT |
| **IQD** | 14 IQD = 1 USDT |

Tap **reset** to restore defaults. Values are **not** saved between sessions — a refresh always starts clean.

---

## 🛠️ Tech Stack

- **HTML5** — semantic markup, viewport-fit=cover
- **CSS3** — flexbox, media queries, safe-area insets, env()
- **Vanilla JS** — no frameworks, no build step
- **Static HTML** — core UI and calculator logic in `index.html`
- **Install assets** — a manifest plus favicon, browser, and home-screen icons
- **Zero dependencies** — no npm, no bundler
- **No localStorage** — inputs reset on every page load

---

## 📂 File Structure

```
calculator_Exchange_V2/
├── index.html              # The entire app (responsive, PWA-ready)
├── manifest.webmanifest    # Browser shortcut / install metadata
├── favicon.svg             # Browser-tab logo
├── icon.svg                # Scalable app-icon source
├── icon-192.png            # Android / browser shortcut icon
├── icon-512.png            # High-resolution install icon
├── apple-touch-icon.png    # iOS home-screen icon
├── Dockerfile              # Production container image
├── install.sh              # Interactive VPS installer
├── README.md               # This file
├── Caddyfile               # Caddy server config
├── docker-compose.yml      # Docker Compose setup
├── tests/
│   └── screenshot.test.cjs # Playwright regression suite
├── .github/workflows/
│   └── pages.yml           # Auto-deploy to GitHub Pages
└── .gitignore
```

---

## 🧪 Screenshot regression tests

The app still needs no dependencies or build step. Optional browser tests use Node.js 20+ and Playwright:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node --test tests/screenshot.test.cjs
```

The tests serve the page internally (no dev server needed) and cover the merged Currency dropdown (left) with the Send/Receive switcher (right) at both 1280px and 320px, plus USD/IQD in both modes, real mouse/touch holds, gesture cancellation, profit exclusion, PNG downloads (including the site-URL footer), keyboard access, small-screen layout, sharing fallbacks, export errors, and the demo-only Deploy button (idle → busy → done → reset, zero network calls, calculator still works afterwards). A custom browser installation can be supplied with `CHROMIUM_EXECUTABLE_PATH` and, if needed, `CHROMIUM_ARGS` (a JSON array).

---

## 🆕 What's new

Recent updates reflected in this README:

| Update | Detail |
|--------|--------|
| **Demo Deploy button** | Mock “Deploy to GitHub” flow with progress stages — tagged `demo`, publishes nothing |
| **Screenshot site URL** | Hold-to-screenshot PNGs stamp the live site address in the footer (with safe fallbacks) |
| **Currency dropdown** | USD/IQD tabs replaced by one dropdown; Send/Receive sits on the same header row |
| **Find Unit Price** | Reverse rate from amount paid + USDT received |
| **Profit Calculator** | Buy / sell / amount panel with cost, revenue, net profit, and % |
| **Live profit row + %** | Side-panel profit readout with optional percentage-of-profit tool |
| **Quick amount math** | + − × ÷ helper beside the amount field |
| **PWA branding** | Manifest + icons for home-screen / browser shortcut |
| **Tap to copy** | Quick-tap the result number; hold still screenshots |
| **No localStorage** | Fresh defaults on every refresh |

---

## 🤝 Contributing

Pull requests welcome! This is a single-file app — keep it simple.

---

## 📄 License

**MIT** — free to use, modify, and distribute.

---

**Made by AI · Kimi 2.6** 🤖
