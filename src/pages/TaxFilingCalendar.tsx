import { useState } from 'react';
import { CheckCircle2, Circle, Clock, Upload } from 'lucide-react';
import { Card, PageHeading } from '@/components/Card';
import { UploadModal } from '@/components/Tax/UploadModal';
import { useApi } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import { useToast } from '@/lib/toast';
import type { Company, FilingStatus, ListResponse, TaxFiling } from '@/types';

const FILING_LABEL: Record<string, string> = {
  Q1: 'Q1',
  Q2: 'Q2',
  Q3: 'Q3',
  Q4_ANNUAL: 'Annual',
};

const STATUS_STYLE: Record<FilingStatus, string> = {
  PENDING: 'bg-ledger-100 text-ledger-700',
  FILED: 'bg-peso-50 text-peso-700',
  LATE: 'bg-record-50 text-record-700',
  OVERDUE: 'bg-red-50 text-red-700',
};

const STATUS_ICON: Record<FilingStatus, typeof Clock> = {
  PENDING: Clock,
  FILED: CheckCircle2,
  LATE: Clock,
  OVERDUE: Clock,
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function TaxFilingCalendar() {
  const toast = useToast();
  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;

  const filings = useApi<{ data: TaxFiling[] }>(
    company ? `/tax/filings?companyId=${company.id}` : null,
  );

  const [uploadFilingId, setUploadFilingId] = useState<string | null>(null);
  // Derived from the current filings list rather than held as its own
  // snapshot — after an upload, `filings.reload()` refreshes the list, and
  // this recomputes so the modal's "already uploaded" state stays current
  // instead of showing what was true when the modal first opened.
  const uploadFiling = uploadFilingId
    ? (filings.data?.data.find((f) => f.id === uploadFilingId) ?? null)
    : null;
  const [markingFiled, setMarkingFiled] = useState<string | null>(null);

  async function markFiled(filing: TaxFiling) {
    setMarkingFiled(filing.id);
    try {
      await api.patch(`/tax/filings/${filing.id}/mark-filed`, {});
      toast.success(`${FILING_LABEL[filing.filingType]} marked as filed`);
      void filings.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not mark as filed.');
    } finally {
      setMarkingFiled(null);
    }
  }

  if (companies.loading || filings.loading) {
    return (
      <div>
        <PageHeading title="Filing Calendar" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <div className="h-16 animate-pulse rounded bg-ledger-100" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const rows = filings.data?.data ?? [];

  return (
    <div>
      <PageHeading title="Filing Calendar">
        Every BIR deadline for this tax year, with proof-of-filing tracked per quarter.
      </PageHeading>

      {rows.length === 0 ? (
        <Card>
          <p className="m-0 text-center text-sm text-ledger-500">
            No filings yet — complete tax setup to generate your quarterly deadlines.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((f) => {
            const Icon = STATUS_ICON[f.status];
            const allUploaded = f.documentsUploaded >= f.documentsTotal;
            return (
              <Card key={f.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ledger-900">
                        {FILING_LABEL[f.filingType]} {f.taxYear}
                      </span>
                      <span
                        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[f.status]}`}
                      >
                        <Icon size={11} aria-hidden />
                        {f.status}
                      </span>
                    </div>
                    <p className="m-0 mt-1 text-xs text-ledger-500">
                      Due {shortDate(f.dueDate)} · {f.taxForm}
                      {f.filingDate && ` · Filed ${shortDate(f.filingDate)}`}
                    </p>
                  </div>
                  <span className="tabular text-lg font-bold text-ledger-900">
                    {formatAmount(f.estimatedTaxDue)}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-1" aria-hidden>
                    {Array.from({ length: f.documentsTotal }, (_, i) =>
                      i < f.documentsUploaded ? (
                        <CheckCircle2 key={i} size={16} className="text-peso-600" />
                      ) : (
                        <Circle key={i} size={16} className="text-ledger-200" />
                      ),
                    )}
                  </div>
                  <span className="text-xs font-medium text-ledger-500">
                    {f.documentsUploaded}/{f.documentsTotal} documents uploaded
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadFilingId(f.id)}
                    className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
                  >
                    <Upload size={15} aria-hidden />
                    Upload Documents
                  </button>
                  {f.status !== 'FILED' && f.status !== 'LATE' && (
                    <button
                      type="button"
                      onClick={() => void markFiled(f)}
                      disabled={!allUploaded || markingFiled === f.id}
                      title={!allUploaded ? 'Upload all three documents first' : undefined}
                      className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-3 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark as Filed
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {uploadFiling && (
        <UploadModal
          filingId={uploadFiling.id}
          filingLabel={`${FILING_LABEL[uploadFiling.filingType]} ${uploadFiling.taxYear} — ${uploadFiling.taxForm}`}
          existingUploads={uploadFiling.uploads}
          onClose={() => setUploadFilingId(null)}
          onChanged={() => void filings.reload()}
        />
      )}
    </div>
  );
}
