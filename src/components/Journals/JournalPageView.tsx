import { motion } from 'framer-motion';
import { BalanceProof, Paper, PaperFooter, PaperHeading } from './Paper';
import { formatAmount } from '@/lib/money';
import type { JournalEntry } from '@/types';

/** yyyy-mm-dd → "05 Mar 2026", the form a ledger dates its rows in. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * One page of the general journal.
 *
 * Entries are shown the way a bound journal prints them: the date and entry
 * number on the first line, each debit above its credits, and credited accounts
 * indented — the indent is the convention that tells a reader which side a line
 * is on before they reach the money columns.
 */
export function JournalPageView({
  entries,
  pageNumber,
  pageCount,
  direction,
  onSwipe,
}: {
  entries: JournalEntry[];
  pageNumber: number;
  pageCount: number;
  /** 1 when turning forward, -1 when turning back; drives which edge folds. */
  direction: number;
  /** Called when the page is dragged far enough to count as a turn. */
  onSwipe?: (delta: number) => void;
}) {
  const debitTotal = entries.reduce((sum, e) => sum + Number(e.debitTotal), 0);
  const creditTotal = entries.reduce((sum, e) => sum + Number(e.creditTotal), 0);
  const balanced = Math.round((debitTotal - creditTotal) * 100) === 0;

  const first = entries.at(0);
  const last = entries.at(-1);
  const span =
    first && last
      ? first.date === last.date
        ? shortDate(first.date)
        : `${shortDate(first.date)} – ${shortDate(last.date)}`
      : '—';

  return (
    <motion.div
      key={pageNumber}
      // The page pivots on its binding edge rather than sliding, so a turn
      // reads as paper lifting instead of a carousel advancing.
      initial={{ rotateY: direction > 0 ? -18 : 18, opacity: 0, x: direction > 0 ? 40 : -40 }}
      animate={{ rotateY: 0, opacity: 1, x: 0 }}
      exit={{ rotateY: direction > 0 ? 14 : -14, opacity: 0, x: direction > 0 ? -30 : 30 }}
      transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
      style={{ transformOrigin: direction > 0 ? 'left center' : 'right center' }}
      // Dragging the sheet sideways turns the page, as it would in a book.
      // elastic < 1 makes the page resist, so a short drag springs back rather
      // than turning by accident.
      drag={onSwipe ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      onDragEnd={(_event, info) => {
        if (!onSwipe) return;
        // Either a decisive flick or a long drag counts; velocity alone lets a
        // quick gesture work without dragging the full distance.
        const far = Math.abs(info.offset.x) > 90;
        const fast = Math.abs(info.velocity.x) > 400;
        if (!far && !fast) return;
        onSwipe(info.offset.x < 0 ? 1 : -1);
      }}
      className="cursor-grab touch-pan-y active:cursor-grabbing"
    >
      <Paper>
        <PaperHeading
          title="General Journal"
          subtitle={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} · ${span}`}
        />

        {entries.length === 0 ? (
          <p className="ledger-serif py-8 text-center text-sm text-ink-700/60 italic">
            No entries on this page.
          </p>
        ) : (
          <>
            {/* Column heads: hidden on phones, where the rows stack instead. */}
            <div className="hidden border-b border-rule-300 pb-1 text-[10px] font-bold tracking-wider text-navy-700 uppercase sm:grid sm:grid-cols-[104px_86px_1fr_112px_112px] sm:gap-2">
              <span>Date</span>
              <span>Code</span>
              <span>Particulars</span>
              <span className="text-right">Debit</span>
              <span className="text-right">Credit</span>
            </div>

            <div className="divide-y divide-rule-200">
              {entries.map((entry) => (
                <article key={entry.id} className="py-2">
                  {/* Entry head: date, reference, narration. */}
                  <div className="mb-1 flex flex-wrap items-baseline gap-x-2 sm:grid sm:grid-cols-[104px_86px_1fr_112px_112px] sm:gap-2">
                    <span className="ledger-mono whitespace-nowrap text-ink-700">{shortDate(entry.date)}</span>
                    <span className="ledger-mono text-[11px] whitespace-nowrap text-navy-700">
                      {entry.entryNumber}
                    </span>
                    <span className="ledger-serif text-[13px] text-ink-900 italic sm:col-span-3">
                      {entry.description}
                    </span>
                  </div>

                  {entry.lines.map((line) => (
                    <div
                      key={line.id}
                      className="ledger-row flex items-baseline justify-between gap-2 py-0.5 sm:grid sm:grid-cols-[104px_86px_1fr_112px_112px] sm:gap-2"
                    >
                      <span className="hidden sm:block" />
                      <span className="ledger-mono text-[12px] text-ink-700/70">
                        {line.account.code}
                      </span>
                      <span
                        className={`ledger-serif text-[13px] text-ink-900 ${
                          // Credits sit indented under their debits, as in a
                          // handwritten journal.
                          line.side === 'CREDIT' ? 'pl-4 sm:pl-6' : ''
                        }`}
                      >
                        {line.account.name}
                      </span>
                      <span className="ledger-mono shrink-0 text-right text-ink-900">
                        {line.side === 'DEBIT' ? formatAmount(line.amount) : ''}
                      </span>
                      <span className="ledger-mono hidden shrink-0 text-right text-ink-900 sm:block">
                        {line.side === 'CREDIT' ? formatAmount(line.amount) : ''}
                      </span>
                      {/* On phones there is one money column, so the side is
                          named rather than implied by position. */}
                      <span className="ledger-mono shrink-0 text-right text-[10px] text-ink-700/60 sm:hidden">
                        {line.side === 'CREDIT' ? `Cr ${formatAmount(line.amount)}` : 'Dr'}
                      </span>
                    </div>
                  ))}
                </article>
              ))}
            </div>

            <BalanceProof
              debit={formatAmount(debitTotal.toFixed(2))}
              credit={formatAmount(creditTotal.toFixed(2))}
              balanced={balanced}
            />
          </>
        )}

        <PaperFooter left={span} right={`Page ${pageNumber} of ${pageCount}`} />
      </Paper>
    </motion.div>
  );
}
