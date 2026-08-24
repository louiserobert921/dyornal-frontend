import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/AuthLayout';
import { FormField, inputClass } from '@/components/FormField';
import { api } from '@/lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const valid = /\S+@\S+\.\S+/.test(email);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      // The backend always returns success here regardless of whether the
      // email is registered, so there is nothing to branch on client-side —
      // showing the confirmation is the entire behavior either way.
      await api.post('/auth/forgot-password', { email });
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email">
        <p className="m-0 text-sm text-ledger-700">
          If <strong>{email}</strong> is registered, we've sent instructions to reset your password.
        </p>
        <p className="mt-2 mb-0 text-xs text-ledger-500">
          Didn't receive it? Check your spam folder, or{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-peso-700 underline"
          >
            try again
          </button>
          .
        </p>
        <Link
          to="/login"
          className="mt-6 block w-full rounded-lg border border-ledger-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-ledger-700 no-underline hover:bg-ledger-50"
        >
          Back to Login
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormField label="Email" htmlFor="forgot-email" required>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass()} min-h-11`}
            required
          />
        </FormField>

        <button
          type="submit"
          disabled={!valid || submitting}
          className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-record-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-record-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 size={16} className="animate-spin" aria-hidden />}
          Send Reset Link
        </button>

        <Link
          to="/login"
          className="text-center text-sm font-medium text-peso-700 no-underline hover:underline"
        >
          Back to Login
        </Link>
      </form>
    </AuthLayout>
  );
}
