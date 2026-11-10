import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const ToastContext = createContext(null);
let nextId = 0;

const TONES = {
  success: {
    border: 'border-l-emerald-500',
    icon: 'bg-emerald-50 text-emerald-600',
  },
  error: {
    border: 'border-l-rose-500',
    icon: 'bg-rose-50 text-rose-600',
  },
  pending: {
    border: 'border-l-indigo-500',
    icon: 'bg-indigo-50 text-indigo-600',
  },
};

function SuccessIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.59 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7" opacity="0.35" />
      <path
        strokeLinecap="round"
        d="M10 6v4.2l2.6 1.6"
        className="animate-spin"
        style={{ transformOrigin: '10px 10px' }}
      />
    </svg>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [paused, setPaused] = useState(false);
  const [closing, setClosing] = useState(false);
  const tone = TONES[toast.tone] ?? TONES.success;

  const dismiss = useCallback(() => {
    setClosing(true);
    const timer = setTimeout(() => onDismiss(toast.id), 180);
    return () => clearTimeout(timer);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (paused || closing) return undefined;

    const timer = setTimeout(() => dismiss(), 4000);
    return () => clearTimeout(timer);
  }, [paused, closing, dismiss]);

  return (
    <div
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-slate-200 border-l-4 bg-white p-3.5 shadow-lg sm:w-96 ${
        closing ? 'animate-sink' : 'animate-rise'
      } ${tone.border}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone.icon}`}
      >
        {toast.tone === 'error' ? (
          <ErrorIcon />
        ) : toast.tone === 'pending' ? (
          <PendingIcon />
        ) : (
          <SuccessIcon />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            {toast.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer la notification"
        className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Notifications éphémères (4 s), refermables, annoncées aux lecteurs d'écran.
 * `toast.success` / `toast.error` / `toast.pending` sont exposés.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((tone, title, description) => {
    const id = ++nextId;
    setToasts((list) => [...list.slice(-2), { id, tone, title, description }]);
  }, []);

  const toast = useMemo(
    () => ({
      success: (title, description) => push('success', title, description),
      error: (title, description) => push('error', title, description),
      pending: (title, description) => push('pending', title, description),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Sur mobile, les notifications restent au-dessus de la barre d'action
          fixe du bas pour ne jamais la masquer. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-24 sm:bottom-6 sm:items-end sm:px-6 sm:pb-0"
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} toast={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast doit être utilisé dans un ToastProvider.');
  }

  return context;
}
