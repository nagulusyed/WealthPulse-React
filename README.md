# 💰 WealthPulse v3.3 — React + Vite Edition

A complete personal finance tracker with group expense splitting and **automatic SMS transaction capture**, built with **React 18 + Vite + Zustand + Capacitor Android**.

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

## What's New in v3.1

### 📲 SMS Auto-Capture (fully reworked)
- **Works when app is closed** — `SmsReceiver` saves incoming bank SMS to a `SharedPreferences` queue; messages are delivered the next time you open the app
- **Dual capture paths** — direct SMS via `SmsReceiver` (requires SMS permission) + notification interception via `NotificationListener` (fallback if SMS permission denied)
- **Proper Android permissions** — `RECEIVE_SMS` and `READ_SMS` declared in manifest so the permission toggle appears in Android Settings; app requests SMS permission on first launch
- **Smart sender filtering** — passes SMS from known bank sender IDs (`JX-HDFCBK-S`, `hdfcbk`, `sbiinb`, `icicib`, etc.) OR messages whose body starts with a transaction marker (`Credit Alert!`, `Sent Rs`, `Debited`, etc.)
- **Rewritten SMS parser** — type detection checks the first line first (`Credit Alert!` → credit, `Sent Rs` → debit) before scanning full text; eliminates false positives from mixed-content messages
- **`To` line payee extraction** — grabs the entire `To SAYYED  NAGULU` line (handles double spaces, any name length)
- **Ref/UPI number deduplication** — uses `Ref 679689015689` or `UPI 253309767740` as stable transaction ID to prevent duplicates
- **Credit category fix** — category list validated against correct income/expense list; `other_inc` never shown in expense picker
- **`window.testSms()`** — debug helper exposed globally; paste any SMS text in Chrome DevTools (`chrome://inspect`) to see parse result instantly

### ⚡ Background Tracking (New)
- **Foreground Service** — Keeps the app process alive even when cleared from "Recent Apps," ensuring 100% reliability for SMS and notification capture.
- **User Toggle** — Toggle "Background Tracking" in Settings to enable/disable the persistent notification and service.
- **Auto-Restore** — Remembers your tracking preference across app restarts and phone reboots.

### ☝️ Biometric Authentication (v3.3)
- **Native Security** — Login using Fingerprint or Face ID via the native Android BiometricPrompt API.
- **Auto-Prompt** — App automatically requests biometrics on launch if enabled.
- **Keypad Shortcut** — New fingerprint icon on the PIN screen keypad for manual trigger.
- **Hardware Detection** — Toggle only appears in Settings if your device actually supports biometric hardware.

### ✨ UI Refinement Phase (v3.3.0)
- **Staggered Animations** — Summary cards and charts now have a smooth, staggered "bounce" entrance.
- **Glassmorphism** — Modern frosted-glass effect on the month navigation bar.
- **Improved Empty States** — Replaced plain text with custom `EmptyState` components featuring unique icons and helpful copy.
- **UX Polish** — Hover lift effects on cards, refined layout spacing, and updated versioning in Settings.

---

## Features

### 🔐 Authentication & Security
- **4-digit PIN lock screen** with animated dot indicators and keypad
- **Two-step PIN creation flow** — create PIN → confirm PIN, with strict mismatch reset
- **Security question recovery** — set up during PIN creation to recover forgotten PIN
- **Change PIN** from Settings with current PIN verification
- **Biometric Login** (Fingerprint/Face ID) with auto-trigger and manual keypad access
- **Privacy mode** — blur all amounts across the entire app

### 💵 Personal Finance Tracking
- **Add income & expenses** with description, amount, category, date, notes
- **9 expense categories**: Food & Dining, Transport, Shopping, Bills & Utilities, Health, Entertainment, Education, Rent & Housing, Other
- **5 income categories**: Salary, Freelance, Investment, Gift, Other
- **Edit & delete transactions** with confirmation dialogs
- **Search** by description or category name; **filter** by All / Income / Expenses

### 📲 SMS Auto-Capture
- **Automatic transaction detection** from bank SMS (HDFC, SBI, ICICI, Axis, Kotak, PhonePe, GPay, Paytm)
- **Pending SMS cards** on dashboard — review detected transactions before adding
- **One-tap accept** — adds to income or expenses with correct category
- **Category picker** — change category inline before accepting
- **Quick Split** — split a detected expense across group members instantly
- **Payee memory** — remembers category for each payee; auto-applies on next detection
- **Background capture** — SMS received while app is closed is queued and shown on next open

