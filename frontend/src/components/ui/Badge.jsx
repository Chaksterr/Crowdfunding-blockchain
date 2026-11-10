import { STATUS } from '../../web3/contracts';

const TONES = {
  neutral: {
    chip: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-400',
  },
  indigo: {
    chip: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
    dot: 'bg-indigo-500',
  },
  ongoing: {
    chip: 'bg-amber-100 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
  },
  success: {
    chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  failed: {
    chip: 'bg-rose-100 text-rose-800 ring-rose-200',
    dot: 'bg-rose-500',
  },
};

const STATUS_TONES = {
  0: 'ongoing',
  1: 'failed',
  2: 'success',
};

/**
 * Badge d'état. Passer `status` (0/1/2) pour un badge de campagne,
 * ou `tone` pour un badge libre.
 */
export default function Badge({
  status,
  tone,
  dot = true,
  className = '',
  children,
}) {
  const hasStatus = status !== undefined && status !== null;
  const resolvedTone = hasStatus ? STATUS_TONES[status] ?? 'neutral' : tone ?? 'neutral';
  const style = TONES[resolvedTone] ?? TONES.neutral;
  const label = children ?? (hasStatus ? STATUS[status] : null);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.chip} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}
