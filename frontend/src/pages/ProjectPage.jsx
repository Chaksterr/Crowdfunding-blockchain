import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isAddress, parseEther } from 'ethers';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Field from '../components/ui/Field';
import Alert from '../components/ui/Alert';
import CopyAddress from '../components/CopyAddress';
import ProgressBar from '../components/ProgressBar';
import { useToast } from '../components/ToastProvider';
import { useAsyncData } from '../hooks/useAsyncData';
import { useProjectEvents } from '../hooks/useChainEvents';
import { useTransaction } from '../hooks/useTransaction';
import { useWallet } from '../hooks/useWallet';
import { getSigner } from '../web3/provider';
import {
  createWithdrawRequest,
  donate,
  loadProject,
  refund,
  voteWithdrawRequest,
  withdrawRequestedAmount,
} from '../web3/projects';
import {
  ethInputValue,
  formatDeadline,
  formatEth,
  parseEth,
  timeLeftLabel,
} from '../web3/format';

function secondsLeft(deadline) {
  return Math.max(0, Number(deadline) - Math.floor(Date.now() / 1000));
}

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-slate-900">{value}</dd>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="h-9 w-2/3 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

function DonateCard({ project, onDone }) {
  const { account, isConnected, isWrongNetwork, connect, switchNetwork } =
    useWallet();
  const toast = useToast();
  const tx = useTransaction();
  const [amount, setAmount] = useState('');
  const [fieldError, setFieldError] = useState('');

  const quickAmounts = useMemo(() => {
    const min = project.minContribution;
    const candidates = [min, min * 2n, parseEther('1'), parseEther('2'), parseEther('5')];
    const seen = new Set();
    return candidates
      .filter((value) => {
        if (value < min) return false;
        const key = value.toString();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4)
      .map((value) => ethInputValue(value));
  }, [project.minContribution]);

  if (project.status !== 0) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-slate-900">
          {project.status === 2 ? 'Campagne réussie' : 'Campagne échouée'}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {project.status === 2
            ? 'Les dons sont clos. Les donateurs peuvent voter sur les demandes de retrait du créateur.'
            : 'Les dons sont clos. Chaque donateur peut récupérer sa contribution.'}
        </p>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-slate-900">
          Envie de soutenir ce projet ?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Connectez votre portefeuille pour envoyer un don. La lecture reste
          disponible sans portefeuille.
        </p>
        <Button className="mt-4" fullWidth onClick={connect}>
          Connecter MetaMask
        </Button>
      </Card>
    );
  }

  if (isWrongNetwork) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-slate-900">
          Réseau incorrect
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Passez sur Hardhat Local (31337) pour signer une transaction.
        </p>
        <Button className="mt-4" fullWidth onClick={switchNetwork}>
          Changer de réseau
        </Button>
      </Card>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setFieldError('');

    let value;
    try {
      value = parseEth(amount);
    } catch (error) {
      setFieldError(error.message);
      return;
    }

    if (value < project.minContribution) {
      setFieldError(
        `Le don minimum est de ${formatEth(project.minContribution)} ETH.`,
      );
      return;
    }

    const result = await tx.run(async () => {
      const signer = await getSigner();
      return donate(project.address, amount, signer);
    });

    if (result.ok) {
      toast.success(
        'Don envoyé',
        `${formatEth(value)} ETH ajoutés à la campagne.`,
      );
      setAmount('');
      onDone();
    }
  };

  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-900">
        Donner à cette campagne
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Don minimum : {formatEth(project.minContribution)} ETH. Les fonds sont
        conservés par le contrat jusqu'à la date limite.
      </p>

      {(project.contributions ?? 0n) > 0n ? (
        <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
          Votre contribution actuelle :{' '}
          <strong>{formatEth(project.contributions)} ETH</strong>
        </p>
      ) : null}

      <form className="mt-4 space-y-3" onSubmit={submit}>
        <Field
          id="donation-amount"
          label="Montant du don (ETH)"
          placeholder="0,5"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={fieldError}
          hint={`Minimum ${formatEth(project.minContribution)} ETH`}
          required
        />

        <div className="flex flex-wrap gap-2">
          {quickAmounts.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAmount(value)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {value} ETH
            </button>
          ))}
        </div>

        {tx.error ? <Alert tone="rose">{tx.error}</Alert> : null}

        <Button type="submit" fullWidth loading={tx.isPending}>
          {amount ? `Donner ${amount} ETH` : 'Donner'}
        </Button>
      </form>
    </Card>
  );
}

