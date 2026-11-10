import { isAddress } from 'ethers';
import { Link, useParams } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3.75h7.5l4.5 4.5v12a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.25 3.75v4.5h4.5M8.25 12h7.5M8.25 15.75h7.5"
      />
    </svg>
  );
}

export default function ProjectPage() {
  const { address } = useParams();
  const isValidAddress = typeof address === 'string' && isAddress(address);

  return (
    <div className="space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
      >
        <ArrowLeftIcon />
        Retour aux campagnes
      </Link>

      <PageHeader
        eyebrow="Détail de la campagne"
        title="Campagne"
        description="Cette page lira l’état de la campagne directement dans son contrat : progression, montants, donateurs et demandes de retrait."
        actions={
          isValidAddress ? (
            <Badge tone="success">Adresse valide</Badge>
          ) : (
            <Badge tone="failed">Adresse invalide</Badge>
          )
        }
      />

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Adresse du contrat
          </p>
          {isValidAddress && (
            <p className="text-[11px] text-slate-500">
              Lecture via le nœud local, sans signature
            </p>
          )}
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p
            className="break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs text-slate-700"
            title={address}
          >
            {address ?? '—'}
          </p>
        </div>
      </Card>

      {isValidAddress ? (
        <EmptyState
          icon={<DocumentIcon />}
          title="Le détail de la campagne arrive à l’étape suivante"
          description="La progression, les statistiques, la description, la liste des donateurs et les actions de don seront affichées ici. Les calculs resteront en wei et les montants seront formatés en ETH."
        />
      ) : (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 sm:p-6"
        >
          <p className="font-semibold">Campagne introuvable</p>
          <p className="mt-1 leading-relaxed">
            L’adresse présente dans l’URL n’est pas une adresse Ethereum
            valide. Vérifiez le lien ou revenez à la liste des campagnes.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex text-sm font-semibold text-rose-900 underline decoration-rose-300 underline-offset-2 hover:text-rose-950"
          >
            Retour à l’accueil
          </Link>
        </div>
      )}
    </div>
  );
}
