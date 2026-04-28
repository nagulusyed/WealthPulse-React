# 💰 WealthPulse v3.0 — React + Vite Edition

A complete rewrite of WealthPulse from vanilla JavaScript to **React 18 + Vite + Zustand**, maintaining full feature parity with the original v2.x while adding modern architecture, routing, and testability.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open http://localhost:8090
```

## Build for Android (Capacitor)

```bash
# Build + sync to Android
npm run cap:build

# Open in Android Studio
npm run cap:open
```

## Architecture

```
src/
├── main.jsx                 # Entry point
├── App.jsx                  # Root component + React Router
├── store/useStore.js        # Zustand — single reactive store
├── services/
│   ├── storage.js           # localStorage abstraction
│   ├── categories.js        # Category constants
│   └── crypto.js            # PIN hashing (SHA-256)
├── components/
│   ├── ui/                  # Modal, Toast, shared UI
│   ├── layout/              # Sidebar, MobileNav, Header
│   └── charts/              # CategoryDoughnut, TrendBarChart
├── features/
│   ├── auth/                # PinLockScreen
│   ├── dashboard/           # Dashboard, SummaryCards
│   ├── transactions/        # TransactionList, TransactionForm
│   ├── budgets/             # BudgetView
│   ├── groups/              # GroupsView, GroupDetail
│   ├── reports/             # ReportsView
│   └── settings/            # SettingsView (export/import/reset)
├── hooks/                   # useToast, useMediaQuery
├── utils/                   # formatters, helpers
└── styles/                  # tokens.css, globals.css
```

## Key Changes from v2.x (Vanilla)

| Aspect | v2.x (Vanilla) | v3.0 (React) |
|---|---|---|
| Architecture | Single 96KB IIFE | Feature-based modules |
| State | `let` variables + manual refresh | Zustand reactive store |
| Routing | Manual `navigate()` + pushState | React Router v6 |
| Rendering | innerHTML DOM manipulation | React virtual DOM |
| Build | None (raw files) | Vite (minify, tree-shake, HMR) |
| Charts | Chart.js via CDN | Recharts (bundled, tree-shaked) |
| Styling | Single 53KB CSS file | Modular CSS per component |
| Capacitor | webDir: www | webDir: dist |

## Data Migration

Existing v2.x data in localStorage is automatically preserved — the React app reads from the same `wp_*` localStorage keys. No manual migration needed.

## Tech Stack

- **React 18** — Functional components + hooks
- **Vite 5** — Build tool with HMR
- **Zustand** — Lightweight state management
- **React Router v6** — Client-side routing
- **Recharts** — React-native charting
- **Lucide React** — Icons
- **Capacitor 8** — Android/iOS wrapper

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 8090) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run cap:build` | Build + sync to Android |
| `npm run cap:open` | Open in Android Studio |
