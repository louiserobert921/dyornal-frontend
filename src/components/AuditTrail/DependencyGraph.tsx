import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { formatAmount } from '@/lib/money';
import type { TransactionDependencies } from '@/types';

let initialized = false;
function ensureMermaid() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#eef3f9',
      primaryBorderColor: '#002b5f',
      primaryTextColor: '#0f172a',
      lineColor: '#64748b',
      fontFamily: 'inherit',
      fontSize: '13px',
    },
    flowchart: { curve: 'basis', padding: 12 },
  });
  initialized = true;
}

/** Escapes text that goes inside a Mermaid node label. */
function esc(text: string): string {
  return text.replace(/"/g, '#quot;').replace(/\n/g, ' ');
}

/**
 * Builds the Mermaid source for one transaction's dependency graph: the
 * transaction itself, the journal lines it posted, and any payment it applies
 * to or has applied against it.
 *
 * Static and read-only — nodes are not draggable and the diagram cannot be
 * exported as an image; it renders the same dependency data the timeline
 * panel already has, just as a picture instead of a list.
 */
function buildGraph(dep: TransactionDependencies): string {
  const lines: string[] = ['graph TD'];
  const t = dep.transaction;

  lines.push(`  TXN["${esc(t.invoiceNumber ? `#${t.invoiceNumber}` : t.type)}<br/>${esc(formatAmount(t.totalAmount))}"]`);
  lines.push(`  class TXN txn`);

  for (const entry of dep.journalEntries) {
    const entryId = `JE_${entry.id.slice(-6)}`;
    lines.push(`  ${entryId}["${esc(entry.entryNumber)}"]`);
    lines.push(`  class ${entryId} je`);
    lines.push(`  TXN -->|posts| ${entryId}`);
    for (const line of entry.lines) {
      const lineId = `L_${line.id.slice(-6)}`;
      lines.push(
        `  ${lineId}["${esc(line.account.code)} ${esc(line.account.name)}<br/>${line.side === 'DEBIT' ? 'Dr' : 'Cr'} ${esc(formatAmount(line.amount))}"]`,
      );
      lines.push(`  class ${lineId} ${line.side === 'DEBIT' ? 'debit' : 'credit'}`);
      lines.push(`  ${entryId} --> ${lineId}`);
    }
  }

  if (dep.appliedTo) {
    const invId = `APPLIED`;
    lines.push(`  ${invId}["${esc(dep.appliedTo.invoiceNumber ? `#${dep.appliedTo.invoiceNumber}` : 'Invoice')}<br/>${esc(formatAmount(dep.appliedTo.totalAmount))}"]`);
    lines.push(`  class ${invId} sibling`);
    lines.push(`  TXN -->|settles| ${invId}`);
  }

  if (dep.settlements.length > 0) {
    for (const [i, s] of dep.settlements.entries()) {
      const id = `PAY_${i}`;
      lines.push(`  ${id}["${esc(s.invoiceNumber ? `#${s.invoiceNumber}` : 'Payment')}<br/>${esc(formatAmount(s.totalAmount))}"]`);
      lines.push(`  class ${id} ${dep.isSettled ? 'sibling' : 'warning'}`);
      lines.push(`  ${id} -->|paid by| TXN`);
    }
    if (Number(dep.outstanding) > 0) {
      lines.push(`  OUT["Outstanding<br/>${esc(formatAmount(dep.outstanding))}"]`);
      lines.push(`  class OUT warning`);
      lines.push(`  TXN -->|affects B/S| OUT`);
    }
  }

  lines.push('  classDef txn fill:#002b5f,color:#ffffff,stroke:#002b5f,stroke-width:2px');
  lines.push('  classDef je fill:#eef3f9,color:#0f172a,stroke:#002b5f');
  lines.push('  classDef debit fill:#ffffff,color:#0f172a,stroke:#002b5f,stroke-dasharray: 0');
  lines.push('  classDef credit fill:#ffffff,color:#0f172a,stroke:#fe5f07,stroke-dasharray: 0');
  lines.push('  classDef sibling fill:#ffe0cc,color:#0f172a,stroke:#fe5f07');
  lines.push('  classDef warning fill:#fff1e8,color:#b83f00,stroke:#fe5f07,stroke-width:2px');

  return lines.join('\n');
}

export function DependencyGraph({ dependencies }: { dependencies: TransactionDependencies | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    if (!dependencies || !containerRef.current) return;
    ensureMermaid();
    setError(null);

    const graphId = `dep-graph-${uid}`;
    const source = buildGraph(dependencies);

    let cancelled = false;
    mermaid
      .render(graphId, source)
      .then(({ svg }) => {
        if (!cancelled && containerRef.current) containerRef.current.innerHTML = svg;
      })
      .catch(() => {
        if (!cancelled) setError('Could not render the diagram for this entry.');
      });

    return () => {
      cancelled = true;
    };
  }, [dependencies, uid]);

  if (!dependencies) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-ledger-500">
        Select an entry from the timeline to see how it connects to the ledger.
      </div>
    );
  }

  if (error) {
    return <p className="p-4 text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="overflow-auto p-4">
      <div ref={containerRef} className="[&_svg]:max-w-none" />
      {dependencies.settlements.length > 0 && Number(dependencies.outstanding) > 0 && (
        <p className="mt-3 rounded-lg bg-record-50 px-3 py-2 text-xs font-medium text-record-700">
          Underpaid by {formatAmount(dependencies.outstanding)} — this invoice still has a balance
          after the payment(s) shown above.
        </p>
      )}
    </div>
  );
}
