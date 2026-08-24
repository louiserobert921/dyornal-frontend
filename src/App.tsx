import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AccountsPage } from '@/pages/AccountsPage';
import { AuditTrailPage } from '@/pages/AuditTrailPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { Dashboard } from '@/pages/Dashboard';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { JournalsPage } from '@/pages/JournalsPage';
import { LoginPage } from '@/pages/LoginPage';
import { RecordPage } from '@/pages/RecordPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SignupPage } from '@/pages/SignupPage';
import { SubscriptionPage } from '@/pages/SubscriptionPage';
import { TaxPage } from '@/pages/TaxPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="record" element={<RecordPage />} />
          <Route path="journals" element={<JournalsPage />} />
          {/* The ledger is a tab within the books rather than its own screen;
              both older paths land there so existing links keep working. */}
          <Route path="journal" element={<Navigate to="/journals" replace />} />
          <Route path="ledger" element={<Navigate to="/journals" replace />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="audit-trail" element={<AuditTrailPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="tax/*" element={<TaxPage />} />
          <Route path="settings/*" element={<SettingsPage />} />
          {/* Older single-word path some phases referenced. */}
          <Route path="business" element={<Navigate to="/settings/business" replace />} />
          <Route path="audit" element={<Navigate to="/audit-trail" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
