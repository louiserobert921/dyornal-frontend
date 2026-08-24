import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Loader2, UploadCloud } from 'lucide-react';
import { Card } from '@/components/Card';
import { ApiError, api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import type { ImportSalesResult } from '@/types';

interface ParsedRow {
  date: string;
  invoiceNumber: string | null;
  counterpartyName: string | null;
  netAmount: string;
  vatAmount: string | null;
  isPaid: boolean;
  description: string | null;
}

const EXPECTED_HEADERS = ['date', 'netamount'];

/**
 * A deliberately small CSV parser: no quoted-field escaping, no Excel
 * support. Good enough for a plain export from a spreadsheet, and adding a
 * parsing library for this is not worth the dependency.
 */
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

    const isPaidRaw = get('ispaid').toLowerCase();
    rows.push({
      date: get('date'),
      invoiceNumber: get('invoicenumber') || null,
      counterpartyName: get('customer') || get('counterpartyname') || null,
      netAmount: get('netamount') || get('amount'),
      vatAmount: get('vatamount') || null,
      isPaid: isPaidRaw === '' ? true : isPaidRaw === 'true' || isPaidRaw === 'yes' || isPaidRaw === '1',
      description: get('description') || get('notes') || null,
    });
  }

  return { rows, error: null };
}

export function BulkImport({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportSalesResult | null>(null);
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
      const res = await api.post<{ data: ImportSalesResult }>('/transactions/import-sales', {
        companyId,
        rows: rows.map((r) => ({
          date: r.date,
          invoiceNumber: r.invoiceNumber,
          counterpartyName: r.counterpartyName,
          description: r.description,
          netAmount: r.netAmount,
          vatAmount: r.vatAmount,
          isPaid: r.isPaid,
        })),
      });
      setResult(res.data);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Import failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setRows([]);
    setFileName(null);
    setParseError(null);
    setResult(null);
    setSubmitError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="m-0 text-base font-bold text-ledger-900">Bulk Import Sales</h2>
          <p className="m-0 mt-1 text-sm text-ledger-500">
            Upload a CSV with columns: <code className="text-xs">date, netAmount</code>, and optionally{' '}
            <code className="text-xs">invoiceNumber, customer, vatAmount, isPaid, description</code>. VAT
            is computed at 12% automatically when the column is left blank.
          </p>
        </div>

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
          <p role="alert" className="m-0 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle size={15} aria-hidden />
            {parseError}
          </p>
        )}

        {rows.length > 0 && !result && (
          <>
            <div className="overflow-x-auto rounded-lg border border-ledger-200">
              <table className="w-full min-w-md border-collapse text-sm">
                <caption className="sr-only">Preview of the first 5 rows</caption>
                <thead>
                  <tr className="border-b border-ledger-200 bg-ledger-50 text-left">
                    <th scope="col" className="px-3 py-2 text-xs font-bold text-ledger-500 uppercase">Date</th>
                    <th scope="col" className="px-3 py-2 text-xs font-bold text-ledger-500 uppercase">Customer</th>
                    <th scope="col" className="px-3 py-2 text-xs font-bold text-ledger-500 uppercase">Invoice #</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-bold text-ledger-500 uppercase">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b border-ledger-100">
                      <td className="px-3 py-2 text-ledger-900">{r.date || '—'}</td>
                      <td className="px-3 py-2 text-ledger-900">{r.counterpartyName ?? '—'}</td>
                      <td className="px-3 py-2 text-ledger-900">{r.invoiceNumber ?? '—'}</td>
                      <td className="tabular px-3 py-2 text-right text-ledger-900">{r.netAmount || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="m-0 text-xs text-ledger-500">
              Showing {Math.min(5, rows.length)} of {rows.length} row{rows.length === 1 ? '' : 's'}.
            </p>

            {submitError && (
              <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={reset}
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
                Import {rows.length} sale{rows.length === 1 ? '' : 's'}
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="flex flex-col gap-3">
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

            {result.results.length > 0 && (
              <p className="m-0 text-xs text-ledger-500">
                Total recorded:{' '}
                {formatAmount(
                  String(
                    result.results.length > 0
                      ? rows
                          .slice(0, result.results.length)
                          .reduce((sum, r) => sum + Number(r.netAmount || 0), 0)
                          .toFixed(2)
                      : '0',
                  ),
                )}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={reset}
                className="cursor-pointer rounded-lg border-none bg-peso-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-peso-700"
              >
                Import another file
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
