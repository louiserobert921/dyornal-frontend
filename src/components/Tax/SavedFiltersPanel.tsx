import { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useTaxFilter } from '@/contexts/TaxFilterContext';
import { useApi } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import { SaveFilterModal } from '@/components/Tax/SaveFilterModal';

interface SavedFilterRow {
  id: string;
  name: string;
  description: string | null;
  taxYear: number;
  quarter: number;
  transactionCount: number;
  totalCount: number;
  recalculatedTax: string;
}

export function SavedFiltersPanel({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const list = useApi<{ data: SavedFilterRow[] }>(`/tax/saved-filters?companyId=${companyId}`);
  const { active, activeSavedFilterId, applySavedFilter, reset, applying } = useTaxFilter();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const filters = list.data?.data ?? [];

  async function startEdit(row: SavedFilterRow) {
    setEditingId(row.id);
    setEditName(row.name);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    try {
      await api.put(`/tax/saved-filters/${id}`, { name: editName.trim() });
      setEditingId(null);
      await list.reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not rename this scenario.');
    }
  }

  async function deleteFilter(id: string) {
    setDeletingId(id);
    setActionError('');
    try {
      await api.del(`/tax/saved-filters/${id}`);
      if (activeSavedFilterId === id) reset();
      await list.reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not delete this scenario.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Saved Filters"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-ledger-200 px-5 py-4">
          <h2 className="m-0 text-base font-bold text-ledger-900">Saved Filters (Scenarios)</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg border-none bg-transparent p-1.5 text-ledger-500 hover:bg-ledger-100"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-ledger-200 px-3 py-2.5">
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                !active ? 'border-peso-600 bg-peso-600' : 'border-ledger-300'
              }`}
            >
              {!active && <Check size={11} className="text-white" aria-hidden />}
            </span>
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer border-none bg-transparent p-0 text-left text-sm font-semibold text-ledger-900"
            >
              All Transactions
            </button>
          </div>

          <p className="m-0 mb-2 text-xs font-semibold tracking-wide text-ledger-500 uppercase">
            Your Scenarios
          </p>

          {list.loading && <p className="m-0 text-sm text-ledger-500">Loading…</p>}
          {!list.loading && filters.length === 0 && (
            <p className="m-0 text-sm text-ledger-500">No saved scenarios yet.</p>
          )}

          {actionError && (
            <p role="alert" className="m-0 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {filters.map((f) => {
              const isActive = activeSavedFilterId === f.id;
              return (
                <div
                  key={f.id}
                  className={`rounded-lg border px-3 py-2.5 ${
                    isActive ? 'border-peso-300 bg-peso-50' : 'border-ledger-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                        isActive ? 'border-peso-600 bg-peso-600' : 'border-ledger-300'
                      }`}
                    >
                      {isActive && <Check size={11} className="text-white" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      {editingId === f.id ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 rounded-lg border border-ledger-200 px-2 py-1 text-sm"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => void saveEdit(f.id)}
                            className="cursor-pointer rounded-lg border-none bg-peso-600 px-2 py-1 text-xs font-bold text-white hover:bg-peso-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-2 py-1 text-xs font-semibold text-ledger-700 hover:bg-ledger-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="m-0 truncate text-sm font-semibold text-ledger-900">{f.name}</p>
                          {f.description && (
                            <p className="m-0 truncate text-xs text-ledger-500">{f.description}</p>
                          )}
                          <p className="m-0 mt-1 text-xs text-ledger-600">
                            {f.transactionCount} of {f.totalCount} selected · Tax:{' '}
                            {formatAmount(f.recalculatedTax)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {editingId !== f.id && (
                    <div className="mt-2 flex gap-3 pl-6 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => void applySavedFilter(f.id)}
                        disabled={applying}
                        className="cursor-pointer border-none bg-transparent p-0 text-peso-700 hover:underline disabled:opacity-50"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => void startEdit(f)}
                        className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-ledger-600 hover:underline"
                      >
                        <Pencil size={11} aria-hidden />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteFilter(f.id)}
                        disabled={deletingId === f.id}
                        className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-red-600 hover:underline disabled:opacity-50"
                      >
                        <Trash2 size={11} aria-hidden />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-ledger-200 px-5 py-3">
          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            disabled={!active}
            className="w-full cursor-pointer rounded-lg border-none bg-peso-600 px-4 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:cursor-not-allowed disabled:opacity-50"
            title={active ? undefined : 'Apply a filter first to save it as a scenario'}
          >
            + Save Current Filter
          </button>
        </div>
      </div>

      {showSaveModal && (
        <SaveFilterModal onClose={() => setShowSaveModal(false)} onSaved={() => void list.reload()} />
      )}
    </div>
  );
}
