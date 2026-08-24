import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card, PageHeading } from '@/components/Card';
import { FormField, inputClass } from '@/components/FormField';
import { useApi } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';
import { formatAmount } from '@/lib/money';
import { useToast } from '@/lib/toast';
import type {
  AccountingMethod,
  Company,
  DeductionMethod,
  ListResponse,
  TaxYearType,
  TaxpayerType,
} from '@/types';

type Step = 1 | 2 | 3;

const TAXPAYER_LABEL: Record<TaxpayerType, string> = {
  SOLE_PROP: 'Sole Proprietor',
  CORPORATION: 'Corporation',
  MIXED_INCOME: 'Mixed Income Earner',
};

const DEDUCTION_LABEL: Record<DeductionMethod, string> = {
  OSD_40: 'Optional Standard Deduction (40%)',
  ITEMIZED: 'Itemized Deductions',
  FLAT_8: '8% Flat Tax Rate',
};

/**
 * Three-step tax setup: taxpayer basics, income figures (shaped by taxpayer
 * type), then a review before creating the year's TaxConfiguration and its
 * four auto-generated quarterly filings.
 */
export function TaxSetupWizard() {
  const navigate = useNavigate();
  const toast = useToast();
  const companies = useApi<ListResponse<Company>>('/companies');
  const company = companies.data?.data[0] ?? null;

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>('SOLE_PROP');
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [accountingMethod, setAccountingMethod] = useState<AccountingMethod>('ACCRUAL');
  const [taxYearType, setTaxYearType] = useState<TaxYearType>('CALENDAR');
  const [fiscalStartMonth, setFiscalStartMonth] = useState(1);

  const [expectedGrossSales, setExpectedGrossSales] = useState('');
  const [monthlyFixedSalary, setMonthlyFixedSalary] = useState('');
  const [deMinimisBenefits, setDeMinimisBenefits] = useState('');
  const [deductionMethod, setDeductionMethod] = useState<DeductionMethod>('OSD_40');
  const [grossSalesTouched, setGrossSalesTouched] = useState(false);

  const priorYear = useApi<{ data: { priorYear: number; actualGrossSales: string | null } }>(
    company ? `/tax/prior-year-actual?companyId=${company.id}&taxYear=${taxYear}` : null,
  );
  const priorYearActual = priorYear.data?.data.actualGrossSales ?? null;

  // Pre-fill the gross-sales field from last year's real posted sales the
  // first time that figure loads, but only if the user hasn't already typed
  // something — this is a suggestion, not an override of their own input.
  useEffect(() => {
    if (priorYearActual && !grossSalesTouched && expectedGrossSales === '') {
      setExpectedGrossSales(priorYearActual);
    }
  }, [priorYearActual, grossSalesTouched, expectedGrossSales]);

  const step1Valid = true; // Every step-1 field has a default.
  const step2Valid = Number(expectedGrossSales) > 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company || !step2Valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/tax/setup', {
        companyId: company.id,
        taxYear,
        taxpayerType,
        accountingMethod,
        taxYearType,
        ...(taxYearType === 'FISCAL' ? { fiscalStartMonth } : {}),
        deductionMethod,
        expectedGrossSales,
        ...(taxpayerType === 'MIXED_INCOME' && monthlyFixedSalary
          ? { monthlyFixedSalary }
          : {}),
        ...(deMinimisBenefits ? { deMinimisBenefits } : {}),
      });
      toast.success('Tax setup complete');
      navigate('/tax');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your tax setup.');
    } finally {
      setSubmitting(false);
    }
  }

  if (companies.loading) {
    return (
      <div>
        <PageHeading title="Tax Setup" />
        <Card>
          <div className="h-40 animate-pulse rounded bg-ledger-100" />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeading title="Tax Setup">
        A few questions about how your business is taxed — this drives your quarterly filing
        schedule and deduction analysis.
      </PageHeading>

      <div className="mx-auto max-w-xl">
        <div className="mb-5 flex gap-1.5" aria-hidden>
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${step >= s ? 'bg-peso-600' : 'bg-ledger-100'}`} />
          ))}
        </div>

        <Card>
          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step1Valid) setStep(2);
              }}
              className="flex flex-col gap-4"
              noValidate
            >
              <h2 className="m-0 text-base font-bold text-ledger-900">Step 1 of 3 — Basic Info</h2>

              <FormField label="Tax Year" htmlFor="tax-year" required>
                <input
                  id="tax-year"
                  type="number"
                  value={taxYear}
                  onChange={(e) => setTaxYear(Number(e.target.value))}
                  className={`${inputClass()} min-h-11`}
                  min={2020}
                  max={2100}
                  required
                />
              </FormField>

              <FormField label="Taxpayer Type" htmlFor="taxpayer-type" required>
                <select
                  id="taxpayer-type"
                  value={taxpayerType}
                  onChange={(e) => setTaxpayerType(e.target.value as TaxpayerType)}
                  className={`${inputClass()} min-h-11`}
                >
                  {(Object.keys(TAXPAYER_LABEL) as TaxpayerType[]).map((t) => (
                    <option key={t} value={t}>
                      {TAXPAYER_LABEL[t]}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Accounting Method" htmlFor="accounting-method" required>
                <select
                  id="accounting-method"
                  value={accountingMethod}
                  onChange={(e) => setAccountingMethod(e.target.value as AccountingMethod)}
                  className={`${inputClass()} min-h-11`}
                >
                  <option value="ACCRUAL">Accrual</option>
                  <option value="CASH">Cash</option>
                </select>
              </FormField>

              <FormField label="Tax Year Type" htmlFor="tax-year-type" required>
                <select
                  id="tax-year-type"
                  value={taxYearType}
                  onChange={(e) => setTaxYearType(e.target.value as TaxYearType)}
                  className={`${inputClass()} min-h-11`}
                >
                  <option value="CALENDAR">Calendar year (Jan–Dec)</option>
                  <option value="FISCAL">Fiscal year</option>
                </select>
              </FormField>

              {taxYearType === 'FISCAL' && (
                <FormField label="Fiscal Year Start Month" htmlFor="fiscal-start" required>
                  <select
                    id="fiscal-start"
                    value={fiscalStartMonth}
                    onChange={(e) => setFiscalStartMonth(Number(e.target.value))}
                    className={`${inputClass()} min-h-11`}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1, 1).toLocaleDateString('en-PH', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              <button
                type="submit"
                className="mt-1 min-h-11 w-full cursor-pointer rounded-lg border-none bg-record-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-record-600"
              >
                Next
              </button>
            </form>
          )}

          {step === 2 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step2Valid) setStep(3);
              }}
              className="flex flex-col gap-4"
              noValidate
            >
              <h2 className="m-0 text-base font-bold text-ledger-900">Step 2 of 3 — Income Info</h2>

              {priorYearActual && (
                <div className="rounded-lg border border-peso-200 bg-peso-50 p-3">
                  <p className="m-0 text-sm font-semibold text-peso-700">
                    💡 Based on Your History
                  </p>
                  <p className="m-0 mt-1 text-xs text-peso-700/80">
                    Last year ({taxYear - 1}), you earned {formatAmount(priorYearActual)}. We've
                    filled this in below — adjust it if you're expecting growth or a decline.
                  </p>
                </div>
              )}

              <FormField
                label={taxpayerType === 'CORPORATION' ? 'Expected Gross Sales' : 'Expected Gross Sales / Receipts'}
                htmlFor="gross-sales"
                required
                hint="Your best estimate for the full tax year — this drives the quarterly estimates. You can update it anytime."
              >
                <input
                  id="gross-sales"
                  type="number"
                  inputMode="decimal"
                  value={expectedGrossSales}
                  onChange={(e) => {
                    setGrossSalesTouched(true);
                    setExpectedGrossSales(e.target.value);
                  }}
                  className={`${inputClass()} min-h-11`}
                  min={0}
                  step="0.01"
                  required
                />
              </FormField>

              {taxpayerType === 'MIXED_INCOME' && (
                <>
                  <FormField
                    label="Monthly Fixed Salary"
                    htmlFor="monthly-salary"
                    hint="Your compensation income, taxed separately from your business income."
                  >
                    <input
                      id="monthly-salary"
                      type="number"
                      inputMode="decimal"
                      value={monthlyFixedSalary}
                      onChange={(e) => setMonthlyFixedSalary(e.target.value)}
                      className={`${inputClass()} min-h-11`}
                      min={0}
                      step="0.01"
                    />
                  </FormField>
                  <FormField
                    label="De Minimis Benefits (annual)"
                    htmlFor="de-minimis"
                    hint="Tax-exempt up to ₱90,000/year — anything above that is added to taxable compensation."
                  >
                    <input
                      id="de-minimis"
                      type="number"
                      inputMode="decimal"
                      value={deMinimisBenefits}
                      onChange={(e) => setDeMinimisBenefits(e.target.value)}
                      className={`${inputClass()} min-h-11`}
                      min={0}
                      step="0.01"
                    />
                  </FormField>
                </>
              )}

              <FormField
                label="Deduction Method"
                htmlFor="deduction-method"
                required
                hint={
                  taxpayerType === 'CORPORATION'
                    ? 'FLAT_8 is not available to corporations.'
                    : "You can compare all options once setup is complete — this is your starting choice."
                }
              >
                <select
                  id="deduction-method"
                  value={deductionMethod}
                  onChange={(e) => setDeductionMethod(e.target.value as DeductionMethod)}
                  className={`${inputClass()} min-h-11`}
                >
                  {(Object.keys(DEDUCTION_LABEL) as DeductionMethod[])
                    .filter((m) => taxpayerType !== 'CORPORATION' || m !== 'FLAT_8')
                    .map((m) => (
                      <option key={m} value={m}>
                        {DEDUCTION_LABEL[m]}
                      </option>
                    ))}
                </select>
              </FormField>

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
                  disabled={!step2Valid}
                  className="min-h-11 flex-[2] cursor-pointer rounded-lg border-none bg-record-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-record-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
              <h2 className="m-0 text-base font-bold text-ledger-900">Step 3 of 3 — Review</h2>

              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                <dt className="text-ledger-500">Tax year</dt>
                <dd className="m-0 font-medium text-ledger-900">{taxYear}</dd>
                <dt className="text-ledger-500">Taxpayer type</dt>
                <dd className="m-0 font-medium text-ledger-900">{TAXPAYER_LABEL[taxpayerType]}</dd>
                <dt className="text-ledger-500">Accounting method</dt>
                <dd className="m-0 font-medium text-ledger-900">{accountingMethod}</dd>
                <dt className="text-ledger-500">Tax year type</dt>
                <dd className="m-0 font-medium text-ledger-900">
                  {taxYearType === 'FISCAL'
                    ? `Fiscal (from ${new Date(2000, fiscalStartMonth - 1, 1).toLocaleDateString('en-PH', { month: 'long' })})`
                    : 'Calendar'}
                </dd>
                <dt className="text-ledger-500">Expected gross sales</dt>
                <dd className="m-0 font-medium text-ledger-900">{formatAmount(expectedGrossSales || '0')}</dd>
                {taxpayerType === 'MIXED_INCOME' && monthlyFixedSalary && (
                  <>
                    <dt className="text-ledger-500">Monthly fixed salary</dt>
                    <dd className="m-0 font-medium text-ledger-900">{formatAmount(monthlyFixedSalary)}</dd>
                  </>
                )}
                <dt className="text-ledger-500">Deduction method</dt>
                <dd className="m-0 font-medium text-ledger-900">{DEDUCTION_LABEL[deductionMethod]}</dd>
              </dl>

              <p className="m-0 rounded-lg bg-ledger-50 px-3 py-2 text-xs text-ledger-500">
                Confirming will create four quarterly filing deadlines for {taxYear} and estimate the
                tax due for each based on this setup.
              </p>

              {error && (
                <p role="alert" className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-11 flex-1 cursor-pointer rounded-lg border border-ledger-200 bg-white px-4 py-2.5 text-sm font-semibold text-ledger-700 hover:bg-ledger-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex min-h-11 flex-[2] cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-record-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-record-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" aria-hidden />}
                  Confirm Setup
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
