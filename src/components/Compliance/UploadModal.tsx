import { useRef, useState, type DragEvent } from 'react';
import { AlertTriangle, Loader2, Upload, X } from 'lucide-react';
import { FormField, inputClass } from '@/components/FormField';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { ApiError, api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { ComplianceDocType, ComplianceDocument, ComplianceFilingType } from '@/types';

const DOC_TYPES: ComplianceDocType[] = ['GIS', 'BYLAWS', 'AOI', 'AUDITED_FINANCIALS', 'OTHER'];
const DOC_LABEL: Record<ComplianceDocType, string> = {
  GIS: 'GIS (Gross Income Summary)',
  BYLAWS: 'Bylaws',
  AOI: 'Articles of Incorporation',
  AUDITED_FINANCIALS: 'Audited Financial Statements',
  OTHER: 'Other',
};
const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

/** GIS/Audited Financials are tied to a filing period; Bylaws/AOI/Other are
 * evergreen documents amended rather than filed quarterly. */
const EVERGREEN: ComplianceDocType[] = ['BYLAWS', 'AOI', 'OTHER'];

export function UploadModal({
  companyId,
  onClose,
  onUploaded,
}: {
  companyId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const toast = useToast();
  useEscapeToClose(onClose);

  const [documentType, setDocumentType] = useState<ComplianceDocType>('GIS');
  const [filingType, setFilingType] = useState<ComplianceFilingType>('Q1');
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [notes, setNotes] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEvergreen = EVERGREEN.includes(documentType);

  async function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only PDF, PNG, or JPEG files are accepted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File is larger than the 10MB limit.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('companyId', companyId);
      form.append('documentType', documentType);
      if (!isEvergreen) form.append('filingType', filingType);
      form.append('taxYear', String(taxYear));
      if (notes.trim()) form.append('notes', notes.trim());
      await api.upload<{ data: ComplianceDocument }>('/compliance/upload', form);
      toast.success(`${DOC_LABEL[documentType]} uploaded`);
      onUploaded();
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Upload failed.';
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="m-0 text-base font-bold text-ledger-900">Upload Compliance Document</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded border-none bg-transparent p-1 text-ledger-500 hover:bg-ledger-100"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <FormField label="Document Type" htmlFor="doc-type">
            <select
              id="doc-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as ComplianceDocType)}
              className={`${inputClass()} text-base`}
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOC_LABEL[t]}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            {!isEvergreen && (
              <FormField label="Filing Period" htmlFor="doc-period">
                <select
                  id="doc-period"
                  value={filingType}
                  onChange={(e) => setFilingType(e.target.value as ComplianceFilingType)}
                  className={`${inputClass()} text-base`}
                >
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="ANNUAL">Annual</option>
                </select>
              </FormField>
            )}
            <FormField label="Tax Year" htmlFor="doc-year">
              <input
                id="doc-year"
                type="number"
                value={taxYear}
                onChange={(e) => setTaxYear(Number(e.target.value))}
                className={`${inputClass()} text-base`}
              />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="doc-notes" hint="Version, amendment date, or BIR reference number">
            <input
              id="doc-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass()} text-base`}
            />
          </FormField>

          <div
            onDragOver={(e: DragEvent) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e: DragEvent) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
              dragOver ? 'border-peso-500 bg-peso-50' : 'border-ledger-200 bg-ledger-50'
            }`}
          >
            <Upload size={24} className="text-ledger-400" aria-hidden />
            <span className="text-sm font-semibold text-ledger-700">Drag a file here or click Upload</span>
            <span className="text-xs text-ledger-500">PDF, PNG, or JPEG · max 10MB</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="mt-1 flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-ledger-200 bg-white px-3 py-2 text-xs font-semibold text-ledger-700 hover:bg-ledger-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Upload size={14} aria-hidden />}
              Choose File
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
          </div>

          {error && (
            <p role="alert" className="m-0 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle size={15} aria-hidden />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
