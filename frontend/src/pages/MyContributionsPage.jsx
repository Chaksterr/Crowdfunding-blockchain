import { Link } from 'react-router-dom';

import Badge from '../components/ui/Badge';
import Button, { buttonClass } from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Alert from '../components/ui/Alert';
import PageHeader from '../components/ui/PageHeader';
import ProgressBar from '../components/ProgressBar';
import { useAsyncData } from '../hooks/useAsyncData';
import { useWallet } from '../hooks/useWallet';
import { getProject } from '../web3/contracts';
import { loadProjects } from '../web3/projects';
import { formatEth, timeLeftLabel } from '../web3/format';

function ContributionSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
      {[0, 1].map((index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-2xl bg-slate-200"
        />
      ))}
    </div>
  );
}

export default function MyContributionsPage() {
  const { account, isConnected, isConnecting, connect } = useWallet();

  const {
    data: contributions,
    status,
    error,
    reload,
  } = useAsyncData(async () => {
    if (!account) return [];

    const { projects } = await loadProjects();
    const rows = await Promise.all(
      projects.map(async (project) => {
        const amount = await getProject(project.address).contributions(account);
        return amount > 0n ? { ...project, myContribution: amount } : null;
      }),
    );

    return rows.filter(Boolean);
  }, [account]);

  const total =
    contributions?.reduce((sum, item) => sum + item.myContribution, 0n) ?? 0n;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Mon espace"
        title="Mes contributions"
        description="Retrouvez les campagnes auxquelles vous avez participé et le montant de votre soutien."
        actions={
          isConnected ? (
            <Button
              variant="secondary"
              onClick={reload}
              loading={status === 'refreshing'}
            >
              Actualiser
            </Button>
          ) : null
        }
      />

      {!isConnected ? (
        <Card className="mx-auto max-w-xl text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Connectez votre portefeuille
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Vos contributions sont liées à votre adresse. Connectez MetaMask
            pour retrouver les campagnes que vous avez soutenues.
          </p>
          <Button
            className="mt-5"
            onClick={connect}
            loading={isConnecting}
          >
            Connecter MetaMask
          </Button>
        </Card>
      ) : null}

      {isConnected && error ? (
        <Alert tone="rose" title="Impossible de charger vos contributions">
          {error}
        </Alert>
      ) : null}

      {isConnected && status === 'loading' ? <ContributionSkeleton /> : null}

      {isConnected && contributions && contributions.length === 0 ? (
        <EmptyState
          title="Aucune contribution pour le moment"
          description="Explorez les campagnes en cours et soutenez un projet qui vous tient à cœur."
          action={
            <Link to="/" className={buttonClass({ variant: 'primary' })}>
              Découvrir les campagnes
            </Link>
          }
        />
      ) : null}

      {isConnected && contributions && contributions.length > 0 ? (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-4 bg-indigo-50/60">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Total contribué
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {formatEth(total)} ETH
              </p>
            </div>
            <p className="text-sm text-slate-600">
              {contributions.length} campagne
              {contributions.length > 1 ? 's' : ''} soutenue
              {contributions.length > 1 ? 's' : ''}
            </p>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {contributions.map((project) => (
              <Card key={project.address} className="flex h-full flex-col">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    <Link
                      to={`/project/${project.address}`}
                      className="transition hover:text-indigo-700"
                    >
                      {project.title}
                    </Link>
                  </h2>
                  <Badge status={project.status} />
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  Votre contribution :{' '}
                  <strong className="text-slate-900">
                    {formatEth(project.myContribution)} ETH
                  </strong>
                </p>

                <div className="mt-4">
                  <ProgressBar
                    raised={project.totalRaised}
                    goal={project.goal}
                    tone={project.status === 2 ? 'success' : undefined}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {formatEth(project.totalRaised)} / {formatEth(project.goal)}{' '}
                    ETH · {timeLeftLabel(project.timeLeft)}
                  </p>
                </div>

                <div className="mt-auto pt-4">
                  <Link
                    to={`/project/${project.address}`}
                    className={buttonClass({
                      variant: 'secondary',
                      className: 'w-full',
                    })}
                  >
                    Voir la campagne
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            Une contribution remboursée n'apparaît plus dans cette liste.
          </p>
        </>
      ) : null}
    </div>
  );
}
