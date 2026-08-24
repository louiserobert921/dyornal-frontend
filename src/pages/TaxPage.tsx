import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Bell, Calculator, CalendarClock, Settings2 } from 'lucide-react';
import { PageHeading } from '@/components/Card';
import { TaxAnalysisPage } from '@/pages/TaxAnalysisPage';
import { TaxFilingCalendar } from '@/pages/TaxFilingCalendar';
import { TaxNotificationPreferencesPage } from '@/pages/TaxNotificationPreferences';
import { TaxSetupWizard } from '@/pages/TaxSetupWizard';

const MENU = [
  { to: '/tax/analysis', label: 'Analysis', icon: Calculator },
  { to: '/tax/filings', label: 'Filing Calendar', icon: CalendarClock },
  { to: '/tax/setup', label: 'Setup', icon: Settings2 },
  { to: '/tax/notifications', label: 'Notifications', icon: Bell },
] as const;

/** The tax module's hub: same sub-nav-plus-routes shape as Settings. */
export function TaxPage() {
  const location = useLocation();

  return (
    <div>
      <PageHeading title="Tax" />

      <div className="flex flex-col gap-4 md:flex-row">
        <nav
          aria-label="Tax"
          className="flex gap-1 overflow-x-auto md:w-48 md:shrink-0 md:flex-col md:overflow-visible"
        >
          {MENU.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium no-underline ${
                  active
                    ? 'bg-peso-50 text-peso-700'
                    : 'text-ledger-500 hover:bg-ledger-100 hover:text-ledger-900'
                }`}
              >
                <Icon size={16} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          <Routes>
            <Route index element={<Navigate to="analysis" replace />} />
            <Route path="analysis" element={<TaxAnalysisPage />} />
            <Route path="filings" element={<TaxFilingCalendar />} />
            <Route path="setup" element={<TaxSetupWizard />} />
            <Route path="notifications" element={<TaxNotificationPreferencesPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
