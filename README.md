# 💰 WealthPulse v3.5 — React + Vite Edition

A complete personal finance tracker with group expense splitting, **automatic SMS transaction capture**, and **Smart Insights engine**, built with **React 18 + Vite + Zustand + Capacitor Android**.

---

## Quick Start

```bash
npm install
npm run dev        # http://localhost:8090
```

## Build Android APK

```bash
npm run build && npx cap sync android && cd android && .\gradlew.bat assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## What's New in v3.6

### 🛠️ Performance & Stabilization
- **Reactive State Management** — Refactored state access from `useStore.getState()` to granular Zustand selectors with `shallow` equality, significantly reducing unnecessary component re-renders.
- **Hook Integrity** — Audit and correction of `useEffect` dependency arrays across the codebase to prevent stale closures and infinite render loops.
- **Improved SMS UX** — Migrated the pending SMS notification badge from the mobile bottom navigation to the global header for better visibility across all pages.
- **Clean Architecture** — Standardized security protocols for data resets and authentication state handling.

---

## What's New in v3.5


### 💸 Partial Settlement (new)
- **Flexible Payments** — Record partial payments for group debts instead of just full amounts.
- **Auto-Calculated Balance** — The remaining debt is automatically recalculated and updated in the group balances.
- **Personal Sync** — Optionally sync only the paid partial amount to your personal expense/income history.
- **Smart UI** — Added a "Full / Partial" toggle in the settlement modal with a focus-ready numeric amount input.

---

## What's New in v3.4

### 🧠 Smart Insights Engine (new)
Reports and Insights have been merged into a single **Reports & Insights** page (`/insights`) with five tabs:

| Tab | What it does |
|---|---|
| 📊 Monthly | Full monthly report — spent, income, savings rate, avg daily, category breakdown with budget % bars, month-over-month comparison |
| 🔍 Vendors | Groups all transactions by normalized merchant name. Shows top 5 merchants by total spend, transaction count, and % of income |
| 📈 Forecast | Burn rate analysis for the current month — daily burn, projected month-end total vs budget, safe daily spend limit, and budget exhaustion date |
| 📉 Alerts | Anomaly detection vs your 3-month rolling average per category. Flags spikes (≥30% above avg), sharp drops (≤40% below avg), and missing categories |
| 📆 Subscriptions | Detects recurring transactions by consistent amount (±10%) and monthly cadence. Shows monthly + yearly total cost |

**Implementation:** All logic lives in `src/hooks/useInsights.js` — pure computation, no server, runs lazily only when the tab is open. `normalizeVendor()` strips bank SMS noise (`PVT LTD`, `IMPS`, `NEFT`, etc.) before grouping merchants.

**Navigation:**
- Sidebar: "Reports & Insights" replaces the old separate Reports and Insights items
- Mobile nav: 4th tab slot is now "Reports" pointing to `/insights`
- Old `/reports` URL redirects to `/insights` automatically

### 📱 Mobile Viewport Fix
- Added `maximum-scale=1.0, user-scalable=no` to the viewport meta tag — fixes Android WebView auto-zoom on tap
- Added `touch-action: manipulation` on `body` — kills double-tap zoom
- All flex layouts now use `flex: '1 1 0', minWidth: 0` instead of fixed `minWidth` pixel values — content no longer overflows horizontally on small screens
- `overflow-x: hidden` enforced at `html`, `body`, `#root`, `.app-layout`, and `.main-content`
- `.card` globally gets `overflow: hidden` and `word-break: break-word`

---

## What's New in v3.3

### ☝️ Biometric Authentication
- **Native Security** — Login using Fingerprint or Face ID via the native Android BiometricPrompt API.
- **Auto-Prompt** — App automatically requests biometrics on launch if enabled.
- **Keypad Shortcut** — Fingerprint icon on the PIN screen keypad for manual trigger.
- **Hardware Detection** — Toggle only appears in Settings if your device supports biometric hardware.

### ✨ UI Refinement Phase
- **Staggered Animations** — Summary cards and charts have a smooth, staggered bounce entrance.
- **Glassmorphism** — Frosted-glass effect on the month navigation bar.
- **Improved Empty States** — Custom `EmptyState` components with unique icons and helpful copy.
- **UX Polish** — Hover lift effects on cards, refined layout spacing.

---

## What's New in v3.1