function CreateRequestForm({ project, onDone }) {
  const { account } = useWallet();
  const toast = useToast();
  const tx = useTransaction();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [recipient, setRecipient] = useState(account ?? '');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    let value;
    try {
      value = parseEth(amount);
    } catch (parseError) {
      setError(parseError.message);
      return;
    }

    if (value <= 0n) {
      setError('Le montant doit être supérieur à 0.');
      return;
    }

    if (value > project.balance) {
      setError(
        `Le solde du contrat est de ${formatEth(project.balance)} ETH.`,
      );
      return;
    }

    if (reason.trim().length < 3) {
      setError('Le motif doit contenir au moins 3 caractères.');
      return;
    }

    const result = await tx.run(async () => {
      const signer = await getSigner();
      return createWithdrawRequest(
        project.address,
        { amountEth: amount, reason, recipient },
        signer,
      );
    });

    if (result.ok) {
      toast.success('Demande créée', 'Les donateurs peuvent maintenant voter.');
      setAmount('');
      setReason('');
      onDone();
    }
  };

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-900">
        Nouvelle demande de retrait
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Vous êtes le créateur : demandez un montant, les donateurs voteront.
      </p>

      <form className="mt-4 space-y-3" onSubmit={submit}>
        <Field
          id="request-amount"
          label="Montant (ETH)"
          placeholder="1"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          hint={`Solde disponible : ${formatEth(project.balance)} ETH`}
          required
        />
        <Field
          id="request-reason"
          label="Motif"
          placeholder="Achat du matériel"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={200}
          required
        />
        <Field
          id="request-recipient"
          label="Destinataire"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          hint="Adresse qui recevra les fonds si la demande est approuvée."
          required
        />

        {error ? <Alert tone="rose">{error}</Alert> : null}
        {tx.error ? <Alert tone="rose">{tx.error}</Alert> : null}

        <Button type="submit" fullWidth loading={tx.isPending}>
          Créer la demande
        </Button>
      </form>
    </Card>
  );
}

