const REQUIREMENTS = [
  { test: (v: string) => v.length >= 8, label: 'At least 8 characters' },
  { test: (v: string) => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: (v: string) => /[0-9]/.test(v), label: 'One number' },
  { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: 'One special character' },
];

export function passwordMeetsRequirements(password: string): boolean {
  return REQUIREMENTS.every((r) => r.test(password));
}

/** Red/yellow/green strength meter plus the specific requirements still unmet. */
export function PasswordStrength({ password }: { password: string }) {
  const metCount = REQUIREMENTS.filter((r) => r.test(password)).length;
  const level = metCount <= 1 ? 'weak' : metCount <= 3 ? 'fair' : 'strong';
  const barColor =
    level === 'weak' ? 'bg-red-500' : level === 'fair' ? 'bg-record-500' : 'bg-peso-600';
  const label = level === 'weak' ? 'Weak' : level === 'fair' ? 'Fair' : 'Strong';

  if (!password) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1">
          {REQUIREMENTS.map((_, i) => (
            <div
              key={i}
              className={`h-full flex-1 rounded-full ${i < metCount ? barColor : 'bg-ledger-100'}`}
            />
          ))}
        </div>
        <span className="text-xs font-semibold text-ledger-500">{label}</span>
      </div>
      <ul className="m-0 flex flex-col gap-0.5 pl-4 text-xs">
        {REQUIREMENTS.map((r) => (
          <li key={r.label} className={r.test(password) ? 'text-peso-700' : 'text-ledger-500'}>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