### 📲 SMS Auto-Capture (fully reworked)
- **Works when app is closed** — `SmsReceiver` saves incoming bank SMS to a `SharedPreferences` queue; delivered on next app open
- **Dual capture paths** — direct SMS via `SmsReceiver` + notification interception via `NotificationListener` as fallback
- **Smart sender filtering** — known bank sender IDs + body-starts-with transaction markers
- **Rewritten SMS parser** — type detection checks first line first; eliminates false positives
- **`To` line payee extraction** — handles double spaces and any name length
- **Ref/UPI number deduplication** — stable transaction ID prevents duplicates
- **`window.testSms()`** — debug helper for Chrome DevTools

### ⚡ Background Tracking
- **Foreground Service** — Keeps the app process alive when cleared from Recents
- **User Toggle** — Enable/disable in Settings
- **Auto-Restore** — Remembers preference across restarts and reboots

---

## Features

### 🔐 Authentication & Security
- 4-digit PIN lock screen with animated dot indicators and keypad
- Two-step PIN creation with mismatch reset
- Security question recovery
- Change PIN from Settings with current PIN verification
- Biometric Login (Fingerprint/Face ID) with auto-trigger
- Privacy mode — blur all amounts app-wide

### 💵 Personal Finance Tracking
- Add income & expenses with description, amount, category, date, notes
- 9 expense categories: Food & Dining, Transport, Shopping, Bills & Utilities, Health, Entertainment, Education, Rent & Housing, Other
- 5 income categories: Salary, Freelance, Investment, Gift, Other
- Edit & delete transactions with confirmation dialogs
- Search by description or category name; filter by All / Income / Expenses

### 📲 SMS Auto-Capture
- Automatic transaction detection from bank SMS (HDFC, SBI, ICICI, Axis, Kotak, PhonePe, GPay, Paytm)
- Pending SMS cards on dashboard — review before adding
- One-tap accept with category picker
- Quick Split — split a detected expense across group members instantly
- Payee memory — remembers category per payee; auto-applies on next detection
- Background capture — queued while app is closed

### 📊 Dashboard
- Monthly summary cards (Balance, Income, Expenses, Savings Rate)
- Yearly Savings (YTD)
- Month navigation
- Cash Flow Overview — 6-month bar chart
- Spending by Category — doughnut chart
- Quick Actions, My Groups, Pending Settlements, Budget Status widgets

### 💰 Budget Management
- Per-category monthly budgets with progress bars (green/yellow/red)
- Month-by-month tracking with net expense calculation

### 👥 Group Expense Splitting
- Create groups with members and avatar colors
- Equal / By Amount / By Percentage split methods
- Auto-sync paid expenses to personal transactions
- Simplified settlement algorithm (minimizes transactions)

### 💸 Settlements
- **Global Settle Up** — View all debts and receivables across all groups in one place.
- **Partial Payments** — Flexible settlement support (Full or Partial amounts).
- **Personal Sync** — Record settlements as personal transactions with category matching.
- **Third-Party Support** — Record payments between other group members to keep balances correct.

### 🧠 Reports & Insights (merged)
- **Monthly** — Spent, income, savings rate, avg daily, category breakdown, MoM comparison
- **Vendors** — Top merchants by total spend, normalized from raw SMS descriptions
- **Forecast** — Burn rate, projected overage, safe daily limit, budget exhaustion date
- **Alerts** — Category anomaly detection vs 3-month rolling average
- **Subscriptions** — Recurring transaction detection, monthly + yearly cost summary

### ⚙️ Settings
- Change PIN, Update Security Question
- Privacy Mode, Theme (Dark / Light / Auto)
- Export / Import JSON backup, Reset all data
- Budget Alerts, Settlement Reminders toggles
- Background Tracking toggle

---

## Architecture

```
src/
├── main.jsx
├── App.jsx                        # Root + React Router + FAB + Capacitor back button
├── store/useStore.js              # Zustand — all state + actions
├── services/
│   ├── storage.js                 # localStorage abstraction
│   ├── categories.js              # Category constants + helpers
│   ├── smsParser.js               # SMS parsing: amount, type, payee, date, dedup ID
│   └── crypto.js                  # SHA-256 PIN hashing
├── hooks/
│   ├── useInsights.js             # Smart Insights engine (vendor, burn rate, anomaly, subscriptions)
│   ├── useSmsListener.js          # Listens for wp_sms_test / wpReceiveSms events
│   ├── useToast.js
│   ├── useMediaQuery.js
│   └── useYTDSavings.js
├── features/
│   ├── insights/
│   │   └── InsightsView.jsx       # Reports & Insights — 5-tab merged view
│   ├── sms/
│   │   ├── PendingSmsCard.jsx
│   │   └── QuickSplitModal.jsx
│   ├── auth/PinLockScreen.jsx
│   ├── dashboard/Dashboard.jsx
│   ├── transactions/
│   ├── budgets/
│   ├── groups/
│   └── settings/
├── components/
│   ├── ui/ (Modal, Toast)
│   ├── layout/ (Sidebar, MobileNav, Header)
│   └── charts/ (CategoryDoughnut, TrendBarChart)
└── utils/ (formatters.js, helpers.js)

android/app/src/main/java/com/wealthpulse/app/
├── MainActivity.java              # Registers plugins; starts/stops ForegroundService
├── SmsReceiver.java               # Receives SMS_RECEIVED; queues to SharedPreferences
├── NotificationListener.java     # Intercepts bank app notifications as fallback
├── ForegroundService.java         # Persistent background service with notification
└── BackgroundServicePlugin.java   # Capacitor bridge for service control
```

