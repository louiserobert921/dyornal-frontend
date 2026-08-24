import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { AuthLayout } from '@/components/AuthLayout';
import { ApiError, api } from '@/lib/api';

type State = 'verifying' | 'success' | 'expired' | 'invalid' | 'already';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [state, setState] = useState<State>('verifying');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    let cancelled = false;
    api
      .post('/auth/verify-email', { token })
      .then(() => {
        if (!cancelled) setState('success');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && /already/i.test(err.message)) setState('already');
        else if (err instanceof ApiError && /expired/i.test(err.message)) setState('expired');
        else setState('invalid');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (state !== 'success') return;
    const timer = setTimeout(() => navigate('/login', { replace: true }), 3000);
    return () => clearTimeout(timer);
  }, [state, navigate]);

  if (state === 'verifying') {
    return (
      <AuthLayout title="Verifying email…">
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 size={40} className="animate-spin text-peso-600" aria-hidden />
          <p className="m-0 text-sm text-ledger-500">One moment.</p>
        </div>
      </AuthLayout>
    );
  }

  if (state === 'success') {
    return (
      <AuthLayout title="Email verified!">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CheckCircle2 size={48} className="text-peso-600" aria-hidden />
          <p className="m-0 text-sm text-ledger-700">
            Your account is ready. You can now log in.
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

  const message =
    state === 'already'
      ? 'This email is already verified.'
      : state === 'expired'
        ? 'This verification link has expired.'
        : 'This verification link is invalid.';

  return (
    <AuthLayout title="Verification failed">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <XCircle size={48} className="text-red-600" aria-hidden />
        <p className="m-0 text-sm text-ledger-700">{message}</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <Link
            to="/login"
            className="w-full rounded-lg border-none bg-record-500 px-4 py-2.5 text-center text-sm font-bold text-white no-underline hover:bg-record-600"
          >
            Go to Login
          </Link>
          <Link
            to="/signup"
            className="w-full text-center text-sm font-medium text-peso-700 no-underline hover:underline"
          >
            Back to Sign Up
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
