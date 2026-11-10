import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { buttonClass } from '../components/ui/Button';

const PLANNED_FIELDS = [
  ['Titre', '80 caractères maximum'],
  ['Description', '500 caractères maximum'],
  ['Objectif (ETH)', 'strictement supérieur à 0'],
  ['Don minimum (ETH)', 'supérieur à 0 et inférieur ou égal à l’objectif'],
  ['Durée (minutes)', 'convertie en secondes pour le contrat'],
];

function PlusIcon() {
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
        d="M12 5.25v13.5M5.25 12h13.5"
      />
    </svg>
  );
}

export default function CreatePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Créer"
        title="Nouvelle campagne"
        description="Décrivez votre projet, fixez un objectif et une date limite. La campagne sera déployée par la fabrique et signée avec MetaMask."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <EmptyState
          className="h-full lg:col-span-2"
          icon={<PlusIcon />}
          title="Le formulaire arrive à l’étape suivante"
          description="Les champs seront validés côté interface, puis convertis en wei et en secondes avant l’appel à createProject(). Aucune transaction n’est envoyée pour l’instant."
          action={
            <Link
              to="/"
              className={buttonClass({ variant: 'secondary', size: 'md' })}
            >
              Retour aux campagnes
            </Link>
          }
        />

        <Card className="flex h-full flex-col">
          <h2 className="text-sm font-semibold text-slate-900">
            Champs prévus
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Règles de validation de l’interface
          </p>

          <dl className="mt-5 flex-1 space-y-3.5">
            {PLANNED_FIELDS.map(([label, rule]) => (
              <div key={label}>
                <dt className="text-xs font-medium text-slate-700">{label}</dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  {rule}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
            À la validation, la page lira l’événement{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
              ProjectCreated
            </code>{' '}
            et ouvrira la nouvelle campagne.
          </p>
        </Card>
      </div>
    </div>
  );
}
