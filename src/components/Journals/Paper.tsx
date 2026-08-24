import type { ReactNode } from 'react';

/**
 * The bound-page surface every journal view sits on: cream stock, a tan rule
 * down the binding edge, and the soft shadow of a page resting on the one
 * beneath it.
 */
export function Paper({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`ledger-paper print-page overflow-hidden rounded-sm border border-rule-300 bg-paper-100 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_-12px_rgba(0,0,0,0.25)] ${className}`}
    >
      <div className="ledger-spine pl-3 sm:pl-6">
        <div className="ledger-lines bg-paper-100 px-3 py-4 sm:px-5 sm:py-6">{children}</div>
      </div>
    </div>
  );
}

/** The ruled heading over a page's columns. */
export function PaperHeading({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b-2 border-navy-700 pb-2">
      <div>
        <h2 className="ledger-serif m-0 text-base font-bold tracking-wide text-navy-700 uppercase">
          {title}
        </h2>
        {subtitle && <p className="m-0 mt-0.5 text-[11px] text-ink-700/70 italic">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/**
 * The footer every page carries: which page this is, and the span it covers.
 * Italic and small, the way a printed ledger foots its pages.
 */
export function PaperFooter({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-3 flex items-center justify-between border-t border-rule-300 pt-2 text-[11px] text-ink-700/70 italic">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

/**
 * The debit/credit proof printed at the foot of a journal page. A ledger that
 * does not foot is the one thing a bookkeeper must never miss, so it is stated
 * outright rather than left for the reader to add up.
 */
export function BalanceProof({
  debit,
  credit,
  balanced,
  label = 'Page totals',
}: {
  debit: string;
  credit: string;
  balanced: boolean;
  label?: string;
}) {
  return (
    <div
      className={`mt-2 flex flex-wrap items-center justify-between gap-2 rounded-sm border-t-2 px-2 py-2 ${
        balanced ? 'border-navy-700 bg-paper-200' : 'border-red-600 bg-red-50'
      }`}
    >
      <span className="text-[11px] font-bold tracking-wide text-ink-700 uppercase">{label}</span>
      <div className="ledger-mono flex items-center gap-4">
        <span className="text-ink-900">
          <span className="mr-1 text-[10px] text-ink-700/60 uppercase">Dr</span>
          {debit}
        </span>
        <span className="text-ink-900">
          <span className="mr-1 text-[10px] text-ink-700/60 uppercase">Cr</span>
          {credit}
        </span>
        <span
          className={`text-[11px] font-bold ${balanced ? 'text-navy-700' : 'text-red-700'}`}
          role={balanced ? undefined : 'alert'}
        >
          {balanced ? '✓ In balance' : '✗ Out of balance'}
        </span>
      </div>
    </div>
  );
}
