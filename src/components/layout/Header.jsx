import { useIsMobile } from '../../hooks/useMediaQuery';
import useStore from '../../store/useStore';
import './Header.css';

export function Header({ onMenuClick }) {
  const isMobile = useIsMobile();
  const togglePrivacy = useStore((s) => s.togglePrivacy);
  const privacyMode = useStore((s) => s.privacyMode);

  if (!isMobile) return null;

  return (
    <header className="mobile-header">
      <button className="menu-btn" onClick={onMenuClick} aria-label="Menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>
      <div className="header-logo">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="9" fill="url(#hlg)" />
          <path d="M10 20V16M16 20V12M22 20V9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <defs><linearGradient id="hlg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#a78bfa"/></linearGradient></defs>
        </svg>
        <span>WealthPulse</span>
      </div>
      <button className="privacy-btn" onClick={togglePrivacy} aria-label="Toggle privacy">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: privacyMode ? 0.4 : 0.8 }}>
          {privacyMode ? (
            <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
          ) : (
            <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
          )}
        </svg>
      </button>
    </header>
  );
}
