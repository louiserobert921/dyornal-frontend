import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/AuthLayout';
import { FormField, inputClass } from '@/components/FormField';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, api } from '@/lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 8;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    setNeedsVerification(false);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setNeedsVerification(true);
        setError(err.message);
      } else if (err instanceof ApiError && err.status === 429) {
        setError(err.message);
      } else if (err instanceof ApiError) {
        setError('Invalid email or password');
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    try {
      await api.post('/auth/resend-verification-email', { email });
      setResendSent(true);
    } catch {
      // Best-effort — the button itself already communicates intent.
    }
  }

  return (
    <AuthLayout title="Sign In" subtitle="Welcome back to your books.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormField label="Email" htmlFor="login-email" required>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass()} min-h-11`}
            required
          />
        </FormField>

        <FormField label="Password" htmlFor="login-password" required>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass()} min-h-11`}
            required
          />
        </FormField>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
            {needsVerification && (
              <button
                type="button"
                onClick={resendVerification}
                disabled={resendSent}
                className="ml-1.5 cursor-pointer border-none bg-transparent p-0 font-semibold text-red-700 underline disabled:no-underline"
              >
                {resendSent ? 'Verification email sent' : 'Resend verification email'}
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!valid || submitting}
          className="mt-1 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-record-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-record-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 size={16} className="animate-spin" aria-hidden />}
          Sign In
        </button>

        <Link
          to="/forgot-password"
          className="text-center text-sm font-medium text-peso-700 no-underline hover:underline"
        >
          Forgot password?
        </Link>
      </form>

      <p className="m-0 mt-6 text-center text-sm text-ledger-500">
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-peso-700 no-underline hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
