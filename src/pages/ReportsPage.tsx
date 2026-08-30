import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { PageHeading } from '@/components/Card';
import {
  BalanceSheetView,
  CashFlowView,
  IncomeStatementView,
  TrialBalanceView,
} from '@/components/Reports/ExternalReports';
import { ImportMenuSalesModal } from '@/components/Reports/ImportMenuSalesModal';
import { ProductTurnoverView } from '@/components/Reports/InternalReports';
import { useTaxFilter } from '@/contexts/TaxFilterContext';
import { useDownload } from '@/hooks/useDownload';
import { useApi } from '@/hooks/useApi';
import type {
  BalanceSheet,
  CashFlow,
  Company,
  IncomeStatement,
  ListResponse,
  ProductTurnoverReport,
  TrialBalance,
} from '@/types';

const EXTERNAL = [
  { key: 'balance-sheet', label: 'Balance Sheet' },
  { key: 'income-statement', label: 'Income Statement' },
  { key: 'cash-flow', label: 'Cash Flow' },
  { key: 'trial-balance', label: 'Trial Balance' },
] as const;

const INTERNAL = [
  { key: 'product-turnover', label: 'Product Turnover' },
] as const;

type ReportKey = (typeof EXTERNAL)[number]['key'] | (typeof INTERNAL)[number]['key'];

/**
 * Whether a payload carries the field a given view depends on.
 *
 * The fetch hook keeps the previous response in place while the next request is
 * in flight, so for one render after a tab change the data belongs to the report
 * just left. Rendering the new view against it reads fields that are not there.
 */
function has(data: object, key: string): boolean {
  return key in data;
}

