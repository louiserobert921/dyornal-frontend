import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** The centered card every auth page (login, signup, verify, reset) sits on. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ledger-50 px-4 py-10">
      <div className="w-full max-w-[400px]">
        <Link to="/login" className="mb-6 flex items-center justify-center gap-2 no-underline">
          <img src="/favicon.svg" alt="" width={32} height={32} className="rounded-[7px]" />
          <span className="text-xl font-bold text-peso-600">Dyornal</span>
        </Link>
        <div className="rounded-xl border border-ledger-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="m-0 text-xl font-bold text-ledger-900">{title}</h1>
          {subtitle && <p className="mt-1 mb-0 text-sm text-ledger-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
