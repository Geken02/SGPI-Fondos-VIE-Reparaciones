// src/components/Modal.jsx
import { useEffect, useId, useRef } from 'react';
import '../styles/modal.css';

export default function Modal({ isOpen, onClose, title, children, size = 'medium' }) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();

  // Cerrar con tecla Escape + gestión de foco accesible
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      previousFocusRef.current = document.activeElement;
      // Mover el foco dentro del diálogo al abrir
      const node = containerRef.current;
      if (node) {
        const focusable = node.querySelector('input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])');
        (focusable || node).focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      // Devolver el foco al elemento que abrió el modal
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  // Mantener el foco dentro del diálogo mientras está abierto
  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return;
    const node = containerRef.current;
    if (!node) return;
    const focusables = node.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        ref={containerRef}
        className={`modal-container ${size}`} 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar ventana">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}