import { useState, type FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  CircleHelp,
  Download,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  ScrollText,
  Trash2,
  Users,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormField, inputClass } from '@/components/FormField';
import { PasswordStrength, passwordMeetsRequirements } from '@/components/PasswordStrength';
import { useAuth } from '@/contexts/AuthContext';
import { useDownload } from '@/hooks/useDownload';
import { ApiError, api } from '@/lib/api';
import { getRefreshToken } from '@/lib/tokenStore';
import { useToast } from '@/lib/toast';
import { Card, PageHeading } from '@/components/Card';
import { AuditTrailPage } from '@/pages/AuditTrailPage';
import { MyBusinessPage } from '@/pages/MyBusinessPage';
import { useApi } from '@/hooks/useApi';
import type { Company, ListResponse } from '@/types';

const MENU = [
  { to: '/settings/business', label: 'My Business', icon: Building2 },
  { to: '/settings/users', label: 'Users', icon: Users },
  { to: '/settings/audit-trail', label: 'Audit Trail', icon: ScrollText },
  { to: '/settings/security', label: 'Security', icon: Lock },
  { to: '/subscription', label: 'Subscription', icon: KeyRound },
  { to: '/settings/about', label: 'About', icon: CircleHelp },
] as const;

/**
 * The settings hub. Business and Audit Trail are real screens backed by data;
 * Users and Security are placeholders that say plainly what they need — this
 * app has no login and no billing, so an "add user" form here would collect
 * input that goes nowhere. Building the UI without the backend it depends on
 * would look finished while doing nothing.
 */
