import { useState } from 'react';
import { Printer } from 'lucide-react';
import { PageHeading } from '@/components/Card';
import { GeneralJournal } from '@/components/Journals/GeneralJournal';
import { GeneralLedger } from '@/components/Journals/GeneralLedger';
import { SubsidiaryLedger } from '@/components/Journals/SubsidiaryLedger';
import { useApi } from '@/hooks/useApi';
import type { Account, Company, ListResponse } from '@/types';

const TABS = [
  { key: 'general', label: 'General Journal' },
  { key: 'gl', label: 'General Ledger' },
  { key: 'ar', label: 'Receivables' },
  { key: 'ap', label: 'Payables' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** The books: the journal, the ledger, and the two subsidiary ledgers. */
export function JournalsPage() {
  const [tab, setTab] = useState<TabKey>('general');
  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;

  const accounts = useApi<ListResponse<Account>>(
    company ? `/accounts?companyId=${company.id}` : null,
  );

  if (companies.loading) {
    return (
      <div>
        <PageHeading title="Books" />
        <p className="text-sm text-ledger-500">Opening the books…</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <PageHeading title="Books">
          No company yet. Record a transaction and the books will open here.
        </PageHeading>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print">
        <PageHeading title="Books">
          {company.name}
          {company.tin && <span className="ml-2 text-ledger-500">TIN {company.tin}</span>}
        </PageHeading>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Books"
        className="no-print mb-4 flex gap-1 overflow-x-auto border-b border-ledger-200"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 cursor-pointer border-none border-b-2 bg-transparent px-3 py-2 text-sm font-semibold ${
              tab === t.key
                ? 'border-b-peso-600 text-peso-700'
                : 'border-b-transparent text-ledger-500 hover:text-ledger-900'
            }`}
          >
            {t.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => window.print()}
          title="Print this page"
          className="ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 self-center border-none bg-transparent px-3 py-2 text-sm font-medium text-ledger-500 hover:text-ledger-900"
        >
          <Printer size={15} aria-hidden />
          Print
        </button>
      </div>

      {tab === 'general' && (
        <GeneralJournal companyId={company.id} accounts={accounts.data?.data ?? []} />
      )}
      {tab === 'gl' && (
        <GeneralLedger companyId={company.id} accounts={accounts.data?.data ?? []} />
      )}
      {tab === 'ar' && <SubsidiaryLedger companyId={company.id} kind="AR" />}
      {tab === 'ap' && <SubsidiaryLedger companyId={company.id} kind="AP" />}
    </div>
  );
}
