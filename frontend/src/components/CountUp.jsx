import { useEffect, useRef, useState } from 'react';

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
 * Anime une valeur numérique de 0 à sa valeur cible.
 *
 * La valeur finale est affichée immédiatement (aucune animation) quand le
 * mouvement est réduit ou dans un environnement de test, pour que le montant
 * annoncé soit toujours disponible sans attendre.
 *
 * @param {number} value Valeur cible.
 * @param {(value: number) => string} format Formateur (ex. formatEth).
 * @param {{duration?: number, className?: string, suffix?: string}} options
 */
export default function CountUp({
  value,
  format,
  duration = 700,
  className = '',
  suffix = '',
}) {
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [display, setDisplay] = useState(target);
  const frameRef = useRef(0);

  useEffect(() => {
    if (isTestEnv || prefersReducedMotion()) {
      setDisplay(target);
      return undefined;
    }

    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      setDisplay(target);
      return undefined;
    }

    const start = performance.now();

    const step = (now) => {
      const elapsed = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - elapsed) ** 3;
      setDisplay(target * eased);
      if (elapsed < 1) frameRef.current = window.requestAnimationFrame(step);
      else setDisplay(target);
    };

    frameRef.current = window.requestAnimationFrame(step);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  const formatted = format ? format(display) : String(display);

  return (
    <span className={`tabular-nums ${className}`}>
      {formatted}
      {suffix}
    </span>
  );
}
