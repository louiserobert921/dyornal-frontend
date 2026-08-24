import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Calculator, ScrollText } from 'lucide-react';
import { RecordButton } from '@/components/RecordButton';
import { useApi } from '@/hooks/useApi';
import type { Company, ListResponse, YesterdaySummary } from '@/types';

const ACTION_CARDS = [
  {
    to: '/journals',
    icon: BookOpen,
    title: 'Journals',
    description: 'Every entry Dyornal has posted, in order.',
    badge: 'AUDIT PROOF',
  },
  {
    to: '/audit-trail',
    icon: ScrollText,
    title: 'Audit Trail',
    description: 'Who changed what, and when.',
    badge: 'CHANGE TRACKING',
  },
  {
    to: '/tax',
    icon: Calculator,
    title: 'Tax',
    description: 'Filing status and what you owe.',
    badge: 'COMPLIANCE',
  },
] as const;

/**
 * The dashboard is the front door, not a report — it exists to get a
 * transaction recorded and to show the app is audit-ready, not to
 * re-surface figures that already live on Reports/Journals.
 */
export function Dashboard() {
  const navigate = useNavigate();
  const companies = useApi<ListResponse<Company>>('/companies');
  const companyId = companies.data?.data[0]?.id ?? null;

  const summary = useApi<{ data: YesterdaySummary }>(
    companyId ? `/dashboard/yesterday?companyId=${companyId}` : null,
  );

  const todayCount = summary.data?.data.todayPendingCount ?? 0;

  return (
    <div className="flex flex-col items-center py-8 sm:py-12">
      <div className="mb-8 max-w-md text-center sm:mb-10">
        <h1 className="m-0 text-3xl font-extrabold text-ledger-900 sm:text-4xl">Be Audit Ready</h1>
        <p className="m-0 mt-2 text-sm text-ledger-500">
          Every sale recorded, every entry traceable, every filing on time.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <RecordButton onClick={() => navigate('/record')} />
        <p className="m-0 text-xs text-ledger-400">Alt+R</p>
      </div>

      <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-3">
        {ACTION_CARDS.map(({ to, icon: Icon, title, description, badge }, i) => (
          <motion.button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            className="flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-ledger-200 bg-white p-5 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
          >
            <Icon size={22} className="text-peso-600" aria-hidden />
            <span className="text-sm font-bold text-ledger-900">{title}</span>
            <span className="m-0 text-xs text-ledger-500">{description}</span>
            <span className="mt-1 rounded-full bg-peso-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-peso-700 uppercase">
              {badge}
            </span>
          </motion.button>
        ))}
      </div>

      {!summary.loading && (
        <p className="mt-10 text-xs text-ledger-400">
          {todayCount} {todayCount === 1 ? 'transaction' : 'transactions'} recorded today
        </p>
      )}
    </div>
  );
}
