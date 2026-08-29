/** Shared domain types. Kept in one place so the API client and the pages agree. */

/** Philippine double-entry account classifications. */
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  description: string | null;
  parentId: string | null;
  isSystem: boolean;
  isActive: boolean;
  /** Money crosses the wire as a fixed-2 string; parse only to display. */
  debitTotal: string;
  creditTotal: string;
  balance: string;
}

/** One side of a journal entry. Debits and credits must balance per entry. */
export interface JournalLine {
  id: string;
  side: 'DEBIT' | 'CREDIT';
  amount: string;
  description?: string | null;
  account: Pick<Account, 'id' | 'code' | 'name' | 'type'>;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  transactionId?: string | null;
  debitTotal: string;
  creditTotal: string;
  isBalanced: boolean;
  lines: JournalLine[];
}

export interface Company {
  id: string;
  name: string;
  tin: string | null;
  ownerName: string | null;
  fiscalYearStart: number;
}

/** The eight events the record form offers, grouped by direction on step 1. */
export type TransactionKind =
  | 'SALES'
  | 'SERVICE_INCOME'
  | 'LOAN_RECEIVED'
  | 'EQUIPMENT_PURCHASE'
  | 'INVENTORY_PURCHASE'
  | 'EXPENSE'
  | 'LOAN_PAYMENT'
  | 'INTEREST';

/** Describes one option on step 1; served by GET /api/transactions/kinds. */
export interface KindOption {
  kind: TransactionKind;
  label: string;
  direction: 'INFLOW' | 'OUTFLOW';
  hint: string;
  /** False for loans and interest, which hide the VAT field entirely. */
  supportsVat: boolean;
  /** False when the event is always cash, which hides the paid/unpaid toggle. */
  supportsCredit: boolean;
  counterparty: 'CUSTOMER' | 'SUPPLIER' | null;
  /**
   * Which account type and code range this kind lets the user choose an
   * account within, or null when there is no choice (loan principal
   * movements always hit Loans Payable).
   */
  category: { accountType: AccountType; rangeStart: number; rangeEnd: number; label: string } | null;
  /** Which pool of open transactions the form must let the user pick from before this kind can be submitted. */
  appliedToPool: 'CUSTOMER' | 'SUPPLIER' | 'LOAN' | null;
}

/** One open invoice, bill, or loan — a candidate for a payment to settle. */
export interface OpenTransaction {
  id: string;
  date: string;
  invoiceNumber: string | null;
  counterpartyName: string | null;
  description: string | null;
  totalAmount: string;
  outstanding: string;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  type: string;
  date: string;
  invoiceNumber: string | null;
  counterpartyName: string | null;
  description: string | null;
  netAmount: string;
  vatAmount: string;
  totalAmount: string;
  isPaid: boolean;
}

/** What POST /api/transactions returns: the record plus the entry it posted. */
export interface RecordedTransaction {
  transaction: Transaction;
  journalEntry: JournalEntry;
}

/** What POST /api/transactions/import-sales returns: a per-row outcome, since
 * one bad row in a sheet must not block the rows around it. */
export interface ImportSalesResult {
  imported: number;
  failed: number;
  results: Array<{ row: number; success: true; transactionId: string; entryNumber: string }>;
  errors: Array<{ row: number; message: string }>;
}

/** Envelope every list endpoint uses. */
export interface ListResponse<T> {
  data: T[];
  meta?: { total: number; limit: number; offset: number; vatRate?: number };
}

export interface ItemResponse<T> {
  data: T;
}

/* ── Ledger views ─────────────────────────────────────────────────────────── */

/** One posting in the general ledger, with the balance after it. */
export interface LedgerRow {
  lineId: string;
  entryId: string;
  entryNumber: string;
  date: string;
  description: string;
  debit: string | null;
  credit: string | null;
  balance: string;
}

/** One account's ledger: its postings plus opening and closing balances. */
export interface LedgerAccount {
  account: Pick<Account, 'id' | 'code' | 'name' | 'type'>;
  openingBalance: string;
  debitTotal: string;
  creditTotal: string;
  closingBalance: string;
  rows: LedgerRow[];
}

