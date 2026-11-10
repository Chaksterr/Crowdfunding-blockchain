import { Link } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { buttonClass } from '../components/ui/Button';
import { CHAIN_ID, FACTORY_ADDRESS, RPC_URL } from '../config';
import { shortAddress } from '../web3/format';

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.5-6.75 9.75-6.75S21.75 12 21.75 12s-3.5 6.75-9.75 6.75S2.25 12 2.25 12Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h12A2.25 2.25 0 0 1 20.25 7.5v9A2.25 2.25 0 0 1 18 18.75H6a2.25 2.25 0 0 1-2.25-2.25v-9Z"
      />
      <path strokeLinecap="round" d="M3.75 8.25h16.5M16.5 12h.008" />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM5.25 21.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM18.75 21.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM12 6.75v4.5M5.25 17.25v-2.5a2 2 0 0 1 2-2h9.5a2 2 0 0 1 2 2v2.5"
      />
    </svg>
  );
}

const FOUNDATION = [
  {
    title: 'Lecture sans portefeuille',
    description:
      'Les campagnes seront lisibles via le nœud local, même sans MetaMask installé.',
    icon: <EyeIcon />,
  },
  {
    title: 'Connexion MetaMask',
    description:
      'Adresse, solde et réseau sont détectés puis affichés dans l’en-tête.',
    icon: <WalletIcon />,
  },
  {
    title: 'Réseau Hardhat',
    description:
      'Les écritures seront signées sur la blockchain locale de démonstration.',
    icon: <NetworkIcon />,
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        eyebrow="Financement participatif"
        title="Campagnes"
        description="Découvrez les projets soutenus par la communauté et suivez leur progression jusqu’à la date limite."
        actions={
          <Link to="/create" className={buttonClass()}>
            Créer une campagne
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <EmptyState
          className="h-full lg:col-span-2"
          title="Les campagnes arrivent à l’étape suivante"
          description="Les cartes de campagne, les filtres et la progression seront branchés sur la blockchain juste après. Aucune donnée de démonstration n’est affichée pour l’instant."
        />

        <Card className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Socle technique
              </h2>
              <p className="mt-1 text-xs text-slate-500">Configuration active</p>
            </div>
            <Badge tone="success">Prêt</Badge>
          </div>

          <dl className="mt-5 flex-1 space-y-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Nœud RPC
              </dt>
              <dd
                className="mt-0.5 truncate font-mono text-xs text-slate-700"
                title={RPC_URL}
              >
                {RPC_URL}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Réseau
              </dt>
              <dd className="mt-0.5 text-xs text-slate-700">
                Hardhat Local · <span className="tabular-nums">{CHAIN_ID}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Fabrique
              </dt>
              <dd
                className="mt-0.5 font-mono text-xs text-slate-700"
                title={FACTORY_ADDRESS}
              >
                {shortAddress(FACTORY_ADDRESS, 6) || 'Non déployée'}
              </dd>
            </div>
          </dl>

          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
            Adresse lue dans{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
              deployed.json
            </code>
            . Relancez{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
              npm run sync
            </code>{' '}
            après un déploiement.
          </p>
        </Card>
      </div>

      <section aria-labelledby="socle-titre">
        <h2 id="socle-titre" className="sr-only">
          Socle déjà en place
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {FOUNDATION.map((item) => (
            <Card key={item.title} className="flex flex-col gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                {item.icon}
              </span>
              <h3 className="text-sm font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
