import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Card, PageHeading } from '@/components/Card';
import { RecordButton } from '@/components/RecordButton';
import { TransactionForm } from '@/components/TransactionForm';
import { BulkImport } from '@/pages/BulkImport';
import { ApiError, api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import type { Company, ItemResponse, ListResponse, RecordedTransaction } from '@/types';

/**
 * Resolves the company to record against.
 *
 * Single-company for now: the first one is used, and if none exists it is
 * created with the default chart of accounts so a fresh install can record
 * immediately rather than dead-ending on an empty database. Company switching
 * arrives with the settings screen.
 */
function useCompany() {
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await api.get<ListResponse<Company>>('/companies');
        if (cancelled) return;

        if (list.data.length > 0) {
          setCompany(list.data[0]);
          return;
        }

        const created = await api.post<ItemResponse<Company & { accountsSeeded: number }>>(
          '/companies',
          { name: 'My Business', seedAccounts: true },
        );
        if (!cancelled) setCompany(created.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not reach the server.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { company, error };
}

type View = 'idle' | 'form' | 'saved';
type Mode = 'one' | 'bulk';

export function RecordPage() {
  const { company, error } = useCompany();
  const [view, setView] = useState<View>('idle');
  const [mode, setMode] = useState<Mode>('one');
  const [saved, setSaved] = useState<RecordedTransaction | null>(null);

  if (error) {
    return (
      <div>
        <PageHeading title="Record" />
        <Card>
          <p role="alert" className="m-0 text-sm font-medium text-red-700">
            {error}
          </p>
        </Card>
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <PageHeading title="Record" />
        <Card>
          <p className="m-0 flex items-center gap-2 text-sm text-ledger-500">
            <Loader2 size={15} className="animate-spin" aria-hidden />
            Setting up your books…
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeading title="Record">
        {view === 'idle'
          ? 'Tap the button to record a sale, purchase, or expense. The journal entry is posted for you.'
          : company.name}
      </PageHeading>

      {view === 'idle' && (
        <div className="mb-3 inline-flex rounded-lg border border-ledger-200 bg-white p-0.5">
          {(['one', 'bulk'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`cursor-pointer rounded-md border-none px-3 py-1.5 text-sm font-semibold ${
                mode === m ? 'bg-peso-600 text-white' : 'bg-transparent text-ledger-500'
              }`}
            >
              {m === 'one' ? 'Record One Sale' : 'Bulk Import'}
            </button>
          ))}
        </div>
      )}

      {view === 'idle' && mode === 'one' && (
        <div className="flex flex-col items-center gap-5 py-10 sm:py-16">
          <RecordButton onClick={() => setView('form')} />
          <p className="m-0 max-w-xs text-center text-sm text-ledger-500">
            Every entry is checked so debits and credits always balance.
          </p>
        </div>
      )}

      {view === 'idle' && mode === 'bulk' && <BulkImport companyId={company.id} />}

      {view === 'form' && (
        <Card className="mx-auto max-w-2xl">
          <TransactionForm
            companyId={company.id}
            onDone={(result) => {
              setSaved(result);
              setView('saved');
            }}
            onCancel={() => setView('idle')}
          />
        </Card>
      )}

      {view === 'saved' && saved && (
        <Saved
          result={saved}
          onAgain={() => {
            setSaved(null);
            setView('form');
          }}
          onDone={() => {
            setSaved(null);
            setView('idle');
          }}
        />
      )}
    </div>
  );
}

/** Confirmation showing the posted entry, so the user sees what the books did. */
function Saved({
  result,
  onAgain,
  onDone,
}: {
  result: RecordedTransaction;
  onAgain: () => void;
  onDone: () => void;
}) {
  const { transaction, journalEntry } = result;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="mx-auto max-w-2xl"
    >
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={22} className="shrink-0 text-peso-600" aria-hidden />
            <div>
              <h2 className="m-0 text-lg font-bold text-ledger-900">Recorded</h2>
              <p className="m-0 text-sm text-ledger-500">
                Posted as {journalEntry.entryNumber} · {formatAmount(transaction.totalAmount)}
              </p>
            </div>
          </div>

          {/* The posted entry, shown so the double entry is never a black box. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-md border-collapse text-sm">
              <caption className="sr-only">Journal entry posted for this transaction</caption>
              <thead>
                <tr className="border-b border-ledger-200 text-left">
                  <th scope="col" className="pb-2 text-xs font-bold text-ledger-500 uppercase">
                    Account
                  </th>
                  <th scope="col" className="pb-2 text-right text-xs font-bold text-ledger-500 uppercase">
                    Debit
                  </th>
                  <th scope="col" className="pb-2 text-right text-xs font-bold text-ledger-500 uppercase">
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {journalEntry.lines.map((line) => (
                  <tr key={line.id} className="border-b border-ledger-100">
                    <td className="py-2 text-ledger-900">
                      <span className="tabular text-ledger-500">{line.account.code}</span>{' '}
                      {line.account.name}
                    </td>
                    <td className="tabular py-2 text-right text-ledger-900">
                      {line.side === 'DEBIT' ? formatAmount(line.amount) : ''}
                    </td>
                    <td className="tabular py-2 text-right text-ledger-900">
                      {line.side === 'CREDIT' ? formatAmount(line.amount) : ''}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2 text-ledger-900">Total</td>
                  <td className="tabular py-2 text-right text-peso-700">
                    {formatAmount(journalEntry.debitTotal)}
                  </td>
                  <td className="tabular py-2 text-right text-peso-700">
                    {formatAmount(journalEntry.creditTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onDone}
              className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-4 py-2.5 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
            >
              Done
            </button>
            <button
              type="button"
              onClick={onAgain}
              className="cursor-pointer rounded-lg border-none bg-peso-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-peso-700"
            >
              Record another
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
