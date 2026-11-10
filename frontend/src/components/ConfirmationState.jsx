import { useState } from 'react';
import { Link } from 'react-router-dom';

import Button from './ui/Button';

/**
 * État de confirmation après une écriture réussie.
 *
 * Affiche la confirmation dans la carte (pas seulement un toast), un bouton
 * « Partager » et un lien vers la campagne.
 */
export default function ConfirmationState({
  title,
  message,
  shareUrl,
  campaignAddress,
  className = '',
}) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState('');

  const url = shareUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(title ?? 'Une campagne sur Cagnotte');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setShareError('');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      setShareError("Copie impossible. Copiez l'adresse depuis la barre du navigateur.");
    }
  };

  return (
    <div
      className={`rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-center ${className}`}
    >
      <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.59 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
            clipRule="evenodd"
          />
        </svg>
      </span>

      <h2 className="text-base font-semibold text-emerald-900">{title}</h2>
      {message ? (
        <p className="mt-1.5 text-sm leading-relaxed text-emerald-900/90">
          {message}
        </p>
      ) : null}

      {/* Partage : copie du lien + intentions Twitter/X et Facebook (sans SDK). */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={copyLink}>
          {copied ? 'Lien copié' : 'Copier le lien'}
        </Button>

        <a
          href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          Partager sur X
        </a>

        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          Partager sur Facebook
        </a>
      </div>

      {shareError ? (
        <p className="mt-2 text-xs text-rose-700">{shareError}</p>
      ) : null}

      {campaignAddress ? (
        <p className="mt-3 text-xs text-emerald-900/80">
          <Link
            to={`/project/${campaignAddress}`}
            className="font-semibold underline decoration-emerald-400 underline-offset-2 hover:text-emerald-950"
          >
            Voir la campagne
          </Link>
        </p>
      ) : null}
    </div>
  );
}
