import { formatPercent, percent } from '../web3/format';

const TONES = {
  indigo: 'bg-indigo-600',
  success: 'bg-emerald-500',
  failed: 'bg-rose-500',
};

/**
 * Barre de progression accessible, calculée en bigint (plafonnée à 100).
 */
export default function ProgressBar({
  raised,
  goal,
  tone = 'indigo',
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
      className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${
          TONES[tone] ?? TONES.indigo
        }`}
        style={{
          width: `${value}%`,
          minWidth: value > 0 ? '0.5rem' : undefined,
        }}
      />
    </div>
  );
}
