import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<((kind: ToastKind, message: string) => void) | null>(null);

/** Time on screen. Errors stay longer — they're more likely worth reading twice. */
const DURATIONS: Record<ToastKind, number> = { success: 3200, error: 5500, info: 3200 };

/**
 * A minimal toast stack, purpose-built rather than a dependency: three kinds,
 * a queue, auto-dismiss, and nothing else this app needs.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), DURATIONS[kind]);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:items-end">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg ${
                t.kind === 'success'
                  ? 'border-peso-200 bg-peso-50 text-peso-800'
                  : t.kind === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-ledger-200 bg-white text-ledger-800'
              }`}
            >
              {t.kind === 'success' && <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden />}
              {t.kind === 'error' && <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden />}
              {t.kind === 'info' && <Info size={17} className="mt-0.5 shrink-0" aria-hidden />}
              <span className="flex-1 font-medium">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="cursor-pointer border-none bg-transparent p-0 opacity-60 hover:opacity-100"
              >
                <X size={15} aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/** `toast.success(...)`, `toast.error(...)`, `toast.info(...)` from any component. */
export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error('useToast must be used within ToastProvider');
  return {
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  };
}