/** First day of the current year, as the default start of the reporting period. */
function yearStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function ReportsPage() {
  const [scope, setScope] = useState<'external' | 'internal'>('external');
  const [report, setReport] = useState<ReportKey>('balance-sheet');
  const { download, downloading } = useDownload();
  const [dateFrom, setDateFrom] = useState(yearStart());
  const [dateTo, setDateTo] = useState(today());
  const [importingMenuSales, setImportingMenuSales] = useState(false);
  const { excludeTransactionIdsParam } = useTaxFilter();

  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;

  /**
   * Point-in-time reports take a single date; period reports take both. Passing
   * the wrong pair would silently produce a report for the wrong window, so the
   * query is built per report rather than shared.
   *
   * balance-sheet, income-statement, and cash-flow also carry the active Tax
   * Analysis what-if filter's exclusion set, so a filter applied there keeps
   * these statements in sync until reset — trial-balance is left unfiltered
   * since it exists to prove the ledger itself balances.
   */
  const path = useMemo(() => {
    if (!company) return null;
    const id = company.id;
    const excludeParam = excludeTransactionIdsParam
      ? `&excludeTransactionIds=${excludeTransactionIdsParam}`
      : '';
    switch (report) {
      case 'balance-sheet':
        return `/reports/balance-sheet?companyId=${id}&date=${dateTo}${excludeParam}`;
      case 'trial-balance':
        return `/reports/trial-balance?companyId=${id}&date=${dateTo}`;
      default:
        return `/reports/${report}?companyId=${id}&dateFrom=${dateFrom}&dateTo=${dateTo}${excludeParam}`;
    }
  }, [company, report, dateFrom, dateTo, excludeTransactionIdsParam]);

  const result = useApi<BalanceSheet | IncomeStatement | CashFlow | TrialBalance | ProductTurnoverReport>(
    path,
  );

  const excelHref = useMemo(() => {
    if (!company) return '';
    const id = company.id;
    const excludeParam =
      excludeTransactionIdsParam && report !== 'trial-balance'
        ? `&excludeTransactionIds=${excludeTransactionIdsParam}`
        : '';
    // product-turnover's export lives at /exports/<name>.xlsx, not
    // /exports/excel/<name> — same convention as payroll's export, since
    // both build from POS/side-data rather than the financial statements.
    if (report === 'product-turnover') {
      return `/api/exports/product-turnover.xlsx?companyId=${id}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    }
    if (report === 'balance-sheet' || report === 'trial-balance') {
      return `/api/exports/excel/${report}?companyId=${id}&date=${dateTo}${excludeParam}`;
    }
    return `/api/exports/excel/${report}?companyId=${id}&dateFrom=${dateFrom}&dateTo=${dateTo}${excludeParam}`;
  }, [company, report, dateFrom, dateTo, excludeTransactionIdsParam]);

  if (companies.loading) {
    return (
      <div>
        <PageHeading title="Reports" />
        <p className="text-sm text-ledger-500">Loading…</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <PageHeading title="Reports">
          No company yet. Record a transaction and the reports will appear here.
        </PageHeading>
      </div>
    );
  }

  const tabs = scope === 'external' ? EXTERNAL : INTERNAL;
  const isPointInTime = report === 'balance-sheet' || report === 'trial-balance';

  return (
    <div>
      <div className="no-print">
        <PageHeading title="Reports">
          {company.name}
          {company.tin && <span className="ml-2 text-ledger-500">TIN {company.tin}</span>}
        </PageHeading>

        {/* ── Scope ────────────────────────────────────────────────────── */}
        <div className="mb-3 inline-flex rounded-lg border border-ledger-200 bg-white p-0.5">
          {(['external', 'internal'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setScope(s);
                setReport(s === 'external' ? 'balance-sheet' : 'product-turnover');
              }}
              aria-pressed={scope === s}
              className={`cursor-pointer rounded-md border-none px-3 py-1.5 text-sm font-semibold ${
                scope === s ? 'bg-peso-600 text-white' : 'bg-transparent text-ledger-500'
              }`}
            >
              {s === 'external' ? 'External' : 'Internal'}
            </button>
          ))}
        </div>

        {/* ── Report + period ──────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-ledger-200 pb-3">
          <div role="tablist" aria-label="Reports" className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={report === t.key}
                onClick={() => setReport(t.key)}
                className={`cursor-pointer rounded-lg border-none px-3 py-1.5 text-sm font-semibold ${
                  report === t.key
                    ? 'bg-peso-50 text-peso-700'
                    : 'bg-transparent text-ledger-500 hover:text-ledger-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-end gap-2">
            {/* A point-in-time report has no start date; showing one would
                imply a window that does not apply. */}
            {!isPointInTime && (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-ledger-500 uppercase">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-ledger-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-peso-500"
                />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-ledger-500 uppercase">
                {isPointInTime ? 'As of' : 'To'}
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-ledger-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-peso-500"
              />
            </label>

            {report === 'trial-balance' && (
              <button
                type="button"
                onClick={() =>
                  void download(`/api/reports/trial-balance.csv?companyId=${company.id}&date=${dateTo}`)
                }
                disabled={downloading}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50 disabled:opacity-50"
              >
                <Download size={15} aria-hidden />
                CSV
              </button>
            )}

            <button
              type="button"
              onClick={() => void download(excelHref)}
              disabled={downloading}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-peso-600 px-3 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:opacity-50"
            >
              <FileSpreadsheet size={15} aria-hidden />
              Excel
            </button>
          </div>
        </div>
      </div>

      {result.loading && <p className="text-sm text-ledger-500">Preparing the report…</p>}

      {result.error && (
        <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {result.error}
        </p>
      )}

      {!result.loading && !result.error && result.data && (
        <>
          {report === 'balance-sheet' && has(result.data, 'assets') && (
            <BalanceSheetView data={result.data as BalanceSheet} />
          )}
          {report === 'income-statement' && has(result.data, 'revenue') && (
            <IncomeStatementView data={result.data as IncomeStatement} />
          )}
          {report === 'cash-flow' && has(result.data, 'operating') && (
            <CashFlowView data={result.data as CashFlow} />
          )}
          {report === 'trial-balance' && has(result.data, 'accounts') && (
            <TrialBalanceView data={result.data as TrialBalance} />
          )}
          {report === 'product-turnover' && has(result.data, 'items') && (
            <ProductTurnoverView
              data={result.data as ProductTurnoverReport}
              onImportClick={() => setImportingMenuSales(true)}
            />
          )}
        </>
      )}

      {importingMenuSales && (
        <ImportMenuSalesModal
          companyId={company.id}
          onClose={() => setImportingMenuSales(false)}
          onImported={() => void result.reload()}
        />
      )}
    </div>
  );
}
