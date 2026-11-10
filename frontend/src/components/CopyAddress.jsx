import { useEffect, useRef, useState } from 'react';
import { shortAddress } from '../web3/format';

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h5.75A2.75 2.75 0 0 1 17 4.75v6.5A1.5 1.5 0 0 1 15.5 12.75H14v-1.5h1.5a.25.25 0 0 0 .25-.25v-6.5c0-.69-.56-1.25-1.25-1.25H8.25a.25.25 0 0 0-.25.25V5H6.5V3.5H7Z" />
      <path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h5.5A1.75 1.75 0 0 1 12 6.75v7.5A1.75 1.75 0 0 1 10.25 16h-5.5A1.75 1.75 0 0 1 3 14.25v-7.5ZM4.75 6.5a.25.25 0 0 0-.25.25v7.5c0 .14.11.25.25.25h5.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-5.5Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.79 6.8-6.79a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Adresse courte en police mono + bouton « copier » avec retour accessible.
 */
export default function CopyAddress({
  value,
  label = "l'adresse",
  chars = 4,
  className = '',
}) {
  const [state, setState] = useState('idle');
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('error');
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState('idle'), 2200);
  };

  if (!value) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-mono text-xs text-slate-600" title={value}>
        {shortAddress(value, chars)}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copier ${label}`}
        title={`Copier ${label}`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
      >
        {state === 'copied' ? (
          <span className="text-emerald-600">
            <CheckIcon />
          </span>
        ) : (
          <CopyIcon />
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {state === 'copied'
          ? 'Adresse copiée'
          : state === 'error'
            ? 'Copie impossible'
            : ''}
      </span>
    </span>
  );
}