/** How much of a party's balance sits in each age band. */
export interface Aging {
  current: string;
  d30: string;
  d60: string;
  d90: string;
}

export interface SubsidiaryRow {
  entryId: string;
  entryNumber: string;
  date: string;
  description: string;
  invoiceNumber: string | null;
  charged: string | null;
  settled: string | null;
  balance: string;
}

/** One customer or supplier in the subsidiary ledger. */
export interface SubsidiaryParty {
  name: string;
  charged: string;
  settled: string;
  outstanding: string;
  aging: Aging;
  rows: SubsidiaryRow[];
}

export interface SubsidiaryResponse {
  control: Pick<Account, 'id' | 'code' | 'name' | 'type'>;
  data: SubsidiaryParty[];
  totals: Aging & { outstanding: string };
  meta: { kind: 'AR' | 'AP'; asOf: string };
}

/* ── Financial reports ────────────────────────────────────────────────────── */

export interface ReportMeta {
  company: { name: string; tin: string | null };
  title?: string;
  asOf?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportLine {
  code: string;
  name: string;
  amount: string;
  percentOfRevenue?: number | null;
  /** True for figures computed rather than read from a posted balance. */
  derived?: boolean;
}

interface Section {
  items: ReportLine[];
  total: string;
}

export interface BalanceSheet {
  meta: ReportMeta;
  assets: { current: Section; fixed: Section; total: string };
  liabilities: { current: Section; longTerm: Section; total: string };
  equity: Section;
  check: {
    assets: string;
    liabilitiesAndEquity: string;
    difference: string;
    balanced: boolean;
  };
}

export interface IncomeStatement {
  meta: ReportMeta & { comparative: { dateFrom: string; dateTo: string } | null };
  revenue: Section;
  costOfGoodsSold: Section & { percentOfRevenue: number | null; note: string };
  grossProfit: { total: string; percentOfRevenue: number | null };
  operatingExpenses: Section & { percentOfRevenue: number | null };
  operatingIncome: { total: string; percentOfRevenue: number | null };
  otherExpenses: Section;
  netIncome: { total: string; percentOfRevenue: number | null };
  comparative: {
    revenue: string;
    grossProfit: string;
    operatingExpenses: string;
    netIncome: string;
    revenueGrowth: number | null;
    netIncomeGrowth: number | null;
  } | null;
}

export interface CashFlow {
  meta: ReportMeta & { method: string };
  operating: { items: { label: string; amount: string }[]; total: string };
  investing: { items: { label: string; amount: string }[]; total: string };
  financing: { items: { label: string; amount: string }[]; total: string };
  summary: {
    netChange: string;
    cashOpening: string;
    cashClosing: string;
    actualChange: string;
    unexplained: string;
    reconciled: boolean;
  };
}

export interface TrialBalance {
  meta: ReportMeta;
  accounts: {
    code: string;
    name: string;
    type: AccountType;
    debit: string | null;
    credit: string | null;
  }[];
  totals: { debit: string; credit: string; difference: string; balanced: boolean };
}

export interface FriendlyKpiValue {
  value: number | null;
  trend: 'up' | 'down' | 'neutral';
}

export interface FriendlyKpis {
  netMargin: FriendlyKpiValue;
  daysToCollect: FriendlyKpiValue;
  currentRatio: FriendlyKpiValue;
  returnOnEquity: FriendlyKpiValue;
  debtToEquity: FriendlyKpiValue;
  healthScores: {
    profitabilityScore: number | null;
    cashHealthScore: number | null;
    stabilityScore: number | null;
  };
}

export interface Kpis {
  meta: ReportMeta;
  headline: {
    revenue: string;
    expenses: string;
    netIncome: string;
    cash: string;
    receivables: string;
    payables: string;
  };
  /** Null wherever the denominator was zero — undefined, not infinite. */
  ratios: Record<string, number | null>;
  /** The 5-metric, plain-English dashboard shown in place of the full ratio panel. */
  friendlyKpis: FriendlyKpis;
  series: { month: string; revenue: string; expenses: string; netIncome: string; cash: string }[];
  expenseBreakdown: { code: string; name: string; amount: string }[];
}

export interface Forecast {
  meta: ReportMeta & {
    monthsProjected: number;
    monthsOfHistory: number;
    basis: string;
    caveat: string;
  };
  history: { month: string; revenue: number; expenses: number; netIncome: number; cash: number }[];
  forecast: Record<
    'revenue' | 'expenses' | 'netIncome' | 'cash',
    { average: number; confidence: number; points: { month: string; value: number }[] }
  >;
}

/* ── Admin ────────────────────────────────────────────────────────────────── */

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  reason: string | null;
  summary: string;
}

