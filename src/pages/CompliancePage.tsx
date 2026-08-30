import { useState } from 'react';
import { CheckCircle2, Download, FileText, Trash2, Upload } from 'lucide-react';
import { Card, PageHeading } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { UploadModal } from '@/components/Compliance/UploadModal';
import { useApi } from '@/hooks/useApi';
import { useDownload } from '@/hooks/useDownload';
import { ApiError, api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { Company, ComplianceDocType, ComplianceDocument, ComplianceFilingType, ComplianceStatus, ListResponse } from '@/types';

const DOC_TYPES: ComplianceDocType[] = [
  'GIS',
  'BYLAWS',
  'AOI',
  'AUDITED_FINANCIALS',
  'COR',
  'FORM_1905',
  'BOOKS_OF_ACCOUNTS',
  'OR_INVOICE_REGISTRATION',
  'OTHER',
];
const DOC_LABEL: Record<ComplianceDocType, string> = {
  GIS: 'GIS',
  BYLAWS: 'Bylaws',
  AOI: 'Articles of Incorporation',
  AUDITED_FINANCIALS: 'Audited Financials',
  COR: 'Certificate of Registration',
  FORM_1905: 'BIR Form 1905',
  BOOKS_OF_ACCOUNTS: 'Books of Accounts',
  OR_INVOICE_REGISTRATION: 'OR / Invoice Registration',
  OTHER: 'Other',
};
const PERIOD_LABEL: Record<ComplianceFilingType, string> = {
  Q1: 'Q1',
  Q2: 'Q2',
  Q3: 'Q3',
  ANNUAL: 'Annual',
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Days-until-deadline color: green >30d, yellow 15-30d, red <15d. */
function deadlineColor(daysUntil: number): string {
  if (daysUntil < 15) return 'text-red-700 bg-red-50';
  if (daysUntil <= 30) return 'text-amber-700 bg-amber-50';
  return 'text-peso-700 bg-peso-50';
}

/** The Business Compliance Hub: mandatory BIR document tracker for 1702Q/1702 filings. */
export function CompliancePage() {
  const toast = useToast();
  const { download } = useDownload();

  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;

  const [typeFilter, setTypeFilter] = useState<ComplianceDocType | ''>('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<ComplianceDocument | null>(null);

  const status = useApi<{ data: ComplianceStatus }>(company ? `/compliance/status?companyId=${company.id}` : null);
  const list = useApi<{ data: ComplianceDocument[] }>(
    company ? `/compliance?companyId=${company.id}${typeFilter ? `&documentType=${typeFilter}` : ''}` : null,
  );

  const documents = list.data?.data ?? [];

  if (companies.loading) {
    return (
      <div>
        <PageHeading title="Business Compliance Hub" />
        <SkeletonCards />
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <PageHeading title="Business Compliance Hub">No company yet.</PageHeading>
      </div>
    );
  }

  async function handleDelete(doc: ComplianceDocument) {
    try {
      await api.del(`/compliance/${doc.id}`);
      toast.success(`${doc.fileName} deleted`);
      setDeleting(null);
      void list.reload();
      void status.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete this document.');
    }
  }

  const s = status.data?.data;

  return (
    <div>
      <PageHeading title="Business Compliance Hub">
        GIS, bylaws, and AOI — the documents you need on hand before filing 1702Q or 1702.
      </PageHeading>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="m-0 text-xs font-semibold text-ledger-500 uppercase">Latest GIS</p>
          <p className="m-0 mt-1 text-lg font-bold text-ledger-900">
            {s?.latestGis ? `${PERIOD_LABEL[s.latestGis.filingType]} ${s.latestGis.taxYear}` : 'None uploaded'}
          </p>
        </Card>
        <Card>
          <p className="m-0 text-xs font-semibold text-ledger-500 uppercase">Bylaws</p>
          <p className={`m-0 mt-1 flex items-center gap-1.5 text-lg font-bold ${s?.bylawsUploaded ? 'text-peso-700' : 'text-red-700'}`}>
            {s?.bylawsUploaded ? <CheckCircle2 size={18} aria-hidden /> : null}
            {s?.bylawsUploaded ? 'Uploaded' : 'Missing'}
          </p>
        </Card>
        <Card>
          <p className="m-0 text-xs font-semibold text-ledger-500 uppercase">AOI</p>
          <p className={`m-0 mt-1 flex items-center gap-1.5 text-lg font-bold ${s?.aoiUploaded ? 'text-peso-700' : 'text-red-700'}`}>
            {s?.aoiUploaded ? <CheckCircle2 size={18} aria-hidden /> : null}
            {s?.aoiUploaded ? 'Uploaded' : 'Missing'}
          </p>
        </Card>
        <Card>
          <p className="m-0 text-xs font-semibold text-ledger-500 uppercase">Next Deadline</p>
          {s?.nextDeadline ? (
            <>
              <p className="m-0 mt-1 text-lg font-bold text-ledger-900">
                {s.nextDeadline.filingType === 'ANNUAL' ? '1702' : '1702Q'} · {shortDate(s.nextDeadline.dueDate)}
              </p>
              <span
                className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${deadlineColor(s.nextDeadline.daysUntil)}`}
              >
                {s.nextDeadline.daysUntil} days left
              </span>
            </>
          ) : (
            <p className="m-0 mt-1 text-sm text-ledger-500">No upcoming deadline</p>
          )}
        </Card>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-ledger-500 uppercase">Document Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ComplianceDocType | '')}
            className="rounded-lg border border-ledger-200 bg-white px-2 py-2 text-base outline-none focus:border-peso-500 sm:text-sm"
          >
            <option value="">All documents</option>
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOC_LABEL[t]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setUploading(true)}
          className="ml-auto flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-3 py-2 text-sm font-bold text-white hover:bg-peso-700"
        >
          <Upload size={15} aria-hidden />
          Upload Document
        </button>
      </div>

      {list.loading ? (
        <SkeletonCards />
      ) : documents.length === 0 ? (
        <Card>
          <p className="m-0 text-center text-sm text-ledger-500">
            No documents uploaded yet.{' '}
            <button
              type="button"
              onClick={() => setUploading(true)}
              className="cursor-pointer border-none bg-transparent p-0 font-semibold text-peso-700 underline"
            >
              Upload Document
            </button>
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {documents.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <FileText size={18} className="mt-0.5 shrink-0 text-peso-600" aria-hidden />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-ledger-900">
                        {d.documentType === 'OTHER' && d.documentName ? d.documentName : DOC_LABEL[d.documentType]}
                      </span>
                      <span className="rounded bg-peso-50 px-1.5 py-0.5 text-[10px] font-bold text-peso-700 uppercase">
                        Submitted
                      </span>
                    </div>
                    <p className="m-0 mt-0.5 truncate text-xs text-ledger-500">
                      {d.fileName} · {d.filingType ? `${PERIOD_LABEL[d.filingType]} ${d.taxYear}` : d.taxYear} · Uploaded{' '}
                      {shortDate(d.uploadedAt)}
                    </p>
                    {d.notes && <p className="m-0 mt-0.5 text-xs text-ledger-500">{d.notes}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => void download(`/compliance/${d.id}/download`)}
                    title="Download"
                    className="cursor-pointer rounded border-none bg-transparent p-1.5 text-ledger-500 hover:bg-ledger-100 hover:text-ledger-900"
                  >
                    <Download size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(d)}
                    title="Delete"
                    className="cursor-pointer rounded border-none bg-transparent p-1.5 text-ledger-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {uploading && (
        <UploadModal
          companyId={company.id}
          onClose={() => setUploading(false)}
          onUploaded={() => {
            void list.reload();
            void status.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this document?"
        message={deleting ? `This will permanently remove ${deleting.fileName}. This cannot be undone.` : ''}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      />
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-ledger-100" />
      ))}
    </div>
  );
}
