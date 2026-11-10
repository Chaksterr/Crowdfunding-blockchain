import { useEffect, useState } from 'react';
import { timeLeftLabel } from '../web3/format';

const isTestEnv =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

const TICK_MS = 30_000;

function secondsUntil(deadline) {
  try {
    return Math.max(0, Number(deadline) - Math.floor(Date.now() / 1000));
  } catch {
    return 0;
  }
}

/**
 * Compte à rebours vivant : le temps restant est recalculé au moins toutes
 * les 30 secondes. Sous NODE_ENV=test le minuteur est désactivé afin que les
 * tests restent déterministes (la valeur initiale reste identique).
 *
 * @param {{deadline: number|bigint|string, className?: string, suffix?: string}} props
 */
export default function Countdown({
  deadline,
  className = '',
  suffix = '',
}) {
  const [seconds, setSeconds] = useState(() => secondsUntil(deadline));

  useEffect(() => {
    setSeconds(secondsUntil(deadline));

    if (isTestEnv) return undefined;
    if (typeof window === 'undefined' || !window.setInterval) return undefined;

    const timer = window.setInterval(() => {
      setSeconds(secondsUntil(deadline));
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [deadline]);

  return (
    <span className={`tabular-nums ${className}`}>
      {timeLeftLabel(seconds)}
      {suffix}
    </span>
  );
}
