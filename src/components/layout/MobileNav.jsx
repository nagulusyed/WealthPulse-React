import { useLocation, useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import './MobileNav.css';

const TABS = [
  {
    path: '/', label: 'Home',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  },
  {
    path: '/transactions', label: 'Activity',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    // FAB placeholder — this slot is occupied by the FAB button
    path: '/budgets', label: 'Budgets',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  },
  {
    path: '/insights', label: 'Reports',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>,
  },
  {
    path: '/notifications', label: 'Alerts',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  },
];

export function MobileNav({ onFabClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pendingCount = useStore((s) => s.pendingSmsTransactions.length);

  const isActive = (path) =>
    location.pathname === path ||
    (path === '/insights' && location.pathname === '/reports');

  return (
    <nav className="mobile-nav">
      {TABS.map((tab, i) =>
        i === 2 ? (
          // Middle slot = FAB
          <div key="fab" className="fab-wrapper">
            <button
              className="mobile-nav-item"
              style={{ opacity: 0, pointerEvents: 'none', position: 'absolute' }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
            <button className="fab-center" onClick={onFabClick} aria-label="Add">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            key={tab.path}
            className={`mobile-nav-item ${isActive(tab.path) ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
            style={{ position: 'relative' }}
          >
            {tab.icon}
            {tab.path === '/notifications' && pendingCount > 0 && (
              <span style={{
                position: 'absolute',
                top: 2,
                right: '50%',
                transform: 'translateX(10px)',
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 700,
                borderRadius: '9999px',
                minWidth: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                lineHeight: 1,
              }}>
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
            <span>{tab.label}</span>
          </button>
        )
      )}
    </nav>
  );
}