function RequestCard({ request, project, isCreator, onDone }) {
  const { account } = useWallet();
  const toast = useToast();
  const tx = useTransaction();

  const donorCount = project.donors.length;
  const quorumReached = request.approvals * 2 >= donorCount;
  const canVote =
    Boolean(account) &&
    !request.executed &&
    !request.hasVoted &&
    (project.contributions ?? 0n) > 0n;
  const canWithdraw =
    isCreator && !request.executed && quorumReached && donorCount > 0;

  const run = async (action, successTitle, successText) => {
    const result = await tx.run(action);
    if (result.ok) {
      toast.success(successTitle, successText);
      onDone();
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Demande #{request.id} · {formatEth(request.amount)} ETH
          </p>
          <p className="mt-1 text-sm text-slate-600">{request.reason}</p>
        </div>
        {request.executed ? (
          <Badge tone="success">Exécutée</Badge>
        ) : quorumReached ? (
          <Badge tone="indigo">Quorum atteint</Badge>
        ) : (
          <Badge tone="neutral">En attente</Badge>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {request.approvals} vote{request.approvals > 1 ? 's' : ''} sur{' '}
            {donorCount} donateur{donorCount > 1 ? 's' : ''}
          </span>
          <span>Destinataire : {request.recipient.slice(0, 6)}…</span>
        </div>
        <ProgressBar
          className="mt-2"
          raised={BigInt(request.approvals)}
          goal={BigInt(Math.max(donorCount, 1))}
          label="Approbations de la demande"
          tone={quorumReached ? 'success' : 'indigo'}
        />
      </div>

      {request.hasVoted && !request.executed ? (
        <p className="mt-3 text-xs font-medium text-emerald-700">
          Votre vote est enregistré.
        </p>
      ) : null}

      {tx.error ? (
        <Alert tone="rose" className="mt-3">
          {tx.error}
        </Alert>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {canVote ? (
          <Button
            size="sm"
            variant="secondary"
            loading={tx.isPending}
            onClick={() =>
              run(
                async () => {
                  const signer = await getSigner();
                  return voteWithdrawRequest(project.address, request.id, signer);
                },
                'Vote enregistré',
                `Demande #${request.id} approuvée.`,
              )
            }
          >
            Voter
          </Button>
        ) : null}

        {canWithdraw ? (
          <Button
            size="sm"
            loading={tx.isPending}
            onClick={() =>
              run(
                async () => {
                  const signer = await getSigner();
                  return withdrawRequestedAmount(
                    project.address,
                    request.id,
                    signer,
                  );
                },
                'Retrait effectué',
                `${formatEth(request.amount)} ETH envoyés au destinataire.`,
              )
            }
          >
            Retirer
          </Button>
        ) : null}

        {!account && !request.executed ? (
          <p className="text-xs text-slate-500">
            Connectez-vous pour voter sur cette demande.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function RefundCard({ project, onDone }) {
  const toast = useToast();
  const tx = useTransaction();

  const submit = async () => {
    const result = await tx.run(async () => {
      const signer = await getSigner();
      return refund(project.address, signer);
    });

    if (result.ok) {
      toast.success(
        'Remboursement reçu',
        `${formatEth(project.contributions)} ETH récupérés.`,
      );
      onDone();
    }
  };

  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-900">
        Campagne échouée
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        L'objectif n'a pas été atteint. Vous pouvez récupérer votre
        contribution de {formatEth(project.contributions)} ETH.
      </p>
      {tx.error ? (
        <Alert tone="rose" className="mt-3">
          {tx.error}
        </Alert>
      ) : null}
      <Button
        className="mt-4"
        fullWidth
        loading={tx.isPending}
        onClick={submit}
      >
        Rembourser {formatEth(project.contributions)} ETH
      </Button>
    </Card>
  );
}

export default function ProjectPage() {
  const { address } = useParams();
  const wallet = useWallet();
  const validAddress = isAddress(address);

  const { data: project, status, error, reload, isLoading } = useAsyncData(
    async () => {
      if (!validAddress) {
        throw new Error("L'adresse de la campagne est invalide.");
      }
      return loadProject(address, wallet.account);
    },
    [address, wallet.account, validAddress],
  );

  useEffect(() => {
    if (!validAddress) return undefined;
    const timer = window.setInterval(() => reload(), 15000);
    return () => window.clearInterval(timer);
  }, [validAddress, reload]);

  useProjectEvents(
    validAddress ? address : null,
    reload,
    status !== 'error',
  );

  if (!validAddress) {
    return (
      <EmptyState
        title="Campagne introuvable"
        description="Cette adresse ne correspond pas à une campagne valide."
        action={
          <Link to="/" className="text-sm font-semibold text-indigo-700">
            ← Retour aux campagnes
          </Link>
        }
      />
    );
  }

  if (isLoading && !project) return <ProjectSkeleton />;

  if (status === 'error' && !project) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Alert tone="rose" title="Impossible de charger la campagne">
          {error}
        </Alert>
        <Button onClick={reload}>Réessayer</Button>
      </div>
    );
  }

  const isCreator =
    Boolean(wallet.account) &&
    wallet.account.toLowerCase() === project.creator.toLowerCase();
  const seconds = secondsLeft(project.deadline);
  const tone =
    project.status === 2 ? 'success' : project.status === 1 ? 'failed' : 'indigo';

  return (
    <div className="space-y-8">
      <Link
        to="/"
        className="inline-flex items-center text-sm font-semibold text-slate-600 transition hover:text-indigo-700"
      >
        ← Toutes les campagnes
      </Link>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {project.title}
          </h1>
          <Badge status={project.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
          <CopyAddress value={project.address} label="l'adresse de la campagne" />
          <span>
            Créateur : <CopyAddress value={project.creator} label="le créateur" chars={3} />
          </span>
          <span>Date limite : {formatDeadline(project.deadline)}</span>
          <span>{timeLeftLabel(seconds)}</span>
        </div>
        <ProgressBar
          raised={project.totalRaised}
          goal={project.goal}
          tone={tone}
        />
      </header>

      {status === 'error' ? (
        <Alert tone="amber" title="Données peut-être obsolètes">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-semibold text-slate-900">
              À propos du projet
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
              {project.description}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Metric label="Objectif" value={`${formatEth(project.goal)} ETH`} />
              <Metric
                label="Collecté"
                value={`${formatEth(project.totalRaised)} ETH`}
                hint={`${formatEth(project.balance)} ETH sur le contrat`}
              />
              <Metric
                label="Don minimum"
                value={`${formatEth(project.minContribution)} ETH`}
              />
              <Metric label="Donateurs" value={project.donors.length} />
              <Metric label="Demandes" value={project.withdrawRequestsCount} />
              <Metric
                label="Temps restant"
                value={project.status === 0 ? timeLeftLabel(seconds) : 'Terminée'}
              />
            </dl>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Demande{project.withdrawRequests.length > 1 ? 's' : ''} de retrait
              </h2>
              <span className="text-xs text-slate-500">
                Quorum : 50 % des donateurs
              </span>
            </div>

            {project.withdrawRequests.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                {project.status === 2
                  ? "Le créateur n'a pas encore créé de demande."
                  : 'Les demandes de retrait seront disponibles si la campagne réussit.'}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {project.withdrawRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    project={project}
                    isCreator={isCreator}
                    onDone={reload}
                  />
                ))}
              </div>
            )}

            {isCreator && project.status === 2 ? (
              <div className="mt-6">
                <CreateRequestForm project={project} onDone={reload} />
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Donateurs
              </h2>
              <span className="text-xs text-slate-500">
                {project.donors.length} au total
              </span>
            </div>

            {project.donors.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Aucun don pour le moment. Soyez le premier à soutenir ce projet.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {project.donors.slice(0, 50).map((donor) => (
                  <li
                    key={donor.address}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <CopyAddress
                        value={donor.address}
                        label="l'adresse du donateur"
                      />
                      {donor.address.toLowerCase() ===
                      project.creator.toLowerCase() ? (
                        <Badge tone="indigo">Créateur</Badge>
                      ) : null}
                      {wallet.account &&
                      donor.address.toLowerCase() ===
                        wallet.account.toLowerCase() ? (
                        <Badge tone="neutral">Vous</Badge>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-slate-800">
                      {formatEth(donor.amount)} ETH
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {project.donors.length > 50 ? (
              <p className="mt-3 text-xs text-slate-500">
                + {project.donors.length - 50} autres donateurs
              </p>
            ) : null}
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
          <DonateCard project={project} onDone={reload} />
          {project.status === 1 && (project.contributions ?? 0n) > 0n ? (
            <RefundCard project={project} onDone={reload} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
