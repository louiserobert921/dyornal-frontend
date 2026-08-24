import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/** Neither timestamp on the company object is authoritative for "USED" serial
 * keys server-side — but for redirect purposes here, a company with a live
 * trial or a live subscriptionExpiresAt has access; anything else doesn't.
 * The actual server-side gate (requireActiveSubscription) is what protects
 * write endpoints; this is only about routing the user to the right screen. */
function hasAccess(company: { trialExpiresAt: string | null; subscriptionExpiresAt: string | null } | null): boolean {
  if (!company) return true; // no company yet (mid-signup) — let the page load, backend will 404 as needed
  const now = Date.now();
  const trialActive = !!company.trialExpiresAt && new Date(company.trialExpiresAt).getTime() > now;
  const subscriptionActive =
    !!company.subscriptionExpiresAt && new Date(company.subscriptionExpiresAt).getTime() > now;
  return trialActive || subscriptionActive;
}

/** Gates every app route behind a signed-in session, remembering where the
 * user was headed so login can send them back after they authenticate. Also
 * redirects to the subscription screen once trial and any redeemed serial
 * key have both lapsed — /subscription itself is exempt so an expired user
 * can still see their status and enter a new key. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, company } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ledger-50">
        <p className="text-sm text-ledger-500">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (location.pathname !== '/subscription' && !hasAccess(company)) {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
}
