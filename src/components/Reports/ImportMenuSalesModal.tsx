import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Loader2, UploadCloud } from 'lucide-react';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { ApiError, api } from '@/lib/api';
import type { ImportMenuSalesResult } from '@/types';

interface ParsedRow {
  date: string;
  menuItemName: string;
  quantitySold: string;
  pesoSales: string;
}

const EXPECTED_HEADERS = ['date', 'menuitemname', 'quantitysold', 'pesosales'];

/** A deliberately small CSV parser, matching the app's existing bulk-import
 * pattern (see PayrollPage.tsx / BulkImport.tsx) — no quoted-field escaping,
 * good enough for a plain POS export. */
function parseCsv(text: string): { rows: ParsedRow[]; error: string | null } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], error: 'The file needs a header row and at least one data row.' };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return { rows: [], error: `Missing required column(s): ${missing.join(', ')}.` };
  }

  const idx = (name: string) => headers.indexOf(name);
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const get = (name: string) => {
      const j = idx(name);
      return j === -1 ? '' : (cells[j] ?? '');
    };
    rows.push({
      date: get('date'),
      menuItemName: get('menuitemname') || get('item') || get('name'),
      quantitySold: get('quantitysold') || get('qty'),
      pesoSales: get('pesosales') || get('sales') || get('amount'),
    });
  }

  return { rows, error: null };
}

export function ImportMenuSalesModal({
  companyId,
  onClose,
  onImported,
}: {
  companyId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  useEscapeToClose(onClose);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportMenuSalesResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setResult(null);
    setSubmitError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const { rows: parsed, error } = parseCsv(String(reader.result ?? ''));
      setParseError(error);
      setRows(error ? [] : parsed);
    };
    reader.onerror = () => setParseError('Could not read the file.');
    reader.readAsText(file);
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.post<{ data: ImportMenuSalesResult }>('/menu-item-sales/import', {
        companyId,
        rows,
      });
      setResult(res.data);
      onImported();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Import failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h2 className="m-0 mb-1 text-base font-bold text-ledger-900">Import POS Sales Data</h2>
        <p className="m-0 mb-4 text-sm text-ledger-500">
          Upload a POS export with columns:{' '}
          <code className="text-xs">date, menuItemName, quantitySold, pesoSales</code> — one row per menu
          item per day. Re-importing overlapping dates replaces those rows rather than duplicating them.
        </p>

        {!result && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ledger-200 bg-ledger-50 px-6 py-10 text-center hover:border-peso-400 hover:bg-peso-50">
            <UploadCloud size={28} className="text-ledger-400" aria-hidden />
            <span className="text-sm font-semibold text-ledger-700">
              {fileName ?? 'Choose a CSV file or drag it here'}
            </span>
            <span className="text-xs text-ledger-500">.csv only</span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        )}

        {parseError && (
          <p role="alert" className="m-0 mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle size={15} aria-hidden />
            {parseError}
          </p>
        )}

        {rows.length > 0 && !result && (
          <>
            <p className="m-0 mt-3 text-xs text-ledger-500">{rows.length} row(s) ready to import.</p>
            {submitError && (
              <p role="alert" className="m-0 mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-4 py-2.5 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-peso-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-peso-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <FileUp size={15} aria-hidden />}
                Import {rows.length} row{rows.length === 1 ? '' : 's'}
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-2.5 rounded-lg bg-peso-50 px-3 py-2.5">
              <CheckCircle2 size={18} className="shrink-0 text-peso-600" aria-hidden />
              <p className="m-0 text-sm font-medium text-peso-700">
                Imported {result.imported} of {result.imported + result.failed} row
                {result.imported + result.failed === 1 ? '' : 's'}.
              </p>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="m-0 mb-1 text-xs font-bold text-red-700 uppercase">
                  {result.errors.length} row{result.errors.length === 1 ? '' : 's'} failed
                </p>
                <ul className="m-0 flex flex-col gap-1 pl-4 text-sm text-red-700">
                  {result.errors.map((e) => (
                    <li key={e.row}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg border-none bg-peso-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-peso-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
