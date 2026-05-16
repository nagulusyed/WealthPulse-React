# 💰 WealthPulse v3.8 — React + Vite Edition

A complete personal finance tracker with group expense splitting, **automatic SMS transaction capture**, **Smart Insights engine**, and **Finance & Planning suite**, built with **React 18 + Vite + Zustand + Capacitor Android**.

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

## What's New in v3.8

### 🎯 Finance & Planning Suite (new)
A dedicated `/planning` page with four tabs, PIN/biometric protected on every visit:

| Tab | What it does |
|---|---|
| 🎯 Goals | Create savings goals with emoji, colour, target amount, and deadline. Add contributions manually. Progress ring shows % complete, days left, and estimated completion date based on contribution pace |
| 🏦 EMI Tracker | Add loans with principal, rate, tenure, start date. Auto-calculates EMI using the standard annuity formula (shown live as you type). Expandable cards show amortization breakdown — principal paid, interest paid, outstanding balance, payoff date. Supports lump-sum prepayments |
| 💎 Net Worth | Log assets (bank, FD, MF, stocks, PPF, gold, property, crypto) and liabilities (loans, credit card dues). Net Worth = assets − liabilities. Mini bar chart shows last 6 months of net worth history. Snapshot saved automatically on each update |
| 📈 Cash Flow | 30-day balance projection combining current month's average daily burn + upcoming recurring transactions. SVG line chart with gradient fill. Warns if balance goes negative with estimated date |

**Security:** Every visit to Finance & Planning requires PIN or biometric re-verification via a portal-based lock screen (renders on `document.body` to avoid stacking context issues on Android WebView).

**EMI accuracy:** Due dates are calculated using the actual start day-of-month (e.g. Dec 13 → Jan 13 → Feb 13). Outstanding balance reads directly from the amortization table rather than manual subtraction, matching bank-reported figures.

---

### 🔄 Swipe Navigation (new)
Both **Finance & Planning** and **Reports & Insights** now support horizontal swipe to switch tabs:
- Touch listeners attached natively with `{ passive: false }` via a callback ref, bypassing React's passive synthetic event limitation on Android WebView
- Direction locked on first 8px of movement — horizontal swipe switches tab, vertical swipe scrolls normally
- Smooth slide-in animation (40px translate + fade, 280ms ease-out) when changing tabs by swipe or tap

---

### 🔔 SMS Notification — Settlement Detection (new)
When a credit SMS arrives in Notifications (money received from someone):
- **Add as Income** — existing behaviour, counts toward monthly income total
- **⇄ Mark as Settlement** — new button, records with `isSettlement: true`, appears as `⇄` in TransactionList with SETTLEMENT badge, excluded from income totals on Dashboard

Previously all credit SMS could only be added as income, inflating the monthly income figure when friends paid back shared expenses.

---

### 🐛 Bug Fixes & Existing Feature Improvements

**Dashboard / Month Navigation**
- Fixed stale data bug: `getMonthlyTransactions()` called inside Zustand selector was not reactive to `selectedMonth` changes — now computed via `useMemo([allTransactions, selectedMonth])` in all views
- `nextMonth` guard condition fixed — was blocking forward navigation in some year/month edge cases
- `prevMonthData` date mutation fixed (`new Date(selectedMonth)` + `setMonth()` creates a new object but mutates the original) — now uses `new Date(yr, mo-1, 1)` throughout
- Dashboard now shows correct data when navigating months

**BudgetView**
- Same stale selector fix applied
- Budget limit can now be cleared (type 0 or empty) — previously required a number
- Fixed `border: 'var(--border-card)'` CSS shorthand bug — now `border: '1px solid var(--border-card)'`
- Added **days remaining** + **safe daily spend** context on each budget card for the current month
- Added **monthly income total** to recurring transactions summary card

**TransactionList**
- Added **Settlements** filter tab — shows only settlement transactions
- Income and Expense tabs now exclude settlements
- Settlement transactions display `⇄` prefix and SETTLEMENT badge instead of green `+` — no longer confused with real income
- Running totals bar shows `+income`, `−expense`, and Net for current filter, labelled "all time" to distinguish from monthly Dashboard figures

**Groups & Balances**
- `getBalance()` and `getPersonBalance()` in GroupsView were calling `useStore.getState()` non-reactively during render — replaced with `useMemo`-computed maps that re-run when `groupExpenses` changes

**Dropdowns**
- All remaining native `<select>` elements replaced with custom `SelectPicker` bottom sheet: QuickSplitModal (category + group picker), SettingsView (theme + security question)

**ReportsView**
- Same stale selector + date mutation fix applied — Reports tab now updates correctly when navigating months

**InsightsView**
- `MonthlyTab` now receives `transactions` reactively from `useInsights` hook instead of calling its own stale selector
- Month navigation on Insights correctly updates all tab data

**RecurringView**
- Added monthly **income total** to summary card (shown only when > 0)
- Overdue items now have an **"Apply now"** button to manually trigger without restarting the app

---

## Features

