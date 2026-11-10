import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CHAIN_ID } from '../config';
import { useWallet, useWalletListeners } from '../hooks/useWallet';
import { hasMetaMask } from '../web3/provider';
import Header from './Header';

function Notice({ tone = 'slate', title, children, action, onDismiss }) {
  const tones = {
    slate: 'border-slate-200 bg-white text-slate-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  };

  return (
    <div
      role={tone === 'rose' ? 'alert' : 'status'}
      className={`flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}
    >
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && (
          <p className={`text-sm leading-relaxed ${title ? 'mt-0.5 opacity-90' : ''}`}>
            {children}
          </p>
        )}
      </div>

      {action && <div className="shrink-0 self-center">{action}</div>}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Masquer ce message"
          className="shrink-0 rounded-lg p-1 text-current opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
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
      )}
    </div>
  );
}

export default function Layout({ children }) {
  useWalletListeners();
  const location = useLocation();
  const {
    chainId,
    isWrongNetwork,
    error,
    clearError,
    switchNetwork,
  } = useWallet();

  const metaMaskMissing = !hasMetaMask();
  const hasNotices = metaMaskMissing || isWrongNetwork || Boolean(error);

  // Un changement de page doit repartir du haut, y compris depuis une liste
  // longue ou un défilement horizontal sur mobile.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {hasNotices && (
        <div className="mx-auto w-full max-w-7xl space-y-3 px-4 pt-4 sm:px-6 lg:px-8">
          {error && (
            <Notice tone="rose" onDismiss={clearError}>
              {error}
            </Notice>
          )}

          {isWrongNetwork && (
            <Notice
              tone="amber"
              title="Mauvais réseau"
              action={
                <button
                  type="button"
                  onClick={switchNetwork}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  Changer de réseau
                </button>
              }
            >
              Votre portefeuille est sur la chaîne {chainId ?? '—'}. Passez sur
              Hardhat Local ({CHAIN_ID}) pour signer des transactions.
            </Notice>
          )}

          {metaMaskMissing && (
            <Notice tone="slate">
              <span className="font-medium">MetaMask n’est pas détecté.</span>{' '}
              Lecture seule — les actions d’écriture sont masquées.{' '}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-700"
              >
                Installer MetaMask
              </a>
            </Notice>
          )}
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div key={location.pathname} className="animate-rise">
          {children}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} Cagnotte — projet étudiant de
            financement participatif.
          </p>
          <p className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-amber-500"
              aria-hidden="true"
            />
            <span>
              <span className="font-medium text-slate-600">
                Réseau local {CHAIN_ID}
              </span>{' '}
              · aucun fonds réel
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
