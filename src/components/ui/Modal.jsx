import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

function ModalPortal({ children }) {
  return createPortal(children, document.body);
}

export function Modal({ isOpen, onClose, title, children, className = '' }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        if (overlayRef.current) overlayRef.current.scrollTop = 0;
      });
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="modal-overlay" ref={overlayRef} onClick={onClose}>
        <div className="modal-spacer" />
        <div className={`modal-content ${className}`} onClick={(e) => e.stopPropagation()}>
          {title && (
            <div className="modal-header">
              <h3 className="modal-title">{title}</h3>
              <button className="modal-close" onClick={onClose} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="modal-body">{children}</div>
        </div>
        <div className="modal-spacer" />
      </div>
    </ModalPortal>
  );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, message }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        if (overlayRef.current) overlayRef.current.scrollTop = 0;
      });
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="modal-overlay" ref={overlayRef} onClick={onClose}>
        <div className="modal-spacer" />
        <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
          <p className="confirm-text">{message}</p>
          <div className="confirm-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>Confirm</button>
          </div>
        </div>
        <div className="modal-spacer" />
      </div>
    </ModalPortal>
  );
}
