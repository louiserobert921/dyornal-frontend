import { useRef, useState, type DragEvent } from 'react';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { ApiError, api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { TaxDocumentType, TaxFileUpload } from '@/types';

const DOC_LABEL: Record<TaxDocumentType, string> = {
  EBIR_FORM: 'eBIR Form',
  EMAIL_RECEIPT: 'Email Receipt',
  PAYMENT_PROOF: 'Payment Proof',
};

const DOCUMENT_TYPES: TaxDocumentType[] = ['EBIR_FORM', 'EMAIL_RECEIPT', 'PAYMENT_PROOF'];
const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

/** The filing-list endpoint only returns this much per upload — fileName
 * isn't fetched until the modal loads the full filing detail, which this
 * component doesn't do (it re-fetches the whole filings list on change
 * instead), so the drop zone only ever needs to know "is something already
 * uploaded", not its original filename. */
type UploadSummary = Pick<TaxFileUpload, 'id' | 'documentType' | 'status'>;

function DropZone({
  filingId,
  documentType,
  existing,
  onUploaded,
}: {
  filingId: string;
  documentType: TaxDocumentType;
  existing: UploadSummary | undefined;
  onUploaded: () => void;
}) {
  const toast = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Only PDF, PNG, or JPEG files are accepted.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('documentType', documentType);
      await api.upload(`/tax/filings/${filingId}/upload`, form);
      toast.success(`${DOC_LABEL[documentType]} uploaded`);
      onUploaded();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
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
      className={`flex items-center justify-between gap-3 rounded-lg border-2 border-dashed p-3 transition ${
        dragOver ? 'border-peso-500 bg-peso-50' : 'border-ledger-200 bg-white'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <FileText size={18} className={existing ? 'text-peso-600' : 'text-ledger-400'} aria-hidden />
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-ledger-900">{DOC_LABEL[documentType]}</p>
          <p className="m-0 truncate text-xs text-ledger-500">
            {existing ? 'Uploaded' : 'Drag a file here or click Upload'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-ledger-200 bg-white px-3 py-2 text-xs font-semibold text-ledger-700 hover:bg-ledger-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Upload size={14} aria-hidden />}
        {existing ? 'Replace' : 'Upload'}
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
  );
}

/**
 * Drag-drop modal for a filing's three proof documents. `existingUploads`
 * only carries id/documentType/status (the filing-list shape) — filenames
 * aren't needed to render a drop zone before a file exists, and the modal
 * refetches the full filing after any upload via `onChanged`.
 */
export function UploadModal({
  filingId,
  filingLabel,
  existingUploads,
  onClose,
  onChanged,
}: {
  filingId: string;
  filingLabel: string;
  existingUploads: UploadSummary[];
  onClose: () => void;
  onChanged: () => void;
}) {
  useEscapeToClose(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="m-0 text-base font-bold text-ledger-900">Upload Documents</h2>
            <p className="m-0 mt-0.5 text-xs text-ledger-500">{filingLabel}</p>
          </div>
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
          {DOCUMENT_TYPES.map((docType) => (
            <DropZone
              key={docType}
              filingId={filingId}
              documentType={docType}
              existing={existingUploads.find((u) => u.documentType === docType)}
              onUploaded={onChanged}
            />
          ))}
        </div>

        <p className="m-0 mt-4 text-xs text-ledger-500">
          Accepted formats: PDF, PNG, JPEG. Max 10MB per file.
        </p>
      </div>
    </div>
  );
}