### 🔐 Authentication & Security
- 4-digit PIN lock screen with animated dot indicators and keypad
- Two-step PIN creation with mismatch reset
- Security question recovery
- Change PIN from Settings with current PIN verification
- Biometric Login (Fingerprint/Face ID) with auto-trigger on app open
- **Finance & Planning page** — additional PIN/biometric gate on every visit
- Privacy mode — blur all amounts app-wide

### 💵 Personal Finance Tracking
- Add income & expenses with description, amount, category, date, notes
- 9 expense categories + 5 income categories
- Edit & delete with confirmation; swipe-left to delete in transaction list
- Search by description or category; filter by All / Income / Expenses / **Settlements**
- Running totals bar on filtered view
- Settlement transactions shown with `⇄` badge, excluded from income totals

### 📲 SMS Auto-Capture
- Automatic transaction detection from bank SMS (HDFC, SBI, ICICI, Axis, Kotak, PhonePe, GPay, Paytm)
- Pending SMS cards — review before adding
- One-tap accept with `SelectPicker` category picker
- **Credit SMS**: choose "Add as Income" or "⇄ Mark as Settlement"
- Quick Split — split a detected expense across group members instantly
- Payee memory — remembers category per payee
- Background capture — queued while app is closed

### 📊 Dashboard
- Monthly summary cards (Balance, Income, Expenses, Savings Rate, YTD)
- Month navigation — correctly updates all data reactively
- Cash Flow Overview — 6-month bar chart
- Spending by Category — doughnut chart (excludes settlements)
- Quick Actions, My Groups, Pending Settlements, Budget Status widgets
- Savings Rate colour indicator based on user-set target %

### 💰 Budget Management
- Per-category monthly budgets with progress bars (green/yellow/red)
- Days remaining + safe daily spend shown on current month cards
- Budget limit can be set to 0 to clear
- "Show more categories" toggle with correct border rendering
- vs-last-month % change per category

### 👥 Group Expense Splitting
- Create / edit groups with members and avatar colours
- Equal / By Amount / By Percentage split methods
- Auto-sync paid expenses to personal transactions
- Simplified settlement algorithm (minimises transactions)
- Group balances update reactively when expenses change

### 💸 Settlements
- Global Settle Up — all debts and receivables across all groups
- Partial Payments — full or partial settlement
- Personal Sync — optionally record as personal expense/income
- Third-party support — record between other members
- Undo settlement with linked transaction cleanup
- WhatsApp deep link with pre-filled payment message

### 🧠 Reports & Insights
Five tabs, swipe-navigable:
- **Monthly** — Spent, income, savings rate, avg daily, category breakdown, MoM comparison
- **Vendors** — Top merchants by total spend, normalized from raw SMS descriptions
- **Forecast** — Burn rate, projected overage, safe daily limit, budget exhaustion date
- **Alerts** — Category anomaly detection vs 3-month rolling average (spike / drop / missing)
- **Subscriptions** — Recurring transaction detection, monthly + yearly cost

All reactive to month navigation — switching month on Insights updates all tabs.

### 🎯 Finance & Planning *(new in v3.8)*
PIN/biometric protected, swipe-navigable:
- **Goals** — Savings goals with progress ring, deadline, projected completion date, contribution tracking
- **EMI Tracker** — Loan amortization with accurate due dates, outstanding balance, prepayment support
- **Net Worth** — Assets vs liabilities with 6-month history chart
- **Cash Flow** — 30-day projection with recurring transaction overlay and negative-balance warning

### ⚙️ Settings
- Change PIN, Update Security Question (SelectPicker, not native dropdown)
- Privacy Mode, Theme (Dark / Light / Auto — SelectPicker)
- Savings Target slider with reset
- Export / Import JSON backup (includes Goals, EMIs, Net Worth)
- Reset all data
- SMS Auto-capture toggle, Background Tracking toggle
- Biometric Login toggle (shown only if hardware available)

---

## Architecture

