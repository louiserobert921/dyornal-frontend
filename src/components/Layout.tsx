import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Calculator,
  ChevronDown,
  ContactRound,
  LayoutDashboard,
  Menu,
  NotebookPen,
  Receipt,
  ScrollText,
  Settings,
  Wallet,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TaxFilterBanner } from '@/components/TaxFilterBanner';

/** The 5 items a user needs to stay audit-ready day to day. */
const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/journals', label: 'Journals', icon: BookOpen },
  { to: '/audit-trail', label: 'Audit Trail', icon: ScrollText },
  { to: '/tax', label: 'Tax', icon: Calculator },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/** Everything else still lives here — just tucked under a collapsed
 * disclosure instead of taking a permanent slot in the primary nav. */
const MORE_NAV = [
  { to: '/reports', label: 'Reports', icon: Receipt },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/contacts', label: 'Contacts', icon: ContactRound },
];

/** Each item reads as a manila folder tab hanging off the shelf's left edge:
 * flat and cream at rest, pulled forward with a shadow on hover, and pushed
 * fully forward with a navy fill when it's the active section. */
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `group relative flex items-center gap-3 rounded-r-lg rounded-l-sm border border-rule-300/60 px-4 py-2.5 text-sm font-semibold no-underline transition-all duration-200 ease-out ${
    isActive
      ? 'translate-x-1.5 border-peso-700 bg-peso-600 text-white shadow-[0_6px_16px_rgb(0,0,0,0.2)]'
      : 'bg-paper-50 text-peso-700 shadow-[0_1px_2px_rgb(0,0,0,0.06)] hover:translate-x-1 hover:bg-paper-100 hover:shadow-[0_4px_12px_rgb(0,0,0,0.15)]'
  }`;

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <img src="/favicon.svg" alt="" width={32} height={32} className="shrink-0 rounded-[7px]" />
      <div>
        <span className="text-lg font-bold text-peso-600">Dyornal</span>
        <p className="text-[11px] font-medium tracking-wide text-ledger-500 uppercase">
          Bookkeeping
        </p>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(() => MORE_NAV.some((item) => pathname.startsWith(item.to)));

  return (
    <nav className="flex flex-col gap-2 px-3">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate} className={linkClass}>
          <Icon size={17} aria-hidden />
          {label}
        </NavLink>
      ))}

      <button
        type="button"
        onClick={() => setMoreOpen((v) => !v)}
        aria-expanded={moreOpen}
        className="group relative flex cursor-pointer items-center gap-3 rounded-r-lg rounded-l-sm border border-rule-300/60 bg-paper-50 px-4 py-2.5 text-sm font-semibold text-peso-700 shadow-[0_1px_2px_rgb(0,0,0,0.06)] transition-all duration-200 ease-out hover:translate-x-1 hover:bg-paper-100 hover:shadow-[0_4px_12px_rgb(0,0,0,0.15)]"
      >
        <ChevronDown
          size={17}
          aria-hidden
          className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
        />
        More
      </button>

      {moreOpen && (
        <div className="ml-2 flex flex-col gap-2 border-l border-rule-300/60 pl-2">
          {MORE_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={onNavigate} className={linkClass}>
              <Icon size={17} aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}

/** The pen-and-paper Record button: a mobile-only FAB, since desktop already
 * has the large Record CTA on the Dashboard — a second copy in the sidebar
 * read as redundant right next to it. */
function RecordButton() {
  return (
    <NavLink
      to="/record"
      aria-label="Record new transaction (Alt+R)"
      title="Record Transaction (Alt+R)"
      className={({ isActive }) =>
        `group animate-record-pulse relative z-[999] flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-none text-white no-underline shadow-[0_6px_16px_rgb(254,95,7,0.35)] transition-transform duration-200 ease-out hover:scale-110 hover:shadow-[0_10px_24px_rgb(254,95,7,0.5)] active:scale-95 ${
          isActive ? 'bg-record-600' : 'bg-record-500 hover:bg-record-600'
        }`
      }
    >
      <NotebookPen
        size={28}
        aria-hidden
        className="transition-transform duration-200 ease-out group-hover:-rotate-6"
      />
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-ledger-900 px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        Record (Alt+R)
      </span>
    </NavLink>
  );
}

/** App shell: sidebar on desktop, a hamburger drawer on phones. */
export function Layout() {
  // Keying the boundary by route clears a caught error when the user
  // navigates away, rather than stranding them on the fallback.
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        navigate('/record');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-ledger-50 md:flex-row">
      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div className="no-print flex items-center justify-between border-b border-rule-300 bg-paper-50 px-4 py-3 md:hidden">
        <span className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" width={26} height={26} className="rounded-[6px]" />
          <span className="text-lg font-bold text-peso-600">Dyornal</span>
        </span>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="flex cursor-pointer items-center justify-center rounded-lg border-none bg-transparent p-2 text-ledger-700 hover:bg-ledger-100"
        >
          <Menu size={22} aria-hidden />
        </button>
      </div>

      {/* ── Mobile drawer ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-72 max-w-[80vw] flex-col bg-paper-50 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="mr-4 cursor-pointer rounded-lg border-none bg-transparent p-2 text-ledger-500 hover:bg-ledger-100"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
              <NavLinks onNavigate={() => setMenuOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar: a cream folder shelf with a tan depth edge ─── */}
      <aside className="no-print relative hidden shrink-0 border-r border-rule-300 bg-paper-50 md:flex md:w-64 md:flex-col before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-rule-300">
        <Brand />
        <NavLinks />
      </aside>

      {/* ── Mobile Record FAB ─────────────────────────────────────────── */}
      <div className="no-print fixed right-4 bottom-4 z-40 md:hidden">
        <RecordButton />
      </div>

      <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8 print:p-0">
        <TaxFilterBanner />
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
