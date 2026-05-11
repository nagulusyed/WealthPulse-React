# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
# Development (web, port 8090, auto-opens browser)
npm run dev

# Production build → dist/
npm run build

# Build + sync to Android (run after every src change before testing on device)
npm run cap:build

# Sync only (no rebuild — use when only Android native files changed)
npm run cap:sync

# Open Android Studio
npm run cap:open

# Lint
npm run lint

# Tests (Vitest — run all)
npx vitest run

# Run a single test file
npx vitest run src/services/__tests__/smsParser.test.js

# Run tests in watch mode
npx vitest
```

**Android deploy flow:** `npm run cap:build` → Android Studio → Run on device/emulator. Never skip `cap:sync` after a web build or Capacitor plugins won't see the new JS bundle.

---

## Architecture

### Stack
- **React 18** + **Vite 5** (dev port 8090, `base: './'` required for Android WebView)
- **Zustand 4** — single global store (`src/store/useStore.js`)
- **React Router v6** — client-side routing inside `AppShell`
- **Capacitor 8** — Android wrapper; all native calls go through `window.Capacitor.Plugins.*`
- **Recharts** — charts only; code-split into its own chunk
- **localStorage** — all persistence; abstracted through `src/services/storage.js` (all keys prefixed `wp_`)

### State Architecture
Everything lives in one Zustand store (`useStore.js`). The pattern throughout:

```js
// ✅ Correct — reactive, uses shallow for array selectors
const items = useStore((s) => s.items.filter(...), shallow);

// ❌ Anti-pattern — bypasses React subscription
const items = useStore.getState().someMethod();
```

Store actions always: (1) compute the new value, (2) call `storage.save*()`, (3) call `set({...})`. Never mutate state directly.

When writing Zustand selectors that return arrays or objects, always pass `shallow` as the second argument to prevent unnecessary re-renders:
```js
import { shallow } from 'zustand/shallow';
```

### SMS Auto-Capture Flow (Android)
This is the most complex feature — it spans Java and JS:

1. **`SmsReceiver.java`** — Android BroadcastReceiver intercepts `SMS_RECEIVED`. Filters by known bank senders + transaction markers. Saves raw SMS body to `SharedPreferences` queue (`wp_sms_queue / pending_messages`) AND broadcasts locally so the app can receive it immediately if running.

2. **`src/hooks/useSmsListener.js`** — Mounts in `AppShell`. Listens for the local broadcast AND drains the SharedPreferences queue on app resume. Calls `parseSms()` on each raw body.

3. **`src/services/smsParser.js`** — Pure JS parser. Call order: `splitMessages()` (split batched SMS) → `parseSms()` per message → returns `{ id, amount, payee, date, type, category, isSelfTransfer }`. The `id` is the bank's reference number if extractable, otherwise a fallback with a random suffix to prevent collision.

4. **`useStore.addPendingSms()`** — Deduplicates by `id`, stores in `pendingSmsTransactions`. Dashboard shows these as pending cards.

5. User approves/dismisses → `acceptPendingSmsAsExpense()` / `dismissPendingSms()`.

### Group Expense & Settlement Flow
- Expenses are stored in `groupExpenses[]`. When `paidBy === 'self'`, a mirrored personal transaction is auto-created with stable ID `group_exp_${expenseId}` — never create it manually.
- **Settlements** are stored as special group expense records with `isSettlement: true`, `amount: 0`, and the actual amount in `settledBy: [{ from, to, amount }]`. They have no splits and don't affect `totalSpent`.
- Balance computation (`getPersonBalanceInGroup`) reads `settledBy` entries directly — do not call `getAllSettlements()` inside a Zustand selector (it escapes the snapshot). Instead, inline the simplified-settlement algorithm using `s.groups` and `s.groupExpenses` with `shallow` (see `SettleUpView.jsx` and `useAlerts.js` for the canonical pattern).

### Auth & Security
- PIN is SHA-256 hashed (salted `wp_salt_` prefix) via `crypto.subtle`. Falls back to a 64-bit dual-accumulator hash on non-HTTPS contexts — output is 16 hex chars, no prefix.
- `isLocked: true` in the store gates the entire app. `PinLockScreen` reads `storage.hasPinSet()` to decide between `'enter'` and `'create'` mode.
- PIN reset from the lock screen requires answering the security question (`handleVerifyRecovery`). The "Forgot PIN?" flow is the only legitimate PIN bypass.

### Push Notifications / Alerts
- `src/services/alertsService.js` bridges to a custom Android plugin (`AlertsPlugin`) via `Capacitor.Plugins.AlertsPlugin`. All calls are no-ops on web.
- `src/hooks/useAlerts.js` — mounted once in `AppShell`. Watches `budgets`, `transactions`, `allSettlements`. Respects both the master `alertsEnabled` toggle AND the granular `budgetAlerts` / `settlementReminders` toggles (all in store + localStorage).

### Key Files & Their Roles

| File | Role |
|---|---|
| `src/store/useStore.js` | Single source of truth — all state, actions, derived computations |
| `src/services/storage.js` | localStorage abstraction — all `wp_*` keys defined here |
| `src/services/smsParser.js` | Pure SMS parser — no side effects, fully testable |
| `src/services/categories.js` | Category constants, `MERCHANT_CATEGORY_MAP`, `SECURITY_QUESTIONS` |
| `src/services/crypto.js` | PIN + security answer hashing |
| `src/hooks/useSmsListener.js` | Android SMS bridge — mounts in AppShell only |
| `src/hooks/useInsights.js` | Lazy insights engine — only active when Insights tab is open |
| `src/hooks/useAlerts.js` | Alert orchestration — mounts in AppShell, debounced 2s |
| `src/App.jsx` | Router, AppShell, back button handler, FAB |
| `android/app/src/main/java/com/wealthpulse/app/SmsReceiver.java` | Android SMS intercept → SharedPreferences queue |

### Routing
All routes are in `AppShell` (inside `BrowserRouter`). The lock screen renders in place of the shell when `isLocked === true` — it is not a route.

```
/                → Dashboard
/transactions    → TransactionList
/budgets         → BudgetView
/groups          → GroupsView (GroupDetail rendered inline, not a route)
/settle-up       → SettleUpView
/insights        → InsightsView (also aliased from /reports)
/notifications   → NotificationsView
/settings        → SettingsView
```

### Code Splitting
Vite splits into three manual chunks: `react-vendor`, `charts` (Recharts), `store` (Zustand). Keep heavy imports (Recharts components, `useInsights`) inside their feature modules to preserve this.

### Capacitor-Specific Patterns
- Always check `window.Capacitor?.Plugins?.App` before calling native APIs — the web build must not crash.
- `CapApp.addListener()` returns `Promise<PluginListenerHandle>`. Store the promise and clean up with `handler.then(h => h.remove())` in the `useEffect` return.
- Native plugins (`BackgroundService`, `AlertsPlugin`) are custom — they have no npm package. They exist only in the Android project and fail silently on web.
