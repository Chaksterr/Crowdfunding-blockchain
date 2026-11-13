import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isAddress } from 'ethers';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmationState from '../components/ConfirmationState';
import DonationPresets from '../components/DonationPresets';
import EmptyState from '../components/ui/EmptyState';
import Faq from '../components/Faq';
import Field from '../components/ui/Field';
import Alert from '../components/ui/Alert';
import CampaignBanner from '../components/CampaignBanner';
import Countdown from '../components/Countdown';
import CountUp from '../components/CountUp';
import DonorAvatars from '../components/DonorAvatars';
import CopyAddress from '../components/CopyAddress';
import ProgressBar from '../components/ProgressBar';
import SigningPreview from '../components/SigningPreview';
import { useToast } from '../components/ToastProvider';
import { useAsyncData } from '../hooks/useAsyncData';
import { useProjectEvents } from '../hooks/useChainEvents';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useTransaction } from '../hooks/useTransaction';
import { useWallet } from '../hooks/useWallet';
import { CHAIN_ID } from '../config';
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
  formatDeadline,
  formatEth,
  formatEthNumber,
  formatPercent,
  parseEth,
  plural,
  remainingLabel,
} from '../web3/format';

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold tabular-nums text-slate-900">
        {value}
      </dd>
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
  // Le deuxième préréglage (0,5 ETH) est présélectionné.
  const [amount, setAmount] = useState('0,5');
  const [fieldError, setFieldError] = useState('');
  const [confirmedAmount, setConfirmedAmount] = useState(null);
  const amountRef = useRef(null);
  const isMobile = useIsMobile();

  const tone =
    project.status === 2 ? 'success' : project.status === 1 ? 'failed' : 'primary';

  const raisedEth = Number(project.totalRaised) / 1e18;

  const scrollToForm = () => {
    amountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    amountRef.current?.focus({ preventScroll: true });
  };

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
      setConfirmedAmount(value);
      toast.success(
        'Don envoyé',
        `${formatEth(value)} ETH ajoutés à la campagne.`,
      );
      onDone();
    } else {
      toast.error(
        "Le don n'a pas abouti",
        "La transaction a échoué, aucun fonds n'a été déplacé.",
      );
    }
  };

  const mobileActionBar = isMobile ? (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-slate-500">Montant du don</p>
          <p className="truncate text-sm font-semibold tabular-nums text-slate-900">
            {amount ? `${amount} ETH` : '— ETH'}
          </p>
        </div>
        <Button type="button" onClick={scrollToForm} className="shrink-0">
          Donner
        </Button>
      </div>
    </div>
  ) : null;

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
          Passez sur Hardhat Local (31338) pour signer une transaction.
        </p>
        <Button className="mt-4" fullWidth onClick={switchNetwork}>
          Changer de réseau
        </Button>
      </Card>
    );
  }

  return (
    <>
      <Card padded={false} className="overflow-hidden shadow-lg ring-1 ring-slate-200/70">
        <div className="border-b border-slate-100 bg-slate-50/60 p-5 sm:p-6">
          <p className="text-3xl font-bold tracking-tight text-slate-900">
            <CountUp
              value={raisedEth}
              format={(value) => formatEthNumber(value)}
              suffix=" ETH"
            />
          </p>
          <p className="mt-1 text-sm tabular-nums text-slate-500">
            collectés sur un objectif de {formatEth(project.goal)} ETH
          </p>
          <ProgressBar
            className="mt-3"
            raised={project.totalRaised}
            goal={project.goal}
            tone={tone}
          />
          <p className="mt-2 text-xs font-medium tabular-nums text-slate-500">
            {remainingLabel(project.totalRaised, project.goal)}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slate-500">
              <DonorAvatars donors={project.donors} />
              {plural(project.donors.length, 'donateur')}
            </span>
            <span className="shrink-0 font-medium tabular-nums text-slate-600">
              {formatPercent(project.totalRaised, project.goal)} de l'objectif
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {confirmedAmount !== null ? (
            <ConfirmationState
              title={`Merci ! Votre don de ${formatEth(confirmedAmount)} ETH est confirmé`}
              message="Votre contribution a été ajoutée à la campagne. Les fonds restent verrouillés jusqu'à la date limite."
              shareUrl={
                typeof window !== 'undefined' ? window.location.href : undefined
              }
              campaignAddress={project.address}
            />
          ) : (
            <>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Donner à cette campagne
              </h2>
              <p className="mt-1 text-sm tabular-nums text-slate-600">
                Don minimum : {formatEth(project.minContribution)} ETH. Les fonds
                sont conservés par le contrat jusqu'à la date limite.
              </p>

              {(project.contributions ?? 0n) > 0n ? (
                <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                  Votre contribution actuelle :{' '}
                  <strong className="tabular-nums">
                    {formatEth(project.contributions)} ETH
                  </strong>
                </p>
              ) : null}

              <form className="mt-4 space-y-4" onSubmit={submit}>
                <DonationPresets
                  min={project.minContribution}
                  value={amount}
                  onSelect={setAmount}
                />

                <div ref={amountRef} className="scroll-mt-28">
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
                </div>

                <SigningPreview
                  preview={
                    amount
                      ? `Vous allez donner ${amount} ETH à cette campagne.`
                      : `Vous allez donner un montant à cette campagne (minimum ${formatEth(
                          project.minContribution,
                        )} ETH).`
                  }
                  status={tx.status}
                  error={tx.error}
                />

                {tx.error ? <Alert tone="rose">{tx.error}</Alert> : null}

                <Button type="submit" fullWidth loading={tx.isPending}>
                  Donner
                </Button>
              </form>
            </>
          )}
        </div>
      </Card>
      {mobileActionBar}
    </>
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
    } else {
      toast.error(
        "La demande n'a pas été créée",
        "La transaction a échoué, aucun retrait n'a été demandé.",
      );
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

        <SigningPreview
          preview={
            amount
              ? `Vous allez demander ${amount} ETH à la campagne, pour le motif « ${reason.trim() || '…'} ».`
              : "Vous allez demander un retrait à la campagne pour vos donateurs."
          }
          status={tx.status}
          error={tx.error}
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
  const [confirmed, setConfirmed] = useState(null);

  const donorCount = project.donors.length;
  const quorumReached = request.approvals * 2 >= donorCount;
  const canVote =
    Boolean(account) &&
    !request.executed &&
    !request.hasVoted &&
    (project.contributions ?? 0n) > 0n;
  const canWithdraw =
    isCreator && !request.executed && quorumReached && donorCount > 0;

  const run = async (action, successTitle, successText, preview) => {
    const result = await tx.run(action);
    if (result.ok) {
      setConfirmed(preview);
      toast.success(successTitle, successText);
      onDone();
    } else {
      toast.error(
        "L'action n'a pas abouti",
        "La transaction a échoué, rien n'a été modifié.",
      );
    }
    return result;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tabular-nums text-slate-900">
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
            {plural(request.approvals, 'vote')} sur {plural(donorCount, 'donateur')}
          </span>
          <span>Destinataire : {request.recipient.slice(0, 6)}…</span>
        </div>
        <ProgressBar
          className="mt-2"
          raised={BigInt(request.approvals)}
          goal={BigInt(Math.max(donorCount, 1))}
          label="Approbations de la demande"
          tone={quorumReached ? 'success' : 'primary'}
        />
      </div>

      {request.hasVoted && !request.executed ? (
        <p className="mt-3 text-xs font-medium text-emerald-700">
          Votre vote est enregistré.
        </p>
      ) : null}

      {confirmed ? (
        <ConfirmationState
          className="mt-3"
          title="Merci ! Votre action est confirmée"
          message={confirmed}
          shareUrl={
            typeof window !== 'undefined' ? window.location.href : undefined
          }
          campaignAddress={project.address}
        />
      ) : (
        <>
          <SigningPreview
            className="mt-3"
            preview={
              canVote
                ? `Vous allez voter pour approuver la demande #${request.id} de ${formatEth(
                    request.amount,
                  )} ETH.`
                : `La demande #${request.id} de ${formatEth(
                    request.amount,
                  )} ETH est ouverte au vote des donateurs.`
            }
            status={tx.status}
            error={tx.error}
          />

          {tx.error ? (
            <Alert tone="rose" className="mt-3">
              {tx.error}
            </Alert>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {canVote ? (
              <Button
                size="sm"
                loading={tx.isPending}
                onClick={() =>
                  run(
                    async () => {
                      const signer = await getSigner();
                      return voteWithdrawRequest(project.address, request.id, signer);
                    },
                    'Vote enregistré',
                    `Demande #${request.id} approuvée.`,
                    `Votre vote pour la demande #${request.id} de ${formatEth(
                      request.amount,
                    )} ETH est enregistré sur la chaîne locale.`,
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
                    `${formatEth(request.amount)} ETH ont été envoyés au destinataire de la demande #${request.id}.`,
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
        </>
      )}
    </div>
  );
}

function RefundCard({ project, onDone }) {
  const toast = useToast();
  const tx = useTransaction();
  const [confirmed, setConfirmed] = useState(false);

  const submit = async () => {
    const result = await tx.run(async () => {
      const signer = await getSigner();
      return refund(project.address, signer);
    });

    if (result.ok) {
      setConfirmed(true);
      toast.success(
        'Remboursement reçu',
        `${formatEth(project.contributions)} ETH récupérés.`,
      );
      onDone();
    } else {
      toast.error(
        "Le remboursement n'a pas abouti",
        "La transaction a échoué, vos fonds restent dans le contrat.",
      );
    }
  };

  if (confirmed) {
    return (
      <ConfirmationState
        title={`Merci ! Votre remboursement de ${formatEth(
          project.contributions,
        )} ETH est confirmé`}
        message="Vos fonds ont été rendus sur la chaîne locale."
        shareUrl={
          typeof window !== 'undefined' ? window.location.href : undefined
        }
        campaignAddress={project.address}
      />
    );
  }

  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-900">
        Campagne échouée
      </h2>
      <p className="mt-2 text-sm tabular-nums text-slate-600">
        L'objectif n'a pas été atteint. Vous pouvez récupérer votre
        contribution de {formatEth(project.contributions)} ETH.
      </p>

      <SigningPreview
        className="mt-3"
        preview={`Vous allez récupérer ${formatEth(project.contributions)} ETH sur la chaîne locale.`}
        status={tx.status}
        error={tx.error}
      />

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
        <span className="tabular-nums">
          Rembourser {formatEth(project.contributions)} ETH
        </span>
      </Button>
    </Card>
  );
}

/**
 * Texte de la section « Demandes de retrait » quand aucune demande n'existe.
 * Le contrat ne passe en « Réussie » qu'après la date limite, même si
 * l'objectif est déjà dépassé : le message doit le dire, sinon un créateur
 * qui a collecté 7 ETH pour un objectif de 5 croit que le bouton manque.
 */
function withdrawalEmptyCopy(project) {
  if (project.status === 2) {
    return {
      title: "Le créateur n'a pas encore créé de demande.",
      description:
        'Dès qu’une demande est créée, les donateurs peuvent voter pour l’approuver.',
    };
  }

  if (project.status === 1) {
    return {
      title: "Campagne échouée : aucun retrait n'est possible.",
      description:
        'Les fonds restent sur le contrat et chaque donateur peut les récupérer.',
    };
  }

  if (project.totalRaised >= project.goal) {
    return {
      title: 'Objectif atteint : la demande de retrait s’ouvrira à la date limite.',
      description:
        'Le contrat ne passe en « Réussie » qu’une fois la date limite atteinte, même si l’objectif est déjà dépassé.',
    };
  }

  return {
    title: 'Les demandes de retrait seront disponibles si la campagne réussit.',
    description:
      'Il faut atteindre l’objectif avant la date limite pour que les fonds soient retirables.',
  };
}

export default function ProjectPage() {
  const { address } = useParams();
  const wallet = useWallet();
  const toast = useToast();
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

  // Le compte à rebours suit l'horloge de la blockchain, pas celle du
  // navigateur : sur le réseau local, `npm run ff` avance le temps de la
  // chaîne. Au chargement, deadline - timeLeft donne l'heure vue par le
  // contrat ; si elle est en avance sur le navigateur, on avance la date
  // limite affichée d'autant. Une campagne terminée affiche « Terminée ».
  const countdownDeadline = useMemo(() => {
    if (!project) return null;
    if (project.status !== 0) return 0;

    const deadlineSeconds = Number(project.deadline);
    const timeLeft = Number(project.timeLeft);
    if (!Number.isFinite(timeLeft)) return deadlineSeconds;

    const browserNow = Math.floor(Date.now() / 1000);
    const chainAhead = Math.max(0, deadlineSeconds - timeLeft - browserNow);
    return deadlineSeconds - chainAhead;
  }, [project]);

  if (!validAddress) {
    return (
      <EmptyState
        title="Campagne introuvable"
        description="Cette adresse ne correspond pas à une campagne valide."
        action={
          <Link to="/" className="text-sm font-semibold text-emerald-700">
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
  // Clé liée au compte : quand l'utilisateur change de compte dans MetaMask,
  // les cartes d'action repartent de zéro. Sans elle, l'écran « Merci ! » du
  // compte précédent resterait affiché et cacherait Donner, Voter, Retirer
  // ou Rembourser au nouveau compte jusqu'au rechargement de la page.
  const accountKey = wallet.account?.toLowerCase() ?? 'visiteur';
  const tone =
    project.status === 2 ? 'success' : project.status === 1 ? 'failed' : 'primary';

  const shareCampaign = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(
        'Lien copié',
        'Le lien de la campagne est dans le presse-papiers.',
      );
    } catch {
      toast.error('Copie impossible', 'Le lien n’a pas pu être copié.');
    }
  };

  return (
    // `pb-24` réserve la place de la barre d'action fixe sur mobile.
    <div className="space-y-8 pb-24 lg:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-semibold text-slate-600 transition hover:text-emerald-700"
        >
          ← Toutes les campagnes
        </Link>
        <Button variant="secondary" size="sm" onClick={shareCampaign}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 10.5v6.75A2.25 2.25 0 0 0 9.75 19.5h8.25a2.25 2.25 0 0 0 2.25-2.25V9a2.25 2.25 0 0 0-2.25-2.25H14.5m-7-4.25L4.5 5.5l3 2.75m0-5.5v5.5h5.5"
            />
          </svg>
          Partager
        </Button>
      </div>

      <CampaignBanner address={project.address} size="lg" />

      {status === 'error' ? (
        <Alert tone="amber" title="Données peut-être obsolètes">
          {error}
        </Alert>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-8">
        <div className="space-y-6">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
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
              <span>
                <Countdown deadline={countdownDeadline} />
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-600 shadow-sm">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                Réseau {CHAIN_ID}
              </span>
              <span className="inline-flex items-center gap-1.5">
                Adresse de la campagne
                <CopyAddress
                  value={project.address}
                  label="l'adresse de la campagne"
                />
              </span>
            </div>
            <ProgressBar
              raised={project.totalRaised}
              goal={project.goal}
              tone={tone}
            />
            <p className="text-sm font-medium tabular-nums text-slate-600">
              {remainingLabel(project.totalRaised, project.goal)}
            </p>
          </header>
          <Card>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              À propos du projet
            </h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-slate-600">
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
                value={
                  project.status === 0 ? (
                    <Countdown deadline={countdownDeadline} />
                  ) : (
                    'Terminée'
                  )
                }
              />
            </dl>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Demande{project.withdrawRequests.length > 1 ? 's' : ''} de retrait
              </h2>
              <span className="text-xs text-slate-500">
                Quorum : 50 % des donateurs
              </span>
            </div>

            {project.withdrawRequests.length === 0 ? (
              <EmptyState
                className="mt-4"
                title={withdrawalEmptyCopy(project).title}
                description={withdrawalEmptyCopy(project).description}
              />
            ) : (
              <div className="mt-4 space-y-3">
                {project.withdrawRequests.map((request) => (
                  <RequestCard
                    key={`${request.id}-${accountKey}`}
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
                <CreateRequestForm
                  key={accountKey}
                  project={project}
                  onDone={reload}
                />
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Donateurs
              </h2>
              <span className="text-xs text-slate-500">
                {project.donors.length} au total
              </span>
            </div>

            {project.donors.length === 0 ? (
              <EmptyState
                className="mt-4"
                title="Aucun don pour le moment. Soyez le premier à soutenir ce projet."
              />
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {project.donors.slice(0, 50).map((donor) => (
                  <li
                    key={donor.address}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <DonorAvatars donors={[donor]} max={1} />
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
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
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

          <Faq />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
          <DonateCard key={accountKey} project={project} onDone={reload} />
          {project.status === 1 && (project.contributions ?? 0n) > 0n ? (
            <RefundCard key={accountKey} project={project} onDone={reload} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
