import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/AuthLayout';
import { FormField, inputClass } from '@/components/FormField';
import { PasswordStrength, passwordMeetsRequirements } from '@/components/PasswordStrength';
import { ApiError, api } from '@/lib/api';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const valid =
    !!token && passwordMeetsRequirements(newPassword) && newPassword === confirmPassword;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', { token, newPassword, confirmPassword });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset your password.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Invalid link">
        <p className="m-0 text-sm text-ledger-700">
          This password reset link is missing its token. Request a new one.
        </p>
        <Link
          to="/forgot-password"
          className="mt-6 block w-full rounded-lg border-none bg-record-500 px-4 py-2.5 text-center text-sm font-bold text-white no-underline hover:bg-record-600"
        >
          Request new reset link
        </Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password reset!">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CheckCircle2 size={48} className="text-peso-600" aria-hidden />
          <p className="m-0 text-sm text-ledger-700">
            Your password has been reset. Redirecting you to log in…
          </p>
          <Link
            to="/login"
            className="mt-2 w-full rounded-lg border-none bg-record-500 px-4 py-2.5 text-center text-sm font-bold text-white no-underline hover:bg-record-600"
          >
            Go to Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Choose a new password for your account.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormField label="New Password" htmlFor="reset-password" required>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={`${inputClass()} min-h-11`}
            required
          />
        </FormField>
        <PasswordStrength password={newPassword} />
        <FormField
          label="Confirm Password"
          htmlFor="reset-confirm"
          required
          error={
            confirmPassword && confirmPassword !== newPassword ? 'Passwords do not match' : undefined
          }
        >
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`${inputClass(!!confirmPassword && confirmPassword !== newPassword)} min-h-11`}
            required
          />
        </FormField>

        {error && (
          <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}{' '}
            <Link to="/forgot-password" className="font-semibold text-red-700 underline">
              Request a new link
            </Link>
          </p>
        )}

        <button
          type="submit"
          disabled={!valid || submitting}
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-record-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-record-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 size={16} className="animate-spin" aria-hidden />}
          Reset Password
        </button>
      </form>
    </AuthLayout>
  );
}
