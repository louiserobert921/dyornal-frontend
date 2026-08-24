import { useState } from 'react';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

/**
 * A blocking confirmation for a destructive action.
 *
 * `typeToConfirm`, when set, requires the user to type that exact string
 * before the confirm button enables — reserved for the one truly irreversible
 * action (deleting a company), not sprinkled on every delete.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  danger = true,
  typeToConfirm,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  typeToConfirm?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState('');
  const locked = typeToConfirm !== undefined && typed !== typeToConfirm;

  useEscapeToClose(onCancel, open);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <div className="flex items-start gap-3">
              {danger && (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <AlertTriangle size={18} aria-hidden />
                </span>
              )}
              <div>
                <h2 id="confirm-title" className="m-0 text-base font-bold text-ledger-900">
                  {title}
                </h2>
                <p className="m-0 mt-1 text-sm text-ledger-500">{message}</p>
              </div>
            </div>

            {typeToConfirm !== undefined && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-ledger-700">
                  Type <span className="font-mono">{typeToConfirm}</span> to confirm
                </label>
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-ledger-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={locked}
                className={`cursor-pointer rounded-lg border-none px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 ${
                  danger ? 'bg-red-600 hover:bg-red-700' : 'bg-peso-600 hover:bg-peso-700'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
