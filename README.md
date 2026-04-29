# 💰 WealthPulse v3.0 — React + Vite Edition

A complete personal finance tracker with group expense splitting, built with **React 18 + Vite + Zustand**. Originally a vanilla JavaScript app, fully migrated to a modern React architecture with Capacitor for Android deployment.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (http://localhost:8090)
npm run dev

# Build for production
npm run build
```

## Build Android APK

```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Features

### 🔐 Authentication & Security
- **4-digit PIN lock screen** with animated dot indicators and keypad
- **Two-step PIN creation flow** — create PIN → confirm PIN, with strict mismatch reset (clears both values, restarts from step 1)
- **Security question recovery** — set up a security question during PIN creation to recover access if PIN is forgotten
- **Change PIN** from Settings with current PIN verification
- **Privacy mode** — toggle to blur all amounts across the entire app (dashboard, transactions, groups, reports)

### 💵 Personal Finance Tracking
- **Add income & expenses** with description, amount, category, date, and optional notes
- **9 expense categories**: Food & Dining, Transport, Shopping, Bills & Utilities, Health, Entertainment, Education, Rent & Housing, Other
- **5 income categories**: Salary, Freelance, Investment, Gift, Other
- **Edit & delete transactions** with confirmation dialogs
- **Search transactions** by description or category name
- **Filter by type** — All, Income, or Expenses tabs
- **Transaction history** sorted by date (newest first)

### 📊 Dashboard
- **Monthly summary cards** — Total Balance (with vs-last-month trend), Total Income (source count), Total Expenses (category count), Savings Rate (with 30% target)
- **Yearly Savings (YTD)** — aggregated current-year savings rate and amount, updates in real-time after any transaction or settlement
- **Month navigation** — arrow buttons to browse previous/next months
- **Cash Flow Overview** — 6-month bar chart comparing Income vs Expenses (Recharts)
- **Spending by Category** — doughnut chart with category breakdown and percentages
- **Quick Actions** — 4-button grid: Add Expense, Add Income, Settle Up, Split Bill
- **Insight card** — dynamic text comparing top spending category vs last month
- **My Groups widget** — net group balance + top 3 groups with individual balances
- **Pending Settlements widget** — only shows YOUR settlements (you owe / owed to you), displays "All settlements cleared!" with checkmark when none pending
- **Budget Status widget** — top 4 budgets sorted by usage percentage with color-coded progress bars (green/yellow/red)
- **Greeting** — time-of-day greeting (Good morning/afternoon/evening)

### 💰 Budget Management
- **Per-category monthly budgets** with default limits for all 9 expense categories
- **Visual progress bars** — green (safe), yellow (70-89% used), red (90%+ used)
- **Edit limits** inline per category
- **Month-by-month tracking** — budgets recalculate for each selected month
- **Net expense calculation** — budget tracking uses net values (gross expenses minus settlement adjustments)

### 👥 Group Expense Splitting
- **Create groups** with selected members
- **Add people** — manage friends you split expenses with, each with auto-generated avatar colors and initials
- **People chips on Groups page** — clickable with global balance, edit name, delete
- **Add group expenses** with:
  - Description, amount, date
  - Paid-by selector (any group member)
  - **Category selection** — same 9 categories as personal finance, synced to personal transactions
  - **Split methods**: Equal, By Amount, By Percentage
  - Per-member split rows with live validation (remaining/over indicators)
- **Auto-sync to personal transactions** — when you pay a group expense, it automatically appears in your personal transactions under the correct category
- **Edit & delete group expenses** with personal transaction sync (updates/removes the linked personal transaction)
- **Group detail view** — Total Spent, Your Share, Your Balance stats
- **Expenses tab** — full expense history with "you lent/borrowed" indicators
- **Settlement history** — settlement records shown in the expenses list with 💸 icon
- **Balances tab** — per-member balances + suggested simplified settlements

### 💸 Settlements
- **Simplified settlement algorithm** — minimizes number of transactions needed to settle all debts
- **Settle Up page** — global view of all your debts and receivables across all groups
  - Global Balance card (you owe / owed to you totals)
  - Two-column layout: "You Owe" and "Owed to You"
- **Record Payment modal** with:
  - Payment method selector (Cash, UPI, Bank Transfer)
  - "Update in personal finance" toggle — opt-in sync to personal transactions
  - Settlement recorded as expense (you pay) or income (you receive) under the **original expense category** (not "Others")
- **Third-party settlements** — record payments between other group members (e.g., "Yesh pays Sita")
  - Shows "Record" button (vs "Settle" for your own)
  - Info banner explaining it only affects group balances
  - Does NOT touch your personal transactions, expenses, or income
- **Category-consistent settlements** — traces back through group expenses to find the exact category that created the debt, ensuring `Expense → Category → Settlement → Same Category` mapping

### 📈 Reports
- **Monthly spending report** with:
  - Total Spent (with % change vs last month)
  - Total Income
  - Net Savings with savings rate percentage
  - Average daily spend
- **Category breakdown** — all expense categories with amount, percentage, and visual progress bars sorted by spend
- **Insight text** — identifies top spending category with comparison to previous month
- **Real-time updates** — reports refresh immediately after any expense, settlement, or category change

### ⚙️ Settings
- **Account & Security** — Change PIN (current → new → confirm flow), Update Security Question
- **Appearance** — Privacy Mode toggle, Theme selector (Dark / Light / Auto)
- **Backup & Data** — Export data as JSON, Import from backup, Reset all data (with confirmation)
- **Notifications** — Budget Alerts toggle, Settlement Reminders toggle
- **About** — Version (v3.0.0 React), Storage used, Total transaction count

### 🎨 Theming
- **Dark theme** (default) — deep black backgrounds (#050505) with indigo/violet accents
- **Light theme** — clean white/gray backgrounds with the same accent colors
- **Auto theme** — follows system preference (prefers-color-scheme)
- **Persistent** — theme choice saved to localStorage, survives app restarts
- **CSS custom properties** — all colors, borders, shadows defined as tokens for instant theme switching
- **Android status bar** — `<meta name="theme-color">` updates dynamically with theme

### 📱 Mobile Experience
- **Responsive layout** — sidebar on desktop, bottom tab navigation + hamburger menu on mobile
- **Floating Action Button (FAB)** — center of bottom nav, opens menu for "Personal Transaction" or "Group Expense"
- **Safe area handling** — header and sidebar respect Android status bar height
- **Touch-optimized** — larger tap targets, proper spacing on mobile
- **Capacitor Android wrapper** — builds to native APK with StatusBar and SplashScreen plugins
- **Back button handling** — Capacitor back button closes modals → sidebar → navigates back → exits app

### 🔄 Data Management
- **localStorage persistence** — all data survives app restarts
- **Data migration** — automatically reads existing data from vanilla app (same `wp_*` localStorage keys)
- **Export/Import** — full JSON backup with version tracking
- **Reset** — clear all data with confirmation dialog
- **Group expense ↔ Personal transaction sync** — bidirectional: create/update/delete group expenses automatically sync linked personal transactions

---

## Architecture

```
src/
├── main.jsx                      # Entry point
├── App.jsx                       # Root component + React Router + FAB + Capacitor back button
│
├── store/useStore.js             # Zustand — single reactive store with all state + actions
│                                 #   Auth, Privacy, Theme, Month Navigation
│                                 #   Transactions CRUD + monthly filtering
│                                 #   Budgets management
│                                 #   People CRUD
│                                 #   Groups CRUD
│                                 #   Group Expenses CRUD (with personal transaction auto-sync)
│                                 #   Balance calculations + simplified settlement algorithm
│                                 #   Export/Import/Reset
│
├── services/
│   ├── storage.js                # localStorage abstraction (swap for IndexedDB/Supabase later)
│   ├── categories.js             # Category constants, defaults, helpers
│   └── crypto.js                 # SHA-256 PIN hashing with WebCrypto fallback
│
├── components/
│   ├── ui/
│   │   ├── Modal.jsx             # Portal-based modal with spacer centering + body scroll lock
│   │   ├── Modal.css             # Responsive modal styles (full-width on mobile)
│   │   └── Toast.jsx             # Toast notification component
│   ├── layout/
│   │   ├── Sidebar.jsx/css       # Desktop sidebar with nav sections + privacy toggle
│   │   ├── MobileNav.jsx/css     # Bottom tab bar with FAB
│   │   └── Header.jsx/css        # Mobile sticky header with safe-area padding
│   └── charts/
│       ├── CategoryDoughnut.jsx  # Recharts PieChart with legend
│       └── TrendBarChart.jsx     # Recharts BarChart (6-month Income vs Expenses)
│
├── features/
│   ├── auth/
│   │   ├── PinLockScreen.jsx     # PIN create/confirm/enter/recovery with useRef flow
│   │   └── PinLockScreen.css     # Lock screen with animated orbs and glassmorphism
│   ├── dashboard/
│   │   ├── Dashboard.jsx         # Full dashboard with all widgets + YTD savings
│   │   └── Dashboard.css         # Responsive grid layouts (4-col → 2-col → 1-col)
│   ├── transactions/
│   │   ├── TransactionList.jsx   # Search + filter + full transaction list
│   │   ├── TransactionList.css
│   │   └── TransactionForm.jsx   # Add/Edit modal with type toggle + categories
│   ├── budgets/
│   │   ├── BudgetView.jsx        # Per-category budget cards with progress bars
│   │   └── BudgetView.css
│   ├── groups/
│   │   ├── GroupsView.jsx/css    # Groups list + people chips + add group/person modals
│   │   ├── GroupDetail.jsx       # Group detail with expenses/balances tabs + settlements
│   │   ├── GroupExpenseForm.jsx   # Add/edit group expense with split calculator
│   │   ├── SettleModal.jsx       # Settlement recording with category tracing + third-party support
│   │   └── SettleUpView.jsx/css  # Global settle up page
│   ├── reports/
│   │   └── ReportsView.jsx       # Monthly report with category breakdown
│   └── settings/
│       ├── SettingsView.jsx      # Full settings with security, theme, data, notifications
│       └── SettingsView.css      # Toggle switches, settings cards
│
├── hooks/
│   ├── useToast.js               # Toast notification hook
│   ├── useMediaQuery.js          # Responsive breakpoint hook + useIsMobile
│   └── useYTDSavings.js          # Year-to-date savings calculation hook
│
├── utils/
│   ├── formatters.js             # formatCurrency, formatDate, formatMonthLabel, getMonthKey
│   └── helpers.js                # generateId, getInitials, getGreeting
│
└── styles/
    ├── tokens.css                # CSS custom properties (dark + light theme tokens)
    └── globals.css               # Reset, layout, animations, common components
```

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 (functional components + hooks) |
| Build Tool | Vite 5 |
| State Management | Zustand (single store, no middleware) |
| Routing | React Router v6 |
| Charts | Recharts (PieChart, BarChart) |
| Icons | Inline SVGs |
| Styling | CSS Modules + CSS custom properties |
| Data Storage | localStorage (abstracted for future IndexedDB/Supabase) |
| Mobile | Capacitor 8.x (Android) |
| PIN Security | SHA-256 via WebCrypto API |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 8090) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run cap:build` | Build + sync to Android |
| `npm run cap:open` | Open in Android Studio |

---

## Key Design Decisions

**Portal-based modals** — All modals render via `createPortal(children, document.body)` to avoid `position: fixed` being broken by parent `transform`/`animation` properties. Spacer divs center the modal when it fits; overlay scrolls when it doesn't.

**Single Zustand store** — No slices, no middleware. All state and actions in one file. Reactive subscriptions via selectors (`useStore(s => s.transactions)`) ensure components only re-render when their specific data changes.

**Category-consistent settlements** — When settling a group debt, the system traces back through group expenses to find which expense created the debt, then uses that expense's category for the personal transaction. This maintains the mapping: `Group Expense → Category → Settlement → Same Category`.

**Net expense calculations** — Dashboard and reports subtract settlement income from gross expenses to show accurate net values. Budget tracking uses net values so settling a debt correctly reduces the category's budget usage.

**Data migration compatibility** — The React app reads from the same `wp_*` localStorage keys as the original vanilla app. No manual migration needed — existing data is preserved automatically.