/* ── Transaction dependencies & impact (audit trail flowchart) ──────────── */

export interface TransactionDependencies {
  transaction: {
    id: string;
    type: string;
    date: string;
    invoiceNumber: string | null;
    netAmount: string;
    vatAmount: string;
    totalAmount: string;
  };
  journalEntries: {
    id: string;
    entryNumber: string;
    description: string;
    lines: { id: string; side: 'DEBIT' | 'CREDIT'; amount: string; account: Pick<Account, 'id' | 'code' | 'name' | 'type'> }[];
  }[];
  appliedTo: {
    id: string;
    type: string;
    date: string;
    invoiceNumber: string | null;
    totalAmount: string;
  } | null;
  settlements: {
    id: string;
    type: string;
    date: string;
    invoiceNumber: string | null;
    totalAmount: string;
  }[];
  outstanding: string;
  isSettled: boolean;
}

type ReportImpactLine = { accountCode: string; accountName: string; side: 'DEBIT' | 'CREDIT'; amount: string };

/**
 * What deleting a transaction will do, computed before anything is actually
 * removed — never a refusal. `canDelete` is always true; the API keeps the
 * field only so older callers reading it do not break.
 */
export interface TransactionImpact {
  canDelete: true;
  /** Informational, not blocking — a payment applied, an old date, and so on. */
  warnings: string[];
  cascade: {
    journalEntries: number;
    journalLines: number;
    settlements: {
      id: string;
      type: string;
      invoiceNumber: string | null;
      totalAmount: string;
      journalLines: number;
      reportImpact: ReportImpactLine[];
    }[];
    /** The customer or supplier this transaction names, if any. */
    counterparty: { name: string; kind: 'CUSTOMER' | 'SUPPLIER'; remainsAfterDelete: boolean } | null;
  };
  reportImpact: ReportImpactLine[];
}

export interface TransactionEditResult {
  transaction: {
    id: string;
    type: string;
    date: string;
    invoiceNumber: string | null;
    counterpartyName: string | null;
    description: string | null;
    netAmount: string;
    vatAmount: string;
    totalAmount: string;
  };
  journalEntry: JournalEntry;
  glImpact: { accountCode: string; accountName: string; before: string; after: string }[];
}

export interface Contact {
  name: string;
  transactionCount: number;
  lastTransactionDate: string;
  outstanding: string;
  aging: Aging;
}

export interface ContactHistoryEntry {
  id: string;
  type: string;
  date: string;
  invoiceNumber: string | null;
  description: string | null;
  netAmount: string;
  vatAmount: string;
  totalAmount: string;
  journalEntries: { id: string; entryNumber: string }[];
}

/** The full company record, including fields not on the list-view summary. */
export interface CompanyDetail extends Company {
  address: string | null;
  phone: string | null;
  email: string | null;
  establishedDate: string | null;
  createdAt: string;
}

export interface YesterdayEntry {
  id: string;
  type: string;
  date: string;
  description: string | null;
  invoiceNumber: string | null;
  counterpartyName: string | null;
  totalAmount: string;
}

export interface YesterdaySummary {
  date: string;
  transactionCount: number;
  totalInflow: string;
  totalOutflow: string;
  netImpact: string;
  glBalance: string;
  byType: Record<string, number>;
  recentEntries: YesterdayEntry[];
  todayPendingCount: number;
}

// ── Tax ───────────────────────────────────────────────────────────────────

