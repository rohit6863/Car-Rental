import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext({
  showToast: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => clearTimeout(timerId));
      timersRef.current.clear();
    };
  }, []);

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, tone = 'indigo') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    const timer = setTimeout(() => {
      dismissToast(id);
    }, 3200);
    timersRef.current.set(id, timer);
  }, [dismissToast]);

  const getToneStyle = (tone) => {
    if (tone === 'emerald') {
      return {
        border: 'border-emerald-200 dark:border-emerald-500/30',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      };
    }
    if (tone === 'rose') {
      return {
        border: 'border-rose-200 dark:border-rose-500/30',
        icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
      };
    }
    return {
      border: 'border-indigo-200 dark:border-amber-500/30',
      icon: <Info className="w-4 h-4 text-indigo-600 dark:text-amber-400 shrink-0" />,
    };
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="no-print fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm"
      >
        {toasts.map((t) => {
          const style = getToneStyle(t.tone);
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white dark:bg-[#141416] border ${style.border} shadow-lg text-xs font-semibold text-slate-800 dark:text-zinc-100 transition-all`}
            >
              {style.icon}
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
