import type { ReactNode } from 'react';
import { formatAmount } from '@/lib/money';
import type { ReportMeta } from '@/types';

/**
 * Financial statements are printed on white with hairline rules, not on the
 * ledger's cream stock — these are the documents that leave the business, so
 * they follow the convention an accountant or a bank expects.
 */
export function StatementPaper({ children }: { children: ReactNode }) {
  return (
    <div className="print-page rounded-lg border border-ledger-200 bg-white p-4 shadow-sm sm:p-8">
      {children}
    </div>
  );
}

/** The masthead every statement carries: who, what, and over what period. */
export function StatementHeader({ meta, subtitle }: { meta: ReportMeta; subtitle?: string }) {
  const period =
    meta.asOf !== undefined
      ? `As of ${longDate(meta.asOf)}`
      : meta.dateFrom && meta.dateTo
        ? `For the period ${longDate(meta.dateFrom)} to ${longDate(meta.dateTo)}`
        : '';

  return (
    <header className="mb-5 border-b-2 border-ledger-900 pb-3 text-center">
      <h2 className="m-0 text-lg font-bold tracking-tight text-ledger-900">{meta.company.name}</h2>
      {meta.company.tin && (
        <p className="m-0 text-[11px] text-ledger-500">TIN {meta.company.tin}</p>
      )}
      <p className="m-0 mt-1 text-sm font-semibold text-ledger-700">{meta.title ?? subtitle}</p>
      {period && <p className="m-0 text-[11px] text-ledger-500 italic">{period}</p>}
    </header>
  );
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * One line of a statement.
 *
 * Negative figures are shown in parentheses, which is the accounting convention
 * and reads unambiguously in print where a minus sign can be lost.
 */
export function Line({
  label,
  code,
  amount,
  percent,
  indent = 0,
  bold,
  rule,
  muted,
}: {
  label: string;
  code?: string;
  amount: string;
  percent?: number | null;
  indent?: number;
  bold?: boolean;
  /** 'single' underlines a subtotal; 'double' closes a statement. */
  rule?: 'single' | 'double';
  muted?: boolean;
}) {
  const value = Number(amount);
  const display = value < 0 ? `(${formatAmount(Math.abs(value).toFixed(2))})` : formatAmount(amount);

  return (
    <div
      className={`grid grid-cols-[1fr_auto] items-baseline gap-3 py-1 sm:grid-cols-[1fr_140px_72px] ${
        rule === 'double'
          ? 'border-t-[3px] border-double border-t-ledger-900 font-bold'
          : rule === 'single'
            ? 'border-t border-ledger-300'
            : ''
      }`}
    >
      <span
        className={`text-sm ${bold ? 'font-bold text-ledger-900' : muted ? 'text-ledger-500' : 'text-ledger-700'}`}
        style={{ paddingLeft: `${indent * 16}px` }}
      >
        {code && <span className="tabular mr-2 text-[11px] text-ledger-500">{code}</span>}
        {label}
      </span>
      <span
        className={`tabular text-right text-sm ${
          bold ? 'font-bold text-ledger-900' : 'text-ledger-900'
        } ${value < 0 ? 'text-red-700' : ''}`}
      >
        {display}
      </span>
      <span className="tabular hidden text-right text-[11px] text-ledger-500 sm:block">
        {percent === null || percent === undefined ? '' : `${percent.toFixed(1)}%`}
      </span>
    </div>
  );
}

/** A named group of lines with its own subtotal. */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="m-0 mb-1 text-[11px] font-bold tracking-wider text-ledger-900 uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

/**
 * The proof at the foot of a statement. Stating the check outright is the point:
 * a reader should not have to add the columns to know the statement is sound.
 */
export function Proof({
  ok,
  okLabel,
  failLabel,
  detail,
}: {
  ok: boolean;
  okLabel: string;
  failLabel: string;
  detail?: string;
}) {
  return (
    <div
      role={ok ? undefined : 'alert'}
      className={`mt-4 rounded-md px-3 py-2 text-sm font-semibold ${
        ok ? 'bg-peso-50 text-peso-700' : 'bg-red-50 text-red-700'
      }`}
    >
      {ok ? `✓ ${okLabel}` : `✗ ${failLabel}`}
      {detail && <span className="ml-2 font-normal opacity-80">{detail}</span>}
    </div>
  );
}