export type TaxpayerType = 'SOLE_PROP' | 'CORPORATION' | 'MIXED_INCOME';
export type AccountingMethod = 'ACCRUAL' | 'CASH';
export type TaxYearType = 'CALENDAR' | 'FISCAL';
export type DeductionMethod = 'OSD_40' | 'ITEMIZED' | 'FLAT_8';
export type TaxConfigStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type DeductionCategory =
  | 'RENT'
  | 'SALARIES'
  | 'UTILITIES'
  | 'INSURANCE'
  | 'SUPPLIES'
  | 'DEPRECIATION'
  | 'PROFESSIONAL_FEES'
  | 'OTHER';
export type FilingType = 'Q1' | 'Q2' | 'Q3' | 'Q4_ANNUAL';
export type FilingStatus = 'PENDING' | 'FILED' | 'LATE' | 'OVERDUE';
export type TaxDocumentType = 'EBIR_FORM' | 'EMAIL_RECEIPT' | 'PAYMENT_PROOF';
export type UploadStatus = 'UPLOADED' | 'VERIFIED' | 'REJECTED';

export interface TaxConfiguration {
  id: string;
  companyId: string;
  taxYear: number;
  taxpayerType: TaxpayerType;
  accountingMethod: AccountingMethod;
  taxYearType: TaxYearType;
  fiscalStartMonth: number | null;
  deductionMethod: DeductionMethod;
  isDeductionMethodLocked: boolean;
  expectedGrossSales: string;
  monthlyFixedSalary: string | null;
  deMinimisBenefits: string | null;
  status: TaxConfigStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaxDeduction {
  id: string;
  configurationId: string;
  category: DeductionCategory;
  description: string;
  estimatedAmount: string;
  actualAmount: string | null;
  isManualEntry: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxBreakdownStep {
  label: string;
  value: string;
  note?: string;
}

export interface TaxBreakdown {
  method: string;
  steps: TaxBreakdownStep[];
  summary: string;
}

export interface TaxWaterfallStep {
  name: string;
  value: number;
  type: 'positive' | 'negative' | 'total';
  cumulative: number;
  description: string;
}

export interface TaxResult {
  method: DeductionMethod;
  grossSales: string;
  deduction: string;
  taxableIncome: string;
  taxDue: string;
  marginalRate: number;
  effectiveRate: number;
  eligible: boolean;
  breakdown: TaxBreakdown;
  waterfall: TaxWaterfallStep[];
}

export interface MethodComparison extends TaxResult {
  savingsVsCurrent: string;
}

export interface MixedIncomeTaxResult {
  annualSalary: string;
  excessDeMinimis: string;
  taxableCompensation: string;
  salaryTax: string;
  salaryMarginalRate: number;
  salaryBreakdown: TaxBreakdown;
  salaryWaterfall: TaxWaterfallStep[];
  business: TaxResult;
  totalTaxDue: string;
  summary: string;
}

export interface IncorporationAnalysis {
  shouldIncorporate: boolean;
  currentSolePropTax: string;
  corporateTaxIfIncorporated: string;
  savingsIfIncorporated: string;
  breakEvenGrossSales: string | null;
  summary: string;
  recommendation: string;
  currentSetupBreakdown: TaxBreakdown;
  ifIncorporatedBreakdown: TaxBreakdown;
  currentSetupWaterfall: TaxWaterfallStep[];
  ifIncorporatedWaterfall: TaxWaterfallStep[];
}

export interface YtdTaxProjection {
  baselineExpected: string;
  actualYTD: string;
  monthsOfData: number;
  projectedAnnual: string;
  breakdown: TaxBreakdown;
}

export interface TaxAnalysis {
  currentChoice: TaxResult | MixedIncomeTaxResult;
  allOptions: MethodComparison[];
  recommendation: DeductionMethod | null;
  reason: string | null;
  incorporationAnalysis: IncorporationAnalysis | null;
  ytdProjection: YtdTaxProjection | null;
}

export interface QuarterlyTaxAnalysis {
  quarter: 1 | 2 | 3 | 4;
  taxYear: number;
  periodStart: string;
  periodEnd: string;
  grossSales: string;
  deductionMethod: DeductionMethod;
  result: TaxResult | MixedIncomeTaxResult;
}

export interface QuarterlyTaxProjection {
  quarter: 1 | 2 | 3 | 4;
  taxYear: number;
  quarterGrossSales: string;
  projectedAnnualGrossSales: string;
  quarterItemizedDeductions: string;
  currentChoice: TaxResult | MixedIncomeTaxResult;
  allOptions: MethodComparison[];
  recommendation: DeductionMethod | null;
  reason: string | null;
  incorporationAnalysis: IncorporationAnalysis | null;
}

export interface QuarterlyTaxAnalysisAll {
  taxYear: number;
  deductionMethod: DeductionMethod;
  quarters: Array<{
    quarter: 1 | 2 | 3 | 4;
    periodStart: string;
    periodEnd: string;
    grossSales: string;
    result: TaxResult | MixedIncomeTaxResult;
  }>;
}

export interface TaxFileUpload {
  id: string;
  filingId: string;
  documentType: TaxDocumentType;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  status: UploadStatus;
  notes: string | null;
}

export interface TaxFiling {
  id: string;
  configurationId: string;
  filingType: FilingType;
  taxYear: number;
  quarter: number;
  dueDate: string;
  filingDate: string | null;
  status: FilingStatus;
  estimatedTaxDue: string;
  actualTaxPaid: string | null;
  taxForm: string;
  notes: string | null;
  documentsUploaded: number;
  documentsTotal: number;
  uploads: Pick<TaxFileUpload, 'id' | 'documentType' | 'status'>[];
}

export interface TaxNotificationPreference {
  id: string;
  companyId: string;
  emailReminder: boolean;
  smsReminder: boolean;
  pushNotification: boolean;
  reminderDays: number[];
  createdAt: string;
  updatedAt: string;
}

// ── Payroll ──────────────────────────────────────────────────────────────────

export type EmploymentStatus = 'PERMANENT' | 'CONTRACTUAL' | 'CASUAL';
export type TaxStatus = 'OPTIONAL' | 'MANDATORY';

export interface Employee {
  id: string;
  companyId: string;
  name: string;
  position: string | null;
  employmentStatus: EmploymentStatus;
  basicMonthlyPay: string;
  allowances: string;
  /** basicMonthlyPay + allowances, computed by the API — never sent by the client. */
  grossMonthlyCompensation: string;
  taxStatus: TaxStatus;
  tin: string | null;
  effectiveDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalGrossCompensation: string;
}

export interface ImportPayrollResult {
  imported: number;
  failed: number;
  errors: { row: number; message: string }[];
}

// ── Business Compliance ─────────────────────────────────────────────────────

export type ComplianceDocType = 'GIS' | 'BYLAWS' | 'AOI' | 'AUDITED_FINANCIALS' | 'OTHER';
export type ComplianceFilingType = 'Q1' | 'Q2' | 'Q3' | 'ANNUAL';

export interface ComplianceDocument {
  id: string;
  companyId: string;
  documentType: ComplianceDocType;
  filingType: ComplianceFilingType | null;
  taxYear: number;
  fileName: string;
  fileUrl: string;
  notes: string | null;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ComplianceStatus {
  latestGis: { taxYear: number; filingType: ComplianceFilingType; uploadedAt: string } | null;
  bylawsUploaded: boolean;
  aoiUploaded: boolean;
  nextDeadline: { filingType: ComplianceFilingType; taxYear: number; dueDate: string; daysUntil: number } | null;
}

// ── Product Turnover (POS import) ───────────────────────────────────────────

export type TurnoverRank = 'HIGH' | 'MID' | 'LOW';
export type ConsistencyRating = 'STABLE' | 'MODERATE' | 'VARIABLE';

export interface ProductTurnoverItem {
  menuItemName: string;
  dailyQty: number;
  weeklyQty: number;
  monthlyQty: number;
  dailySales: string;
  weeklySales: string;
  monthlySales: string;
  turnoverRank: TurnoverRank;
  consistency: ConsistencyRating | null;
}

export interface ProductTurnoverReport {
  meta: {
    company: { name: string; tin: string | null };
    dateFrom: string;
    dateTo: string;
    weeksOfData: number;
  };
  items: ProductTurnoverItem[];
}

export interface ImportMenuSalesResult {
  imported: number;
  failed: number;
  errors: { row: number; message: string }[];
  replacedDateRange: { from: string; to: string } | null;
}
