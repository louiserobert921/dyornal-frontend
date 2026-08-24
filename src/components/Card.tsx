import type { ReactNode } from 'react';

/** Standard white panel. Every screen's content sits in one of these. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-ledger-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold text-ledger-900">{title}</h1>
      {children && <p className="mt-1 max-w-3xl text-sm text-ledger-500">{children}</p>}
    </div>
  );
}
