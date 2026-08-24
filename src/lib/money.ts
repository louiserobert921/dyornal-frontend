/**
 * Peso formatting and arithmetic for the form.
 *
 * Amounts cross the wire as fixed-2 strings so no precision is lost in transit.
 * The form works in centavos — integers — because 0.1 + 0.2 is not 0.3 in
 * binary floating point, and a VAT line that is one centavo off is exactly the
 * kind of error the ledger's balance check would reject.
 */

/** The statutory VAT rate under the NIRC. Confirmed by the API at runtime. */
export const VAT_RATE = 0.12;

/** "1234.5" → 123450 centavos. Returns null if the text is not a valid amount. */
export function toCentavos(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, '');
  if (trimmed === '' || !/^\d*\.?\d{0,2}$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** 123450 → "1234.50", the shape the API expects. */
export function fromCentavos(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

/** 123450 → "₱1,234.50" for display. */
export function formatPeso(centavos: number): string {
  return `₱${(centavos / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Formats an API amount string such as "1234.50" for display. */
export function formatAmount(amount: string): string {
  const centavos = Math.round(Number(amount) * 100);
  return Number.isFinite(centavos) ? formatPeso(centavos) : `₱${amount}`;
}

/** VAT at 12%, rounded half-up to the centavo — matching the server. */
export function vatOf(netCentavos: number): number {
  return Math.round(netCentavos * VAT_RATE);
}
