import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import useStore from './store/useStore';
import { useIsMobile } from './hooks/useMediaQuery';
import { useToast } from './hooks/useToast';

import { PinLockScreen } from './features/auth/PinLockScreen';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { Header } from './components/layout/Header';
import { Toast } from './components/ui/Toast';

import { Dashboard } from './features/dashboard/Dashboard';
import { TransactionList } from './features/transactions/TransactionList';
import { TransactionForm } from './features/transactions/TransactionForm';
import { BudgetView } from './features/budgets/BudgetView';
import { GroupsView } from './features/groups/GroupsView';
import { SettleUpView } from './features/groups/SettleUpView';
import { GroupExpenseForm } from './features/groups/GroupExpenseForm';
import { ReportsView } from './features/reports/ReportsView';
import { SettingsView } from './features/settings/SettingsView';

function AppShell() {
  const isLocked = useStore((s) => s.isLocked);
  const isMobile = useIsMobile();
  const { toast, showToast } = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [txnFormType, setTxnFormType] = useState('expense');
  const [txnFormData, setTxnFormData] = useState(null);
  const [showGroupExpenseForm, setShowGroupExpenseForm] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (fabOpen && !e.target.closest('.fab-center') && !e.target.closest('.fab-menu')) {
        setFabOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [fabOpen]);

  useEffect(() => {
    if (window.Capacitor?.Plugins?.App) {
      const CapApp = window.Capacitor.Plugins.App;
      CapApp.addListener('backButton', () => {
        if (isLocked) return;
        if (showTxnForm) { setShowTxnForm(false); return; }
        if (showGroupExpenseForm) { setShowGroupExpenseForm(false); return; }
        if (fabOpen) { setFabOpen(false); return; }
        if (sidebarOpen) { setSidebarOpen(false); return; }
        if (window.location.pathname !== '/') { navigate('/'); return; }
        CapApp.exitApp();
      });
    }
  }, [isLocked, fabOpen, sidebarOpen, showTxnForm, showGroupExpenseForm, navigate]);

  const openTxnForm = useCallback((type = 'expense', txn = null) => {
    setTxnFormType(type);
    setTxnFormData(txn);
    setShowTxnForm(true);
  }, []);

  if (isLocked) return <PinLockScreen />;

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
        <Routes>
          <Route path="/" element={<Dashboard onAddTransaction={openTxnForm} />} />
          <Route path="/transactions" element={<TransactionList />} />
          <Route path="/budgets" element={<BudgetView />} />
          <Route path="/groups" element={<GroupsView />} />
          <Route path="/settle-up" element={<SettleUpView />} />
          <Route path="/reports" element={<ReportsView />} />
          <Route path="/settings" element={<SettingsView showToast={showToast} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {isMobile && (
        <>
          <MobileNav onFabClick={() => setFabOpen((o) => !o)} />
          <div className={`fab-menu ${fabOpen ? 'active' : ''}`}>
            <button className="fab-menu-item" onClick={() => { setFabOpen(false); openTxnForm('expense'); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Personal Transaction
            </button>
            <button className="fab-menu-item" onClick={() => { setFabOpen(false); setShowGroupExpenseForm(true); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Group Expense
            </button>
          </div>
        </>
      )}

      {showTxnForm && (
        <TransactionForm
          transaction={txnFormData}
          defaultType={txnFormType}
          onClose={() => { setShowTxnForm(false); setTxnFormData(null); }}
        />
      )}

      {showGroupExpenseForm && (
        <GroupExpenseForm groupId={null} expense={null} onClose={() => setShowGroupExpenseForm(false)} />
      )}

      <Toast toast={toast} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
