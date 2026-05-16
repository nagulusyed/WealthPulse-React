import { useLocation, useNavigate } from 'react-router-dom';
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
  // FAB placeholder — rendered separately
  null,
  {
    path: '/groups', label: 'Groups',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    path: '/insights', label: 'Reports',
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>,
  },
];

export function MobileNav({ onFabClick }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) =>
    location.pathname === path ||
    (path === '/insights' && location.pathname === '/reports') ||
    (path === '/groups' && location.pathname === '/settle-up');

  return (
    <nav className="mobile-nav">
      {TABS.map((tab, i) =>
        tab === null ? (
          // Fix #2: FAB slot — no ghost tab, just the FAB button centered
          <div key="fab" className="fab-wrapper">
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
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        )
      )}
    </nav>
  );
}