```
src/
├── main.jsx
├── App.jsx                         # Root + React Router + FAB + Capacitor back button
├── store/useStore.js               # Zustand — all state + actions
├── services/
│   ├── storage.js                  # localStorage abstraction (includes Goals, EMIs, NetWorth keys)
│   ├── categories.js               # Category constants + helpers
│   ├── smsParser.js                # SMS parsing: amount, type, payee, date, dedup ID
│   └── crypto.js                   # SHA-256 PIN hashing
├── hooks/
│   ├── useInsights.js              # Smart Insights engine (vendor, burn rate, anomaly, subscriptions)
│   ├── useSwipeTabs.js             # Horizontal swipe hook — callback ref + non-passive touchmove
│   ├── useSmsListener.js           # Listens for wp_sms_test / wpReceiveSms events
│   ├── useToast.js
│   ├── useMediaQuery.js
│   └── useYTDSavings.js
├── features/
│   ├── planning/
│   │   └── FinancePlanningView.jsx # Goals + EMI + Net Worth + Cash Flow — PIN protected
│   ├── insights/
│   │   └── InsightsView.jsx        # Reports & Insights — 5-tab merged view, swipeable
│   ├── sms/
│   │   ├── PendingSmsCard.jsx      # Income / Settlement choice for credit SMS
│   │   └── QuickSplitModal.jsx
│   ├── auth/PinLockScreen.jsx
│   ├── dashboard/Dashboard.jsx
│   ├── transactions/
│   │   ├── TransactionList.jsx     # Settlement tab + running totals bar
│   │   └── RecurringView.jsx       # Income total + Apply now for overdue
│   ├── budgets/BudgetView.jsx      # Days remaining + safe daily on cards
│   ├── groups/
│   └── settings/SettingsView.jsx
├── components/
│   ├── ui/ (Modal, Toast, SelectPicker)
│   ├── layout/ (Sidebar, MobileNav, Header)
│   └── charts/ (CategoryDoughnut, TrendBarChart)
└── utils/ (formatters.js, helpers.js)

android/app/src/main/java/com/wealthpulse/app/
├── MainActivity.java
├── SmsReceiver.java
├── NotificationListener.java
├── ForegroundService.java
├── ContactsPlugin.java
└── BackgroundServicePlugin.java
```

---

## Finance & Planning — EMI Calculation

```
calcEmi(principal, annualRate, tenureMonths)
  r = annualRate / 12 / 100
  EMI = P × r × (1+r)^n / ((1+r)^n − 1)

getAmort(principal, rate, tenure, startDate, prepayments)
  for each month i:
    dueDate = new Date(startYear, startMonth + i, startDay)  ← same day-of-month
    interest = balance × r
    principalPay = EMI − interest
    balance -= principalPay
    apply prepayments due on or before dueDate
    record { dueStr, interest, principal, balance }

elapsed = rows where dueStr < todayStr   ← strictly past due only
outstanding = amort[elapsed - 1].balance ← direct from table, no manual subtraction
```

---

## Swipe Navigation — How It Works

```
useSwipeTabs(tabIds, activeTab, setTab)
  │
  ├── callback ref (not useRef) — attaches listeners the moment
  │   the element appears in DOM, even if rendered conditionally
  │
  ├── touchstart   { passive: true  } — record startX, startY
  ├── touchmove    { passive: false } — preventDefault when dx > dy && dx > 8px
  │                                     stops page scroll during horizontal swipe
  └── touchend     { passive: true  } — if |dx| ≥ 60px && |dx| > |dy| × 1.2:
                                         dx < 0 → next tab
                                         dx > 0 → prev tab

  latest = useRef({ tabIds, activeTab, setTab })
  updated every render — no stale closure in imperative listeners
```

---

## Smart Insights — How It Works

All computation in `src/hooks/useInsights.js`. No server. Reactive to `selectedMonth`.

```
useInsights()
  │
  ├── normalizeVendor(description)
  │     strips: pvt, ltd, india, upi, imps, neft, pos, etc.
  │
  ├── computeVendorInsights(allTransactions, totalIncome)
  │     groups by normalizedVendor → top 5 by total spend
  │
  ├── computeBurnRate(monthTransactions, selectedMonth, budgets)
  │     only fires for current month, dayOfMonth ≥ 3
  │     safeDaily = budgetLeft / daysLeft
  │
  ├── computeAnomalies(currentTxns, allTransactions, selectedMonth)
  │     spike: currentAmount > avg × 1.30
  │     drop:  currentAmount < avg × 0.60
  │     missing: had history, zero this month
  │
  └── computeSubscriptions(allTransactions)
        amount within ±10% of median, ≥2 months, avgGap ≤ 45 days
```

---

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
  ├── onResume() → drainQueue() → dispatchToWebView()
  └── liveReceiver → dispatchToWebView()
      │
      ▼
window.wpReceiveSms(body) / CustomEvent('wp_sms_test')
      │
      ▼
useSmsListener.js → parseSms() → addPendingSms()
      │
      ▼
PendingSmsCard in Notifications
  ├── Debit → "Add to Expenses" + "⚡ Split"
  └── Credit → "✓ Add as Income" + "⇄ Mark as Settlement"
```

---

## Debugging SMS on Device

```js
// Chrome DevTools → chrome://inspect
window.testSms('Credit Alert!\nRs.1.00 credited to HDFC Bank A/c XX1245...')
window.testSms('Sent Rs.1.00\nFrom HDFC Bank A/C *1245\nTo SAYYED  NAGULU\nOn 07/05/26\nRef 679689015689')
```

---

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

## Android Permissions Required

| Permission | Purpose |
|---|---|
| `RECEIVE_SMS` | Receive bank SMS in background |
| `READ_SMS` | Read SMS content |
| `INTERNET` | Capacitor WebView |
| `FOREGROUND_SERVICE` | Keep app active in background |
| `POST_NOTIFICATIONS` | Show service notification (Android 13+) |
| `READ_CONTACTS` | Search and link phone contacts for UPI payments |
| Notification Access (special) | Fallback — intercept bank app push notifications |