export function SettingsPage() {
  const location = useLocation();

  return (
    <div>
      <PageHeading title="Settings" />

      <div className="flex flex-col gap-4 md:flex-row">
        <nav
          aria-label="Settings"
          className="flex gap-1 overflow-x-auto md:w-48 md:shrink-0 md:flex-col md:overflow-visible"
        >
          {MENU.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium no-underline ${
                  active
                    ? 'bg-peso-50 text-peso-700'
                    : 'text-ledger-500 hover:bg-ledger-100 hover:text-ledger-900'
                }`}
              >
                <Icon size={16} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          <Routes>
            <Route index element={<Navigate to="business" replace />} />
            <Route path="business" element={<MyBusinessPage />} />
            <Route path="users" element={<UsersPanel />} />
            <Route path="audit-trail" element={<AuditTrailPage />} />
            <Route path="security" element={<SecurityPanel />} />
            <Route path="about" element={<AboutPanel />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function NotBuilt({ title, reason }: { title: string; reason: string }) {
  return (
    <Card>
      <h2 className="m-0 text-base font-bold text-ledger-900">{title}</h2>
      <p className="m-0 mt-2 text-sm text-ledger-500">{reason}</p>
    </Card>
  );
}

function UsersPanel() {
  return (
    <NotBuilt
      title="Users"
      reason="Dyornal does not have accounts or logins yet — every action in this build comes from a single implicit owner. Adding or removing users, invites, and the ₱100/user billing this screen would need all depend on an authentication and billing system that has not been built. Building the form without it would collect input with nowhere to go."
    />
  );
}

function SecurityPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const valid =
    currentPassword.length > 0 &&
    passwordMeetsRequirements(newPassword) &&
    newPassword === confirmPassword;

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
        refreshToken: getRefreshToken(),
      });
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change your password.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onLogout() {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="m-0 text-base font-bold text-ledger-900">Signed in as</h2>
        <p className="m-0 mt-1 text-sm text-ledger-500">{user?.email}</p>
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-semibold text-ledger-700 hover:bg-ledger-50 disabled:opacity-50"
        >
          {loggingOut ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <LogOut size={15} aria-hidden />}
          Log out
        </button>
      </Card>

      <Card>
        <h2 className="m-0 text-base font-bold text-ledger-900">Change Password</h2>
        <form onSubmit={onChangePassword} className="mt-3 flex flex-col gap-4" noValidate>
          <FormField label="Current Password" htmlFor="sec-current" required>
            <input
              id="sec-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass()}
              required
            />
          </FormField>
          <FormField label="New Password" htmlFor="sec-new" required>
            <input
              id="sec-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass()}
              required
            />
          </FormField>
          <PasswordStrength password={newPassword} />
          <FormField
            label="Confirm New Password"
            htmlFor="sec-confirm"
            required
            error={
              confirmPassword && confirmPassword !== newPassword ? 'Passwords do not match' : undefined
            }
          >
            <input
              id="sec-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass(!!confirmPassword && confirmPassword !== newPassword)}
              required
            />
          </FormField>

          {error && (
            <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!valid || submitting}
            className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border-none bg-peso-600 px-4 py-2 text-sm font-bold text-white hover:bg-peso-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 size={15} className="animate-spin" aria-hidden />}
            Change Password
          </button>
        </form>
      </Card>
    </div>
  );
}

function AboutPanel() {
  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="m-0 text-base font-bold text-ledger-900">About Dyornal</h2>
        <p className="m-0 mt-1 text-sm text-ledger-500">
          A Philippine bookkeeping system: chart of accounts, double-entry journal, general and
          subsidiary ledgers, and BIR-oriented financial statements.
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-ledger-500">Version</dt>
          <dd className="m-0 text-ledger-900">Phase 6</dd>
          <dt className="text-ledger-500">Environment</dt>
          <dd className="m-0 text-ledger-900">Development</dd>
        </dl>
      </Card>

      {company && <DataExport companyId={company.id} companyName={company.name} />}
      {company && <DangerZone companyId={company.id} companyName={company.name} />}
    </div>
  );
}

/**
 * Deleting the company is real and destructive, so it gets a real confirm
 * flow — unlike Users and Security, this needs no authentication to be
 * meaningful: there is exactly one company record to remove, and removing it
 * removes everything cascaded from it.
 */
function DangerZone({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.del(`/companies/${companyId}`);
      toast.success('Company deleted');
      // Nothing left to route to meaningfully — reload lands back on setup.
      window.location.href = '/';
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete the company.');
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <Card className="border-red-200">
      <h2 className="m-0 flex items-center gap-2 text-base font-bold text-red-700">
        <Trash2 size={16} aria-hidden />
        Danger zone
      </h2>
      <p className="m-0 mt-1 text-sm text-ledger-500">
        Permanently deletes {companyName} — every account, journal entry, transaction, and audit
        record. This cannot be undone.
      </p>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-3 cursor-pointer rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Delete company
      </button>

      <ConfirmDialog
        open={confirming}
        title="Delete this company?"
        message="This action cannot be undone. Type the company name to confirm."
        confirmLabel={deleting ? 'Deleting…' : 'Delete permanently'}
        typeToConfirm={companyName}
        onCancel={() => setConfirming(false)}
        onConfirm={handleDelete}
      />
    </Card>
  );
}

/** GDPR-style data export: everything this company has, as CSV files already built for other screens. */
function DataExport({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [downloadingLabel, setDownloadingLabel] = useState<string | null>(null);
  const { download } = useDownload();

  const files = [
    { label: 'General Journal', href: `/api/exports/journal.csv?companyId=${companyId}` },
    { label: 'General Ledger', href: `/api/exports/gl.csv?companyId=${companyId}` },
    { label: 'Accounts Receivable', href: `/api/exports/ar.csv?companyId=${companyId}` },
    { label: 'Accounts Payable', href: `/api/exports/ap.csv?companyId=${companyId}` },
    { label: 'Trial Balance', href: `/api/reports/trial-balance.csv?companyId=${companyId}` },
    { label: 'Audit Trail', href: `/api/audit-trail.csv?companyId=${companyId}` },
  ];

  async function handleDownload(f: (typeof files)[number]) {
    setDownloadingLabel(f.label);
    try {
      await download(f.href);
    } finally {
      setDownloadingLabel(null);
    }
  }

  return (
    <Card>
      <h2 className="m-0 text-base font-bold text-ledger-900">Download your data</h2>
      <p className="m-0 mt-1 text-sm text-ledger-500">
        Every record {companyName} has in the system, as CSV — the ledger, the books, and the
        audit trail. Each file downloads separately below.
      </p>
      <div className="mt-3 flex flex-col gap-1.5">
        {files.map((f) => (
          <button
            key={f.href}
            type="button"
            onClick={() => void handleDownload(f)}
            disabled={!!downloadingLabel}
            className="flex cursor-pointer items-center justify-between rounded-lg border border-ledger-200 bg-white px-3 py-2 text-sm font-medium text-ledger-700 hover:bg-ledger-50 disabled:opacity-50"
          >
            {f.label}
            <Download size={15} aria-hidden />
          </button>
        ))}
      </div>
      {downloadingLabel && (
        <p className="m-0 mt-2 text-xs text-ledger-500">Downloading {downloadingLabel}…</p>
      )}
    </Card>
  );
}
