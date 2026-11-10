import { useEffect, useRef, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { formatEth, shortAddress } from '../web3/format';
import { hasMetaMask } from '../web3/provider';
import Button, { buttonClass } from './ui/Button';

function WalletIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h12A2.25 2.25 0 0 1 20.25 7.5v9A2.25 2.25 0 0 1 18 18.75H6a2.25 2.25 0 0 1-2.25-2.25v-9Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12h.008M3.75 8.25h16.5"
      />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 text-slate-500 transition-transform duration-150 ${
        open ? 'rotate-180' : ''
      }`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function WalletButton() {
  const {
    account,
    balance,
    chainId,
    status,
    isConnecting,
    isWrongNetwork,
    connect,
    disconnect,
    switchNetwork,
  } = useWallet();

  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    // pointerdown couvre souris, stylet et tactile ; click sert de filet de
    // sécurité pour les environnements qui n'émettent pas pointerdown.
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('click', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('click', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(account);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyState('idle'), 2200);
  };

  if (!hasMetaMask()) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass({ variant: 'secondary', size: 'md' })}
        title="MetaMask n'est pas détecté. Le site reste consultable en lecture seule."
        aria-label="Installer MetaMask"
      >
        <WalletIcon />
        <span className="hidden sm:inline">Installer MetaMask</span>
        <span className="sm:hidden">Installer</span>
      </a>
    );
  }

  if (isConnecting) {
    return (
      <Button size="md" loading aria-label="Connexion à MetaMask en cours">
        Connexion…
      </Button>
    );
  }

  if (status === 'loading') {
    return (
      <span
        aria-busy="true"
        aria-live="polite"
        className="inline-flex items-center"
      >
        <span className="sr-only">Vérification du portefeuille…</span>
        <span
          aria-hidden="true"
          className="block h-11 w-32 animate-pulse rounded-xl bg-slate-200"
        />
      </span>
    );
  }

  if (!account) {
    return (
      <Button size="md" onClick={connect}>
        <WalletIcon />
        <span className="hidden sm:inline">Connecter MetaMask</span>
        <span className="sm:hidden">Connecter</span>
      </Button>
    );
  }

  const balanceLabel = balance !== null ? `${formatEth(balance)} ETH` : '—';

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="wallet-panel"
        aria-label={`Portefeuille ${account} — solde ${balanceLabel}${
          isWrongNetwork ? ` — mauvais réseau ${chainId}` : ''
        }`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98]"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            isWrongNetwork ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          aria-hidden="true"
        />
        <span className="font-mono text-xs font-semibold text-slate-800">
          {shortAddress(account)}
        </span>
        {isWrongNetwork ? (
          <span className="hidden text-xs font-medium text-amber-700 sm:inline">
            Réseau {chainId}
          </span>
        ) : (
          <span className="hidden text-xs tabular-nums text-slate-500 sm:inline">
            {balanceLabel}
          </span>
        )}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          id="wallet-panel"
          className="animate-rise absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg"
        >
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Portefeuille connecté
          </p>
          <p
            className="mt-1.5 break-all rounded-lg bg-slate-50 px-2.5 py-2 font-mono text-xs text-slate-700"
            title={account}
          >
            {account}
          </p>
          <p className="mt-1.5 px-1 text-xs tabular-nums text-slate-500">
            Solde : {balanceLabel}
            {chainId !== null ? ` · chaîne ${chainId}` : ''}
          </p>

          {isWrongNetwork && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
              <p className="text-xs font-medium text-amber-900">
                Mauvais réseau. Passez sur Hardhat Local (31337).
              </p>
              <button
                type="button"
                onClick={async () => {
                  await switchNetwork();
                  setOpen(false);
                }}
                className="mt-2 text-xs font-semibold text-amber-900 underline decoration-amber-400 underline-offset-2 hover:text-amber-950"
              >
                Changer de réseau
              </button>
            </div>
          )}

          <div className="mt-2 space-y-1">
            <button
              type="button"
              onClick={copyAddress}
              className="flex min-h-11 w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Copier l’adresse
              <span
                aria-live="polite"
                className={
                  copyState === 'copied'
                    ? 'text-xs font-semibold text-emerald-600'
                    : copyState === 'error'
                      ? 'text-xs font-semibold text-rose-600'
                      : 'text-[11px] text-slate-500'
                }
              >
                {copyState === 'copied'
                  ? 'Copiée'
                  : copyState === 'error'
                    ? 'Impossible'
                    : '↗'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="flex min-h-11 w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
            >
              Déconnecter
              <span className="text-[11px] font-normal text-rose-600">localement</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
