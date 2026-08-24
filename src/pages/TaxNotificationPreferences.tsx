import { useEffect, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, PageHeading } from '@/components/Card';
import { useApi } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { Company, ListResponse, TaxNotificationPreference } from '@/types';

const REMINDER_OPTIONS = [
  { days: 7, label: '7 days before' },
  { days: 3, label: '3 days before' },
  { days: 1, label: '1 day before' },
];

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-2">
      <span>
        <span className="block text-sm font-medium text-ledger-900">{label}</span>
        {hint && <span className="block text-xs text-ledger-500">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-ledger-200 transition peer-checked:bg-peso-600" />
        <span className="absolute left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function TaxNotificationPreferencesPage() {
  const toast = useToast();
  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;

  const prefs = useApi<{ data: { preferences: TaxNotificationPreference | null } }>(
    company ? `/tax/notification-preferences?companyId=${company.id}` : null,
  );

  const [emailReminder, setEmailReminder] = useState(true);
  const [smsReminder, setSmsReminder] = useState(true);
  const [pushNotification, setPushNotification] = useState(true);
  const [reminderDays, setReminderDays] = useState<number[]>([7, 3, 1]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const p = prefs.data?.data.preferences;
    if (p) {
      setEmailReminder(p.emailReminder);
      setSmsReminder(p.smsReminder);
      setPushNotification(p.pushNotification);
      setReminderDays(p.reminderDays);
    }
  }, [prefs.data]);

  function toggleReminderDay(days: number) {
    setReminderDays((prev) =>
      prev.includes(days) ? prev.filter((d) => d !== days) : [...prev, days].sort((a, b) => b - a),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || submitting) return;
    setSubmitting(true);
    try {
      await api.post('/tax/notification-preferences', {
        companyId: company.id,
        emailReminder,
        smsReminder,
        pushNotification,
        reminderDays,
      });
      toast.success('Preferences saved');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save preferences.');
    } finally {
      setSubmitting(false);
    }
  }

  if (companies.loading || prefs.loading) {
    return (
      <div>
        <PageHeading title="Notification Preferences" />
        <Card>
          <div className="h-40 animate-pulse rounded bg-ledger-100" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeading title="Notification Preferences">
        Choose how and when you're reminded about upcoming tax deadlines.
      </PageHeading>

      <div className="mx-auto max-w-xl">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Card>
            <h2 className="m-0 mb-1 text-base font-bold text-ledger-900">Channels</h2>
            <div className="divide-y divide-ledger-100">
              <Toggle checked={emailReminder} onChange={setEmailReminder} label="Email reminders" />
              <Toggle
                checked={smsReminder}
                onChange={setSmsReminder}
                label="SMS reminders"
                hint="Not yet available — your preference is saved for when it is."
              />
              <Toggle checked={pushNotification} onChange={setPushNotification} label="App notifications" />
            </div>
          </Card>

          <Card>
            <h2 className="m-0 mb-1 text-base font-bold text-ledger-900">Reminder Timing</h2>
            <p className="m-0 mb-2 text-xs text-ledger-500">
              Choose when before each deadline you'd like to be reminded.
            </p>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((opt) => {
                const active = reminderDays.includes(opt.days);
                return (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => toggleReminderDay(opt.days)}
                    aria-pressed={active}
                    className={`min-h-11 cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold ${
                      active
                        ? 'border-peso-600 bg-peso-50 text-peso-700'
                        : 'border-ledger-200 bg-white text-ledger-700 hover:bg-ledger-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Card>

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-record-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-record-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 size={16} className="animate-spin" aria-hidden />}
            Save Preferences
          </button>
        </form>
      </div>
    </div>
  );
}
