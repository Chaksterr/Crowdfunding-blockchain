import { useEffect, useState } from 'react';
import { formatPercent, percent } from '../web3/format';

const TONES = {
  primary: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  success: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  failed: 'bg-rose-500',
  indigo: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
};

const isTestEnv =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Barre de progression accessible, calculée en bigint (plafonnée à 100).
 * La largeur est animée de 0 à la valeur au montage ; `aria-valuenow` reste
 * immédiatement exact pour les lecteurs d'écran.
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
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (isTestEnv || prefersReducedMotion()) {
      setWidth(value);
      return undefined;
    }

    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      setWidth(value);
      return undefined;
    }

    let frame = 0;
    const duration = 700;
    const start = performance.now();

    const step = (now) => {
      const elapsed = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - elapsed) ** 3;
      setWidth(value * eased);
      if (elapsed < 1) frame = window.requestAnimationFrame(step);
      else setWidth(value);
    };

    frame = window.requestAnimationFrame(step);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [value]);

  const shimmer = tone === 'primary';

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
        className={`relative h-full overflow-hidden rounded-full ${
          TONES[tone] ?? TONES.primary
        }`}
        style={{
          width: `${width}%`,
          minWidth: value > 0 ? '0.5rem' : undefined,
        }}
      >
        {shimmer ? (
          <span
            className="shimmer-primary absolute inset-0"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
