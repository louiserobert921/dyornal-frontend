import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/AuthLayout';
import { FormField, inputClass } from '@/components/FormField';
import { PasswordStrength, passwordMeetsRequirements } from '@/components/PasswordStrength';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, api } from '@/lib/api';

type Step = 1 | 2 | 3;

export function SignupPage() {
  const { signup } = useAuth();
  const [step, setStep] = useState<Step>(1);

  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSent, setResendSent] = useState(false);

  const step1Valid = companyName.trim().length > 0 && ownerName.trim().length > 0;
  const step2Valid =
    /\S+@\S+\.\S+/.test(email) &&
    passwordMeetsRequirements(password) &&
    password === confirmPassword;

  async function onSubmitStep2(e: FormEvent) {
    e.preventDefault();
    if (!step2Valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signup({ companyName: companyName.trim(), ownerName: ownerName.trim(), email, password });
      setStep(3);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    try {
      await api.post('/auth/resend-verification-email', { email });
      setResendSent(true);
    } catch {
      // The button already communicates intent; a failed resend isn't worth surfacing here.
    }
  }

  if (step === 3) {
    return (
      <AuthLayout title="Check your email">
        <p className="m-0 text-sm text-ledger-700">
          Account created! We sent a verification link to <strong>{email}</strong>.
        </p>
        <p className="mt-2 mb-0 text-sm text-ledger-500">
          Click the link to verify your address, then sign in.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={resend}
            disabled={resendSent}
            className="cursor-pointer rounded-lg border border-ledger-200 bg-white px-4 py-2.5 text-sm font-semibold text-ledger-700 hover:bg-ledger-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendSent ? 'Email sent' : 'Resend email'}
          </button>
          <Link
            to="/login"
            className="rounded-lg border-none bg-record-500 px-4 py-2.5 text-center text-sm font-bold text-white no-underline hover:bg-record-600"
          >
            Already verified? Log in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle={step === 1 ? 'Step 1 of 2 — Your business' : 'Step 2 of 2 — Sign-in details'}
    >
      <div className="mb-5 flex gap-1.5" aria-hidden>
        <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-peso-600' : 'bg-ledger-100'}`} />
        <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-peso-600' : 'bg-ledger-100'}`} />
      </div>

      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step1Valid) setStep(2);
          }}
          className="flex flex-col gap-4"
          noValidate
        >
          <FormField label="Company Name" htmlFor="signup-company" required>
            <input
              id="signup-company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={100}
              className={`${inputClass()} min-h-11`}
              required
            />
          </FormField>
          <FormField label="Owner Name" htmlFor="signup-owner" required>
            <input
              id="signup-owner"
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              maxLength={100}
              className={`${inputClass()} min-h-11`}
              required
            />
          </FormField>
          <button
            type="submit"
            disabled={!step1Valid}
            className="mt-1 min-h-11 w-full cursor-pointer rounded-lg border-none bg-record-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-record-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={onSubmitStep2} className="flex flex-col gap-4" noValidate>
          <FormField label="Email" htmlFor="signup-email" required>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass()} min-h-11`}
              required
            />
          </FormField>
          <FormField label="Password" htmlFor="signup-password" required>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass()} min-h-11`}
              required
            />
          </FormField>
          <PasswordStrength password={password} />
          <FormField
            label="Confirm Password"
            htmlFor="signup-confirm"
            required
            error={
              confirmPassword && confirmPassword !== password ? 'Passwords do not match' : undefined
            }
          >
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputClass(!!confirmPassword && confirmPassword !== password)} min-h-11`}
              required
            />
          </FormField>

          {error && (
            <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="min-h-11 flex-1 cursor-pointer rounded-lg border border-ledger-200 bg-white px-4 py-2.5 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!step2Valid || submitting}
              className="flex min-h-11 flex-[2] cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-record-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-record-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" aria-hidden />}
              Sign Up
            </button>
          </div>
        </form>
      )}

      <p className="m-0 mt-6 text-center text-sm text-ledger-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-peso-700 no-underline hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
