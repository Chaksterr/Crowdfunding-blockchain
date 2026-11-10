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
 */
export default function Alert({ tone = 'slate', title, children, className = '' }) {
  const style = TONES[tone] ?? TONES.slate;

  return (
    <div
      role={tone === 'rose' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm ${style.wrapper} ${className}`}
    >
      {title && <p className={`font-semibold ${style.title}`}>{title}</p>}
      {children && (
        <div className={`leading-relaxed ${title ? 'mt-1' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}
