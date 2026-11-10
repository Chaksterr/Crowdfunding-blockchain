import Badge from './ui/Badge';

/**
 * Aperçu en langage clair d'une transaction avant signature, suivi de son
 * état visible : en attente, confirmée ou échouée.
 *
 * @param {{preview: string, status?: 'idle'|'pending'|'success'|'error',
 *          error?: string|null, className?: string}} props
 */
export default function SigningPreview({
  preview,
  status = 'idle',
  error = null,
  className = '',
}) {
  const state = {
    idle: {
      badge: null,
      line: null,
      wrapper: 'border-slate-200 bg-slate-50/80 text-slate-700',
    },
    pending: {
      badge: <Badge tone="indigo">En attente</Badge>,
      line: 'Transaction en attente de confirmation…',
      wrapper: 'border-indigo-200 bg-indigo-50/70 text-indigo-900',
    },
    success: {
      badge: <Badge tone="success">Confirmée</Badge>,
      line: 'Transaction confirmée sur la chaîne locale.',
      wrapper: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    },
    error: {
      badge: <Badge tone="failed">Échouée</Badge>,
      line: error ?? "La transaction a échoué. Rien n'a été modifié.",
      wrapper: 'border-rose-200 bg-rose-50/80 text-rose-900',
    },
  }[status] ?? null;

  return (
    <div
      className={`rounded-xl border px-3.5 py-3 text-sm ${state.wrapper} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium leading-relaxed">
          <span className="font-semibold">Ce que vous allez signer : </span>
          {preview}
        </p>
        {state.badge ? <span className="shrink-0">{state.badge}</span> : null}
      </div>

      {state.line ? (
        <p className="mt-1.5 text-xs leading-relaxed opacity-90" role="status">
          {state.line}
        </p>
      ) : null}
    </div>
  );
}
