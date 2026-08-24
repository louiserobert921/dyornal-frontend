import { useState } from 'react';
import { X } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import { useTaxFilter } from '@/contexts/TaxFilterContext';

export function SaveFilterModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { criteria, result } = useTaxFilter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!criteria || !result) return null;

  const taxDue = 'totalTaxDue' in result.recalculatedTax
    ? result.recalculatedTax.totalTaxDue
    : result.recalculatedTax.taxDue;

  async function save() {
    if (!criteria) return;
    if (!name.trim()) {
      setError('Give this scenario a name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/tax/saved-filters', {
        companyId: criteria.companyId,
        name: name.trim(),
        description: description.trim() || undefined,
        taxYear: criteria.taxYear,
        quarter: criteria.quarter,
        minAmount: criteria.minAmount,
        maxAmount: criteria.maxAmount,
        transactionType: criteria.transactionType,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this scenario.');
    } finally {
      setSaving(false);
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
        aria-label="Save this filter as a scenario"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-ledger-200 px-5 py-4">
          <h2 className="m-0 text-base font-bold text-ledger-900">Save This Filter as Scenario</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg border-none bg-transparent p-1.5 text-ledger-500 hover:bg-ledger-100"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-ledger-500 uppercase">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="High-value sales only"
              className="rounded-lg border border-ledger-200 px-3 py-2 text-sm outline-none focus:border-peso-500"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-ledger-500 uppercase">Description (optional)</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Only accept sales > ₱1,000"
              className="rounded-lg border border-ledger-200 px-3 py-2 text-sm outline-none focus:border-peso-500"
            />
          </label>

          <div className="rounded-lg bg-ledger-50 p-3 text-sm">
            <p className="m-0 text-ledger-700">
              Current Selection: {result.includedCount} of {result.totalCount} transactions selected
            </p>
            <p className="m-0 mt-1 font-semibold text-ledger-900">
              Recalculated Tax: {formatAmount(taxDue)}
            </p>
          </div>

          {error && (
            <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-4 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="cursor-pointer rounded-lg border-none bg-peso-600 px-4 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Scenario'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
