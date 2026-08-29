import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Pencil, Plus, Trash2, UploadCloud } from 'lucide-react';
import { Card, PageHeading } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormField, inputClass } from '@/components/FormField';
import { useApi } from '@/hooks/useApi';
import { useDownload } from '@/hooks/useDownload';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { ApiError, api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import { useToast } from '@/lib/toast';
import type { Company, Employee, EmploymentStatus, ImportPayrollResult, ListResponse, PayrollSummary, TaxStatus } from '@/types';

const STATUSES: EmploymentStatus[] = ['PERMANENT', 'CONTRACTUAL', 'CASUAL'];

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** The Employee Payroll Register: gross compensation and deductions per
 * employee, for 1601C withholding and 1604C annual reconciliation. */
export function PayrollPage() {
  const toast = useToast();
  const { download } = useDownload();

  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;

  const [statusFilter, setStatusFilter] = useState<EmploymentStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [importing, setImporting] = useState(false);

  const query = company
    ? `/payroll?companyId=${company.id}${statusFilter ? `&status=${statusFilter}` : ''}${
        dateFrom ? `&dateFrom=${dateFrom}` : ''
      }${dateTo ? `&dateTo=${dateTo}` : ''}`
    : null;
  const list = useApi<{ data: Employee[] }>(query);
  const summary = useApi<{ data: PayrollSummary }>(company ? `/payroll/summary?companyId=${company.id}` : null);

  const employees = list.data?.data ?? [];

  if (companies.loading) {
    return (
      <div>
        <PageHeading title="Employee Payroll Register" />
        <SkeletonTable />
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <PageHeading title="Employee Payroll Register">No company yet.</PageHeading>
      </div>
    );
  }

  async function handleDelete(employee: Employee) {
    try {
      await api.del(`/payroll/${employee.id}`);
      toast.success(`${employee.name} removed`);
      setDeleting(null);
      void list.reload();
      void summary.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete this record.');
    }
  }

  return (
    <div>
      <PageHeading title="Employee Payroll Register">
        Basic pay, allowances, and deductions for withholding tax and 1604C annual reconciliation.
      </PageHeading>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <p className="m-0 text-xs font-semibold text-ledger-500 uppercase">Total Employees</p>
          <p className="tabular m-0 mt-1 text-2xl font-bold text-ledger-900">
            {summary.data?.data.totalEmployees ?? '—'}
          </p>
        </Card>
        <Card>
          <p className="m-0 text-xs font-semibold text-ledger-500 uppercase">Total Gross Compensation</p>
          <p className="tabular m-0 mt-1 text-2xl font-bold text-ledger-900">
            {summary.data ? formatAmount(summary.data.data.totalGrossCompensation) : '—'}
          </p>
        </Card>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EmploymentStatus | '')}
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-base outline-none focus:border-peso-500 sm:text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">Effective from</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-base outline-none focus:border-peso-500 sm:text-sm"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">Effective to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-base outline-none focus:border-peso-500 sm:text-sm"
          />
        </label>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void download(`/exports/payroll.xlsx?companyId=${company.id}`)}
            className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
          >
            <Download size={15} aria-hidden />
            Export
          </button>
          <button
            type="button"
            onClick={() => setImporting(true)}
            className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
          >
            <FileUp size={15} aria-hidden />
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-3 py-2 text-sm font-bold text-white hover:bg-peso-700"
          >
            <Plus size={15} aria-hidden />
            Add Employee
          </button>
        </div>
      </div>

      {list.loading ? (
        <SkeletonTable />
      ) : employees.length === 0 ? (
        <Card>
          <p className="m-0 text-center text-sm text-ledger-500">
            No employees yet.{' '}
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="cursor-pointer border-none bg-transparent p-0 font-semibold text-peso-700 underline"
            >
              Add Employee
            </button>
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden !p-0">
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-4xl border-collapse text-sm">
              <thead>
                <tr className="border-b border-ledger-200 bg-ledger-50 text-left">
                  <th className="px-4 py-2 text-xs font-bold text-ledger-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-xs font-bold text-ledger-500 uppercase">Position</th>
                  <th className="px-4 py-2 text-xs font-bold text-ledger-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-ledger-500 uppercase">Basic Pay</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-ledger-500 uppercase">Allowances</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-ledger-500 uppercase">Gross Comp.</th>
                  <th className="px-4 py-2 text-xs font-bold text-ledger-500 uppercase">Effective</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-ledger-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-ledger-100 hover:bg-ledger-50">
                    <td className="px-4 py-2 text-ledger-900">
                      {e.name}
                      {e.taxStatus === 'MANDATORY' && (
                        <span className="ml-2 rounded bg-ledger-100 px-1.5 py-0.5 text-[10px] font-semibold text-ledger-600 uppercase">
                          WH
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-ledger-500">{e.position ?? '—'}</td>
                    <td className="px-4 py-2 text-ledger-500">{e.employmentStatus}</td>
                    <td className="tabular px-4 py-2 text-right text-ledger-900">{formatAmount(e.basicMonthlyPay)}</td>
                    <td className="tabular px-4 py-2 text-right text-ledger-900">{formatAmount(e.allowances)}</td>
                    <td className="tabular px-4 py-2 text-right font-semibold text-ledger-900">
                      {formatAmount(e.grossMonthlyCompensation)}
                    </td>
                    <td className="px-4 py-2 text-ledger-500">{shortDate(e.effectiveDate)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(e)}
                        title="Edit"
                        className="cursor-pointer rounded border-none bg-transparent p-1.5 text-ledger-500 hover:bg-ledger-100 hover:text-ledger-900"
                      >
                        <Pencil size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(e)}
                        title="Delete"
                        className="cursor-pointer rounded border-none bg-transparent p-1.5 text-ledger-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-ledger-100 sm:hidden">
            {employees.map((e) => (
              <div key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-ledger-900">{e.name}</div>
                    <div className="mt-0.5 text-[10px] text-ledger-500">
                      {e.position ?? 'No position'} · {e.employmentStatus}
                    </div>
                  </div>
                  <div className="tabular text-right text-sm font-semibold text-ledger-900">
                    {formatAmount(e.grossMonthlyCompensation)}
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(e)}
                    className="flex-1 cursor-pointer rounded-lg border border-ledger-200 bg-white py-1.5 text-xs font-semibold text-ledger-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(e)}
                    className="flex-1 cursor-pointer rounded-lg border border-ledger-200 bg-white py-1.5 text-xs font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {creating && (
        <EmployeeFormModal
          companyId={company.id}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void list.reload();
            void summary.reload();
          }}
        />
      )}

      {editing && (
        <EmployeeFormModal
          companyId={company.id}
          employee={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void list.reload();
            void summary.reload();
          }}
        />
      )}

      {importing && (
        <ImportModal
          companyId={company.id}
          onClose={() => setImporting(false)}
          onImported={() => {
            void list.reload();
            void summary.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Remove this employee?"
        message={deleting ? `This will permanently remove ${deleting.name} from the payroll register.` : ''}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      />
    </div>
  );
}

function EmployeeFormModal({
  companyId,
  employee,
  onClose,
  onSaved,
}: {
  companyId: string;
  employee?: Employee;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isEdit = !!employee;

  const [name, setName] = useState(employee?.name ?? '');
  const [position, setPosition] = useState(employee?.position ?? '');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(
    employee?.employmentStatus ?? 'PERMANENT',
  );
  const [basicMonthlyPay, setBasicMonthlyPay] = useState(employee?.basicMonthlyPay ?? '');
  const [allowances, setAllowances] = useState(employee?.allowances ?? '0');
  const [taxStatus, setTaxStatus] = useState<TaxStatus>(employee?.taxStatus ?? 'OPTIONAL');
  const [tin, setTin] = useState(employee?.tin ?? '');
  const [effectiveDate, setEffectiveDate] = useState(
    employee?.effectiveDate ? employee.effectiveDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState(employee?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEscapeToClose(onClose);

  const canSubmit = name.trim().length > 0 && basicMonthlyPay !== '' && Number(basicMonthlyPay) >= 0;

  async function submit() {
    setSubmitting(true);
    setError(null);
    const payload = {
      name: name.trim(),
      position: position.trim() || null,
      employmentStatus,
      basicMonthlyPay: Number(basicMonthlyPay),
      allowances: Number(allowances || 0),
      taxStatus,
      tin: tin.trim() || null,
      effectiveDate,
      notes: notes.trim() || null,
    };
    try {
      if (isEdit && employee) {
        await api.patch(`/payroll/${employee.id}`, payload);
        toast.success('Employee updated');
      } else {
        await api.post('/payroll', { companyId, ...payload });
        toast.success('Employee added');
      }
      onSaved();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save this record.';
      setError(message);
      toast.error(`Failed to save: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
      >
        <h2 className="m-0 mb-4 text-base font-bold text-ledger-900">
          {isEdit ? `Edit ${employee?.name}` : 'Add Employee'}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Employee Name" htmlFor="emp-name" required>
            <input
              id="emp-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputClass()} text-base`}
            />
          </FormField>

          <FormField label="Position" htmlFor="emp-position" hint="Optional">
            <input
              id="emp-position"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className={`${inputClass()} text-base`}
            />
          </FormField>

          <FormField label="Employment Status" htmlFor="emp-status">
            <select
              id="emp-status"
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
              className={`${inputClass()} text-base`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Tax Status" htmlFor="emp-tax-status">
            <select
              id="emp-tax-status"
              value={taxStatus}
              onChange={(e) => setTaxStatus(e.target.value as TaxStatus)}
              className={`${inputClass()} text-base`}
            >
              <option value="OPTIONAL">Optional</option>
              <option value="MANDATORY">Mandatory</option>
            </select>
          </FormField>

          <FormField label="Basic Monthly Pay" htmlFor="emp-basic" required>
            <input
              id="emp-basic"
              type="number"
              min="0"
              step="0.01"
              value={basicMonthlyPay}
              onChange={(e) => setBasicMonthlyPay(e.target.value)}
              className={`${inputClass()} text-base`}
            />
          </FormField>

          <FormField label="Allowances" htmlFor="emp-allowances" hint="Housing, transportation, meals, etc.">
            <input
              id="emp-allowances"
              type="number"
              min="0"
              step="0.01"
              value={allowances}
              onChange={(e) => setAllowances(e.target.value)}
              className={`${inputClass()} text-base`}
            />
          </FormField>

          <FormField label="BIR TIN" htmlFor="emp-tin" hint="Optional">
            <input
              id="emp-tin"
              type="text"
              value={tin}
              onChange={(e) => setTin(e.target.value)}
              className={`${inputClass()} text-base`}
            />
          </FormField>

          <FormField label="Effective Date" htmlFor="emp-effective" required>
            <input
              id="emp-effective"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className={`${inputClass()} text-base`}
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Notes" htmlFor="emp-notes" hint="Ad-hoc adjustments, leaves, etc.">
              <textarea
                id="emp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={`${inputClass()} text-base`}
              />
            </FormField>
          </div>
        </div>

        {error && (
          <p role="alert" className="m-0 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-4 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" aria-hidden />}
            {isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ParsedRow {
  name: string;
  position: string | null;
  employmentStatus: EmploymentStatus;
  basicMonthlyPay: string;
  allowances: string;
}

const EXPECTED_HEADERS = ['name', 'basicmonthlypay'];

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
    const status = get('employmentstatus').toUpperCase();
    rows.push({
      name: get('name'),
      position: get('position') || null,
      employmentStatus: (STATUSES as string[]).includes(status) ? (status as EmploymentStatus) : 'PERMANENT',
      basicMonthlyPay: get('basicmonthlypay') || get('basicpay'),
      allowances: get('allowances') || '0',
    });
  }

  return { rows, error: null };
}

function ImportModal({
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
  const [result, setResult] = useState<ImportPayrollResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (result) onImported();
  }, [result, onImported]);

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
      const res = await api.post<{ data: ImportPayrollResult }>('/payroll/import', { companyId, rows });
      setResult(res.data);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Import failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h2 className="m-0 mb-1 text-base font-bold text-ledger-900">Bulk Import Employees</h2>
        <p className="m-0 mb-4 text-sm text-ledger-500">
          Upload a CSV with columns: <code className="text-xs">name, basicMonthlyPay</code>, and optionally{' '}
          <code className="text-xs">position, employmentStatus, allowances</code>.
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
                Import {rows.length} employee{rows.length === 1 ? '' : 's'}
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

function SkeletonTable() {
  return (
    <Card>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-ledger-100" />
        ))}
      </div>
    </Card>
  );
}
