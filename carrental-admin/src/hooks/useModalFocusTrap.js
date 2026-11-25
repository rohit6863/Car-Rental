import { useEffect, useRef } from 'react';

function getFocusableElements(container) {
  if (!container) return [];
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll(selector)).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

/**
 * Pure React accessible dialog controller:
 * locks body scroll, traps Tab / Shift+Tab, closes on Escape,
 * and safely returns focus to opener if still connected.
 */
export default function useModalFocusTrap(isOpen, dialogRef, onClose) {
  const openerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';

    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = getFocusableElements(dialog);
      const target = focusable[0] || dialog;
      requestAnimationFrame(() => {
        if (target && typeof target.focus === 'function') {
          target.focus();
        }
      });
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !dialogRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialogRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener && opener.isConnected && typeof opener.focus === 'function') {
        requestAnimationFrame(() => {
          if (opener.isConnected) opener.focus();
        });
      }
    };
  }, [isOpen, dialogRef, onClose]);
}
