import type { ReactNode } from 'react';

/**
 * Label, control, and error message as one unit. The error is tied to the input
 * with aria-describedby so a screen reader announces why a field was rejected,
 * rather than only showing the red text sighted users get.
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ledger-700">
        {label}
        {required && (
          <span className="ml-0.5 text-record-600" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="m-0 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : (
        hint && <p className="m-0 text-xs text-ledger-500">{hint}</p>
      )}
    </div>
  );
}

/** Shared input styling, red-ringed when the field is in error. */
export function inputClass(hasError?: boolean): string {
  return `w-full rounded-lg border bg-white px-3 py-2 text-sm text-ledger-900 outline-none transition focus:ring-2 ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
      : 'border-ledger-200 focus:border-peso-500 focus:ring-peso-100'
  }`;
}