## Smart Insights — How It Works

All computation is in `src/hooks/useInsights.js`. No server required.

```
useInsights()
  │
  ├── normalizeVendor(description)
  │     strips: pvt, ltd, india, upi, imps, neft, pos, etc.
  │     "ZOMATO INDIA PVT LTD" → "zomato"
  │
  ├── computeVendorInsights(allTransactions, totalIncome)
  │     groups by normalizedVendor → top 5 by total spend
  │     filters: count ≥ 2 OR amount ≥ ₹500
  │
  ├── computeBurnRate(monthTransactions, selectedMonth, budgets)
  │     only fires for current month with dayOfMonth ≥ 3
  │     dailyBurn = spentSoFar / dayOfMonth
  │     safeDaily = budgetLeft / daysLeft
  │
  ├── computeAnomalies(currentTxns, allTransactions, selectedMonth)
  │     builds 3-month history per category
  │     spike: currentAmount > avg × 1.30
  │     drop:  currentAmount < avg × 0.60
  │     missing: had history but zero this month
  │
  └── computeSubscriptions(allTransactions)
        groups by normalizedVendor
        checks: amount within ±10% of median, appears in ≥2 months,
                avg gap ≤ 45 days, last occurrence within (avgGap + 10) days
```

## Android SMS Pipeline

```
Bank SMS arrives
      │
      ▼
SmsReceiver.onReceive()
  ├── filter: known sender ID OR body starts with transaction marker
  ├── enqueue() → SharedPreferences queue (works app open or closed)
  └── sendBroadcast() → live delivery if app is open
      │
      ▼
MainActivity
  ├── onResume() → drainQueue() → dispatchToWebView() [missed messages]
  └── liveReceiver.onReceive() → dispatchToWebView() [real-time]
      │
      ▼
window.wpReceiveSms(body)  OR  CustomEvent('wp_sms_test')
      │
      ▼
useSmsListener.js → parseSms() → addPendingSms()
      │
      ▼
PendingSmsCard on Dashboard
```

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 |
| Build Tool | Vite 5 |
| State Management | Zustand |
| Routing | React Router v6 |
| Charts | Recharts |
| Styling | CSS custom properties |
| Storage | localStorage via storage.js |
| Mobile | Capacitor 8.x (Android) |
| Biometrics | @capgo/capacitor-native-biometric |
| SMS Capture | Android SmsReceiver + NotificationListenerService |
| PIN Security | SHA-256 via WebCrypto API |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 8090) |
| `npm run build` | Production build to `dist/` |
| `npm run build && npx cap sync android && cd android && .\gradlew.bat assembleDebug` | Full APK build |

## Debugging SMS on Device

Connect phone via USB, open `chrome://inspect` in Chrome:

```js
// Test any SMS text through the full parse pipeline
window.testSms('Credit Alert!\nRs.1.00 credited to HDFC Bank A/c XX1245 on 07-05-26 from VPA 9848657887.wallet@phonepe (UPI 253309767740)')
window.testSms('Sent Rs.1.00\nFrom HDFC Bank A/C *1245\nTo SAYYED  NAGULU\nOn 07/05/26\nRef 679689015689')

// Simulate a transaction arriving live
window.dispatchEvent(new CustomEvent('wp_sms_test', { detail: { body: 'Sent Rs.500\nFrom HDFC Bank A/C *1245\nTo ZOMATO\nOn 07/05/26\nRef 123456789012' } }))
```

Check `[WP-SMS]` log lines to trace the full pipeline.

## Android Permissions Required

| Permission | Purpose |
|---|---|
| `RECEIVE_SMS` | Receive bank SMS in background |
| `READ_SMS` | Read SMS content |
| `INTERNET` | Capacitor WebView |
| `FOREGROUND_SERVICE` | Keep app active in background |
| `POST_NOTIFICATIONS` | Show service notification (Android 13+) |
| Notification Access (special) | Fallback — intercept bank app push notifications |
