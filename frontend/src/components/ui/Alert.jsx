const TONES = {
  rose: {
    wrapper: 'border-rose-200 bg-rose-50 text-rose-800',
    title: 'text-rose-900',
  },
  amber: {
    wrapper: 'border-amber-200 bg-amber-50 text-amber-900',
    title: 'text-amber-950',
  },
  emerald: {
    wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    title: 'text-emerald-900',
  },
  slate: {
    wrapper: 'border-slate-200 bg-white text-slate-700',
    title: 'text-slate-900',
  },
};

/**
 * Bandeau d'information, d'erreur ou de confirmation.
 * `tone="rose"` est annoncé immédiatement (role="alert").
 * `action` affiche une action à droite, `onDismiss` un bouton de fermeture.
 */
export default function Alert({
  tone = 'slate',
  title,
  children,
  action,
  onDismiss,
  className = '',
}) {
  const style = TONES[tone] ?? TONES.slate;

  return (
    <div
      role={tone === 'rose' ? 'alert' : 'status'}
      className={`flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm ${style.wrapper} ${className}`}
    >
      <div className="min-w-0 flex-1">
        {title && (
          <p className={`font-semibold ${style.title}`}>{title}</p>
        )}
        {children && (
          <div className={`leading-relaxed ${title ? 'mt-1' : ''}`}>
            {children}
          </div>
        )}
      </div>

      {action ? <div className="shrink-0 self-center">{action}</div> : null}

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Masquer ce message"
          className="shrink-0 rounded-lg p-1 text-current opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
      ) : null}
    </div>
  );
}
