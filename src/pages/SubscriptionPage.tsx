import { useState } from 'react';
import { CheckCircle2, Gift, KeyRound, XCircle } from 'lucide-react';
import { Card, PageHeading } from '@/components/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';

interface SubscriptionStatus {
  companyId: string;
  companyName: string;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  expiresAt: string | null;
  daysRemaining: number;
  message: string;
  canAccess: boolean;
}

const STATUS_ICON = {
  TRIAL: Gift,
  ACTIVE: CheckCircle2,
  EXPIRED: XCircle,
} as const;

const STATUS_LABEL = {
  TRIAL: 'Free Trial Active',
  ACTIVE: 'Subscription Active',
  EXPIRED: 'Subscription Expired',
} as const;

export function SubscriptionPage() {
  const { company, refreshCompany } = useAuth();
  const status = useApi<{ data: SubscriptionStatus }>(
    company ? `/subscriptions/status?companyId=${company.id}` : null,
  );
  const [keyInput, setKeyInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activatedMessage, setActivatedMessage] = useState<string | null>(null);

  async function activate() {
    if (!company) return;
    if (!keyInput.trim()) {
      setError('Enter a serial key first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post<{ data: { message: string; expiresAt: string } }>(
        '/subscriptions/activate-key',
        { companyId: company.id, serialKey: keyInput.trim() },
      );
      setActivatedMessage(res.data.message);
      setKeyInput('');
      await Promise.all([status.reload(), refreshCompany()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not activate this key.');
    } finally {
      setSubmitting(false);
    }
  }

  const data = status.data?.data;
  const Icon = data ? STATUS_ICON[data.status] : Gift;

  return (
    <div className="mx-auto max-w-2xl py-4">
      <PageHeading title="Subscription">Your access status and how to renew it.</PageHeading>

      <Card className="mb-6">
        {status.loading && <p className="m-0 text-sm text-ledger-500">Checking your status…</p>}
        {status.error && (
          <p role="alert" className="m-0 text-sm font-medium text-red-700">
            {status.error}
          </p>
        )}
        {data && (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <Icon
              size={36}
              className={
                data.status === 'ACTIVE'
                  ? 'text-peso-600'
                  : data.status === 'TRIAL'
                    ? 'text-record-500'
                    : 'text-red-500'
              }
              aria-hidden
            />
            <h2 className="m-0 text-xl font-bold text-ledger-900">{STATUS_LABEL[data.status]}</h2>
            <p className="m-0 text-sm text-ledger-600">{data.message}</p>
            {data.expiresAt && (
              <div className="mt-2 rounded-lg bg-ledger-50 px-4 py-2 text-sm text-ledger-700">
                Expires {new Date(data.expiresAt).toLocaleDateString('en-PH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                · {data.daysRemaining} day{data.daysRemaining === 1 ? '' : 's'} remaining
              </div>
            )}
          </div>
        )}
      </Card>

      {activatedMessage && (
        <Card className="mb-6 border-peso-200 bg-peso-50">
          <p className="m-0 flex items-center gap-2 text-sm font-medium text-peso-700">
            <CheckCircle2 size={16} aria-hidden />
            {activatedMessage}
          </p>
        </Card>
      )}

      {data && !data.canAccess && (
        <Card className="mb-6 border-record-200 bg-record-50">
          <h3 className="m-0 mb-2 flex items-center gap-2 text-base font-bold text-ledger-900">
            <KeyRound size={17} aria-hidden />
            Enter Serial Key to Continue
          </h3>
          <p className="m-0 mb-4 text-sm text-ledger-700">
            Your access has expired. Enter your serial key below for another 30 days.
          </p>

          <label className="mb-1 block text-xs font-semibold text-ledger-500 uppercase" htmlFor="serial-key">
            Serial Key
          </label>
          <input
            id="serial-key"
            type="text"
            placeholder="DYORNAL-XXXXXXXX-XXXXXXXX"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-ledger-200 px-3 py-2 text-center font-mono text-sm outline-none focus:border-peso-500"
          />

          {error && (
            <p role="alert" className="m-0 mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void activate()}
            disabled={submitting}
            className="mt-4 w-full cursor-pointer rounded-lg border-none bg-peso-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-peso-700 disabled:opacity-50"
          >
            {submitting ? 'Activating…' : 'Activate Key'}
          </button>
        </Card>
      )}

      <Card>
        <h3 className="m-0 mb-3 text-base font-bold text-ledger-900">How to Get a Serial Key</h3>
        <ol className="m-0 flex flex-col gap-2 pl-4 text-sm text-ledger-700">
          <li>Pay via GCash or PayMaya.</li>
          <li>Send your proof of payment and company name to your Dyornal contact.</li>
          <li>You'll receive a serial key.</li>
          <li>Enter it above to activate 30 days of access.</li>
        </ol>
      </Card>
    </div>
  );
}
