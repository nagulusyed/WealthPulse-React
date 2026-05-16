import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * SelectPicker — custom bottom-sheet picker to replace native <select>
 * Fix #3: portal always mounts on document.body at z-index 9998
 * so it renders above any Modal (z-index 1000) on Android WebViews.
 */
export function SelectPicker({ value, onChange, options = [], placeholder = 'Select...', disabled = false }) {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) setOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handle), 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handle); };
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          padding: '0.65rem 0.85rem',
          background: 'var(--bg-input)',
          border: `1px solid ${open ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-sm)',
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '0.9rem',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.15s',
          outline: 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? `${selected.emoji ? selected.emoji + ' ' : ''}${selected.label}` : placeholder}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && createPortal(
        <div style={{
          position: 'fixed', inset: 0,
          // Fix #3: z-index 9998 — above Modal (1000) and undo toast (1000), below nothing
          zIndex: 9998,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.15s ease',
        }}>
          <div
            ref={sheetRef}
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              borderTop: 'var(--border-card)',
              maxHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
              animation: 'sheetUp 0.22s ease',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0 0.25rem' }}>
              <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--border-bright)' }} />
            </div>

            {/* Options */}
            <div style={{ overflowY: 'auto', padding: '0.25rem 0 1.5rem' }}>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.85rem 1.25rem',
                      background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.12s',
                    }}
                  >
                    {opt.emoji && (
                      <span style={{ fontSize: '1.3rem', width: 28, textAlign: 'center', flexShrink: 0 }}>{opt.emoji}</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.92rem',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? 'var(--accent-indigo)' : 'var(--text-primary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{opt.label}</div>
                      {opt.sub && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>{opt.sub}</div>
                      )}
                    </div>
                    {isSelected && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