### 📊 Dashboard
- Monthly summary cards (Balance, Income, Expenses, Savings Rate)
- Yearly Savings (YTD) — current-year aggregated savings
- Month navigation — browse previous/next months
- Cash Flow Overview — 6-month bar chart (Income vs Expenses)
- Spending by Category — doughnut chart with percentages
- Quick Actions — Add Expense, Add Income, Settle Up, Split Bill
- Insight card, My Groups widget, Pending Settlements widget, Budget Status widget

### 💰 Budget Management
- Per-category monthly budgets with visual progress bars (green/yellow/red)
- Month-by-month tracking with net expense calculation

### 👥 Group Expense Splitting
- Create groups with members; add people with avatar colors
- Add group expenses with Equal / By Amount / By Percentage split methods
- Auto-sync paid expenses to personal transactions
- Edit & delete with personal transaction sync
- Simplified settlement algorithm (minimizes transactions)

### 💸 Settlements
- Global Settle Up page — all debts and receivables across all groups
- Record Payment with payment method and optional personal finance sync
- Category-consistent settlements — traces back to original expense category
- Third-party settlement recording

### 📈 Reports
- Monthly spending report — Total Spent, Income, Net Savings, Average daily spend
- Category breakdown with percentages and progress bars
- Insight text comparing top category vs previous month

### ⚙️ Settings
- Change PIN, Update Security Question
- Privacy Mode, Theme (Dark / Light / Auto)
- Export / Import JSON backup, Reset all data
- Budget Alerts, Settlement Reminders toggles
- Background Tracking toggle (⚡) — keeps app alive with foreground service

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
│   ├── useSmsListener.js          # Listens for wp_sms_test / wpReceiveSms events
│   ├── useToast.js
│   ├── useMediaQuery.js
│   └── useYTDSavings.js
├── features/
│   ├── sms/
│   │   ├── PendingSmsCard.jsx     # Review + accept/dismiss detected transactions
│   │   └── QuickSplitModal.jsx    # Split detected expense across group members
│   ├── auth/PinLockScreen.jsx
│   ├── dashboard/Dashboard.jsx
│   ├── transactions/
│   ├── budgets/
│   ├── groups/
│   ├── reports/
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
| Build Tool | Vite 5 (code splitting: react-vendor, charts, store) |
| State Management | Zustand |
| Routing | React Router v6 |
| Charts | Recharts |
| Styling | CSS custom properties + CSS Modules |
| Storage | localStorage (abstracted via storage.js) |
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

Connect phone via USB, open `chrome://inspect` in Chrome, then in the DevTools console:

```js
// Test any SMS text through the full parse pipeline
window.testSms('Credit Alert!\nRs.1.00 credited to HDFC Bank A/c XX1245 on 07-05-26 from VPA 9848657887.wallet@phonepe (UPI 253309767740)')
window.testSms('Sent Rs.1.00\nFrom HDFC Bank A/C *1245\nTo SAYYED  NAGULU\nOn 07/05/26\nRef 679689015689')

// Simulate a transaction arriving live
window.dispatchEvent(new CustomEvent('wp_sms_test', { detail: { body: 'Sent Rs.500\nFrom HDFC Bank A/C *1245\nTo ZOMATO\nOn 07/05/26\nRef 123456789012' } }))
```

Check `[WP-SMS]` log lines to trace the full pipeline from raw text to parsed result.

## Android Permissions Required

| Permission | Purpose |
|---|---|
| `RECEIVE_SMS` | Receive bank SMS in background |
| `READ_SMS` | Read SMS content |
| `INTERNET` | Capacitor WebView |
| `FOREGROUND_SERVICE` | Required to keep the app active in background |
| `POST_NOTIFICATIONS` | Required to show the service notification (Android 13+) |
| Notification Access (special) | Fallback — intercept bank app push notifications |

On first launch the app requests SMS permission. If denied, it redirects to Notification Access settings as fallback. Both paths ultimately deliver transactions to the same JS pipeline.
