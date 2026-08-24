import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageHeading } from '@/components/Card';
import { ComputationsTab } from '@/components/Tax/ComputationsTab';
import { TaxDueTab } from '@/components/Tax/TaxDueTab';
import { TaxIntelligenceTab } from '@/components/Tax/TaxIntelligenceTab';
import { TransactionsTab } from '@/components/Tax/TransactionsTab';
import { useApi } from '@/hooks/useApi';
import type { Company, ListResponse } from '@/types';

function currentQuarterFor(fiscalYearStart: number): { taxYear: number; quarter: 1 | 2 | 3 | 4 } {
  const now = new Date();
  const monthsSinceFiscalStart = (now.getUTCMonth() - (fiscalYearStart - 1) + 12) % 12;
  const quarter = (Math.floor(monthsSinceFiscalStart / 3) + 1) as 1 | 2 | 3 | 4;
  const taxYear =
    now.getUTCMonth() + 1 >= fiscalYearStart ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return { taxYear, quarter };
}

const TABS = [
  { key: 'due', label: 'Tax Due' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'computations', label: 'Computations' },
  { key: 'intelligence', label: 'Tax Intelligence' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function TaxAnalysisPage() {
  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;
  const [tab, setTab] = useState<TabKey>('due');

  const defaultPeriod = useMemo(
    () => currentQuarterFor(company?.fiscalYearStart ?? 1),
    [company?.fiscalYearStart],
  );
  const [taxYear] = useState(defaultPeriod.taxYear);
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(defaultPeriod.quarter);

  if (companies.loading) {
    return (
      <div>
        <PageHeading title="Tax Analysis" />
        <Card>
          <div className="h-24 animate-pulse rounded bg-ledger-100" />
        </Card>
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <PageHeading title="Tax Analysis" />
        <Card>
          <p className="m-0 text-sm text-ledger-500">
            No company found.{' '}
            <Link to="/tax/setup" className="font-semibold text-peso-700 no-underline hover:underline">
              Start tax setup
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeading title="Tax Analysis">
        Real quarterly tax due, how it's calculated, and how different choices compare.
      </PageHeading>

      <div role="tablist" aria-label="Tax Analysis" className="mb-4 flex gap-1 border-b border-ledger-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`cursor-pointer border-none border-b-2 bg-transparent px-3 py-2 text-sm font-semibold ${
              tab === t.key
                ? 'border-peso-600 text-peso-700'
                : 'border-transparent text-ledger-500 hover:text-ledger-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'due' && (
        <TaxDueTab
          company={company}
          taxYear={taxYear}
          quarter={quarter}
          onQuarterChange={setQuarter}
          onViewTransactions={() => setTab('transactions')}
        />
      )}
      {tab === 'transactions' && (
        <TransactionsTab company={company} taxYear={taxYear} quarter={quarter} />
      )}
      {tab === 'computations' && (
        <ComputationsTab company={company} taxYear={taxYear} quarter={quarter} />
      )}
      {tab === 'intelligence' && (
        <TaxIntelligenceTab company={company} taxYear={taxYear} quarter={quarter} />
      )}
    </div>
  );
}
