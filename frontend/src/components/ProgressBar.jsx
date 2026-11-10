import { formatPercent, percent } from '../web3/format';

const TONES = {
  primary: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  success: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  failed: 'bg-rose-500',
  indigo: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
};

/**
 * Barre de progression accessible, calculée en bigint (plafonnée à 100).
 */
export default function ProgressBar({
  raised,
  goal,
  tone = 'primary',
  label = 'Progression de la collecte',
  className = '',
}) {
  const value = percent(raised, goal);
  const rounded = Math.round(value);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
      aria-valuetext={formatPercent(raised, goal)}
      className={`h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${
          TONES[tone] ?? TONES.primary
        }`}
        style={{
          width: `${value}%`,
          minWidth: value > 0 ? '0.5rem' : undefined,
        }}
      />
    </div>
  );
}
