import { useLocation, useNavigate } from 'react-router-dom';
import './MobileNav.css';

const TABS = [
  { path: '/', label: 'Home', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
  { path: '/transactions', label: 'Activity', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { path: '/budgets', label: 'Budgets', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
  { path: '/groups', label: 'Groups', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { path: '/reports', label: 'Reports', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg> },
];

export function MobileNav({ onFabClick }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="mobile-nav">
      {TABS.map((tab, i) => (
        i === 2 ? (
          <div key="fab" className="fab-wrapper">
            {/* Budgets tab behind FAB */}
            <button
              className={`mobile-nav-item ${location.pathname === tab.path ? 'active' : ''}`}
              onClick={() => navigate(tab.path)}
              style={{ opacity: 0, pointerEvents: 'none', position: 'absolute' }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
            {/* FAB Center */}
            <button className="fab-center" onClick={onFabClick} aria-label="Add">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            key={tab.path}
            className={`mobile-nav-item ${location.pathname === tab.path ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        )
      ))}
    </nav>
  );
}
