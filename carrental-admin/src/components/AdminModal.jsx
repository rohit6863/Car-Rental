import React, { useRef } from 'react';
import { X } from 'lucide-react';
import useModalFocusTrap from '../hooks/useModalFocusTrap';

export default function AdminModal({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = 'max-w-lg',
  className = '',
  children,
}) {
  const dialogRef = useRef(null);
  useModalFocusTrap(isOpen, dialogRef, onClose);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] bg-slate-900/50 dark:bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        className={`w-full ${maxWidth} bg-white dark:bg-[#141416] border border-hairline dark:border-[#27272A] rounded-2xl shadow-2xl overflow-hidden my-auto ${className}`}
      >
        <div className="no-print px-6 py-4 border-b border-hairline dark:border-[#27272A] flex items-center justify-between gap-3">
          <div>
            {subtitle && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-lavender-600 dark:text-amber-400 block">
                {subtitle}
              </span>
            )}
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-[#1C1C1F] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
