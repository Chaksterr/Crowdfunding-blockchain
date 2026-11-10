import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import Button, { buttonClass } from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import { useWallet } from "../hooks/useWallet";
import { useTransaction } from "../hooks/useTransaction";
import { useToast } from "../components/ToastProvider";
import { getSigner } from "../web3/provider";
import { createProject } from "../web3/projects";

const INITIAL = {
  title: "",
  description: "",
  goalEth: "",
  minContributionEth: "",
  durationMinutes: "10",
};

function validate(values) {
  const errors = {};
  const title = values.title.trim();
  const description = values.description.trim();
  const goal = Number(values.goalEth.replace(",", "."));
  const min = Number(values.minContributionEth.replace(",", "."));
  const duration = Number(values.durationMinutes);

  if (title.length < 3 || title.length > 80) {
    errors.title = "Le titre doit contenir entre 3 et 80 caractères.";
  }
  if (description.length < 10 || description.length > 500) {
    errors.description =
      "La description doit contenir entre 10 et 500 caractères.";
  }
  if (!Number.isFinite(goal) || goal <= 0) {
    errors.goalEth = "L'objectif doit être un montant supérieur à 0 ETH.";
  }
  if (!Number.isFinite(min) || min <= 0) {
    errors.minContributionEth =
      "Le don minimum doit être un montant supérieur à 0 ETH.";
  } else if (Number.isFinite(goal) && min > goal) {
    errors.minContributionEth =
      "Le don minimum ne peut pas dépasser l'objectif.";
  }
  if (
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 10080
  ) {
    errors.durationMinutes =
      "La durée doit être un nombre entier de minutes, entre 1 et 10 080 (7 jours).";
  }

  return errors;
}

export default function CreatePage() {
  const navigate = useNavigate();
  const { isConnected, isConnecting, isWrongNetwork, connect, switchNetwork } =
    useWallet();
  const toast = useToast();
  const tx = useTransaction();
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    tx.reset();
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const result = await tx.run(async () => {
      const signer = await getSigner();
      return createProject(
        {
          title: values.title.trim(),
          description: values.description.trim(),
          goalEth: values.goalEth,
          minContributionEth: values.minContributionEth,
          durationMinutes: values.durationMinutes,
        },
        signer
      );
    });

    if (result.ok) {
      toast.success(
        "Campagne créée",
        "Vous allez être redirigé vers la page de votre campagne."
      );
      navigate(`/project/${result.result}`);
    }
  };

  const goal = Number(values.goalEth.replace(",", "."));
  const min = Number(values.minContributionEth.replace(",", "."));
  const duration = Number(values.durationMinutes);

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        eyebrow="Nouvelle campagne"
        title="Lancer une collecte"
        description="L'objectif, le don minimum et la date limite sont enregistrés dans le contrat et ne pourront plus être modifiés."
        actions={
          <Link to="/" className={buttonClass({ variant: "ghost" })}>
            Retour aux campagnes
          </Link>
        }
      />

      {!isConnected ? (
        <Card className="mx-auto max-w-xl text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Connectez votre portefeuille
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            La création d'une campagne est une transaction signée par votre
            compte. MetaMask doit être connecté au réseau Hardhat local
            (chainId 31337).
          </p>
          <Button
            className="mt-5"
            onClick={connect}
            loading={isConnecting}
            fullWidth
          >
            Connecter MetaMask
          </Button>
        </Card>
      ) : isWrongNetwork ? (
        <Card className="mx-auto max-w-xl text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Réseau incorrect
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Passez sur Hardhat Local (chainId 31337) pour créer une campagne.
          </p>
          <Button className="mt-5" onClick={switchNetwork} fullWidth>
            Changer de réseau
          </Button>
        </Card>
      ) : (
        <form
          onSubmit={onSubmit}
          noValidate
          className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
        >
          <Card className="space-y-5">
            <Field
              id="title"
              label="Titre"
              hint="3 à 80 caractères. Il sera visible sur la carte de la campagne."
              error={errors.title}
              value={values.title}
              onChange={update("title")}
              maxLength={80}
              required
              autoComplete="off"
            />

            <Field
              id="description"
              as="textarea"
              rows={5}
              label="Description"
              hint={`${values.description.trim().length}/500 caractères. Expliquez le projet et l'usage des fonds.`}
              error={errors.description}
              value={values.description}
              onChange={update("description")}
              maxLength={500}
              required
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="goalEth"
                label="Objectif (ETH)"
                hint="Montant à atteindre avant la date limite."
                error={errors.goalEth}
                value={values.goalEth}
                onChange={update("goalEth")}
                inputMode="decimal"
                placeholder="5"
                required
              />
              <Field
                id="minContributionEth"
                label="Don minimum (ETH)"
                hint="Aucun don inférieur ne sera accepté."
                error={errors.minContributionEth}
                value={values.minContributionEth}
                onChange={update("minContributionEth")}
                inputMode="decimal"
                placeholder="0.1"
                required
              />
            </div>

            <Field
              id="durationMinutes"
              label="Durée (minutes)"
              hint="La date limite est calculée à la création. Pour une démo, 1 à 2 minutes suffisent."
              error={errors.durationMinutes}
              value={values.durationMinutes}
              onChange={update("durationMinutes")}
              type="number"
              min={1}
              max={10080}
              step={1}
              required
            />

            {tx.error ? (
              <Alert tone="rose" title="La campagne n'a pas été créée">
                {tx.error}
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <Link to="/" className={buttonClass({ variant: "secondary" })}>
                Annuler
              </Link>
              <Button type="submit" loading={tx.isPending}>
                Créer la campagne
              </Button>
            </div>
          </Card>

          <Card className="space-y-4 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Récapitulatif
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">Objectif</dt>
                <dd className="font-semibold text-slate-900">
                  {Number.isFinite(goal) && goal > 0 ? `${goal} ETH` : "—"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">Don minimum</dt>
                <dd className="font-semibold text-slate-900">
                  {Number.isFinite(min) && min > 0 ? `${min} ETH` : "—"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">Durée</dt>
                <dd className="font-semibold text-slate-900">
                  {Number.isInteger(duration) && duration > 0
                    ? `${duration} min`
                    : "—"}
                </dd>
              </div>
            </dl>
            <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-600">
              Les fonds restent dans le contrat. Après la date limite, ils sont
              remboursables si l'objectif n'est pas atteint, ou débloqués après
              un vote favorable des donateurs.
            </p>
          </Card>
        </form>
      )}
    </div>
  );
}
