import { useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useMediaQuery';
import useStore from '../../store/useStore';
import './Sidebar.css';

const NAV_MAIN = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  { path: '/transactions', label: 'Transactions', icon: 'transactions' },
  { path: '/budgets', label: 'Budgets', icon: 'budgets' },
];

const NAV_SPLITS = [
  { path: '/groups', label: 'Groups', icon: 'groups' },
  { path: '/settle-up', label: 'Settle Up', icon: 'settle' },
];

const NAV_BOTTOM_NAV = [
  { path: '/reports', label: 'Reports', icon: 'reports' },
  { path: '/notifications', label: 'Notifications', icon: 'notifications' },
];

const ICONS = {
  dashboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  transactions: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h14M3 10h14M3 13h10"/></svg>,
  budgets: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  groups: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  settle: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3v10m0 0l-3-3m3 3l3-3M9 21V11m0 0l-3 3m3-3l3 3"/></svg>,
  reports: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
  notifications: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
};

export function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const togglePrivacy = useStore((s) => s.togglePrivacy);
  const privacyMode = useStore((s) => s.privacyMode);
  const pendingCount = useStore((s) => s.pendingSmsTransactions.length);

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) onClose();
  };

  const renderNavItem = (item) => (
    <button
      key={item.path}
      className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
      onClick={() => handleNav(item.path)}
      style={{ position: 'relative' }}
    >
      {ICONS[item.icon]}
      <span>{item.label}</span>
      {/* Badge for notifications */}
      {item.path === '/notifications' && pendingCount > 0 && (
        <span style={{
          marginLeft: 'auto',
          background: '#ef4444',
          color: '#fff',
          fontSize: '0.65rem',
          fontWeight: 700,
          borderRadius: '9999px',
          minWidth: 18,
          height: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 5px',
        }}>
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      )}
    </button>
  );

  return (
    <>
      {isMobile && isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen || !isMobile ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="9" fill="url(#lg1)" />
              <path d="M10 20V16M16 20V12M22 20V9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <defs><linearGradient id="lg1" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#a78bfa"/></linearGradient></defs>
            </svg>
          </div>
          <span className="logo-text">WealthPulse</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_MAIN.map(renderNavItem)}
          <div className="sidebar-section-title">Groups & Splits</div>
          {NAV_SPLITS.map(renderNavItem)}
          <div className="sidebar-section-divider" />
          {NAV_BOTTOM_NAV.map(renderNavItem)}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={togglePrivacy}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: privacyMode ? 0.4 : 0.8 }}>
              {privacyMode ? (
                <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
              ) : (
                <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
              )}
            </svg>
            <span>{privacyMode ? 'Show Amounts' : 'Hide Amounts'}</span>
          </button>
          <button className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`} onClick={() => handleNav('/settings')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
}
