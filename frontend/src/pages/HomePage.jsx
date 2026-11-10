import { useEffect } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Alert from "../components/ui/Alert";
import Button, { buttonClass } from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import ProjectCard from "../components/ProjectCard";
import { useAsyncData } from "../hooks/useAsyncData";
import { useFactoryEvents } from "../hooks/useChainEvents";
import { loadProjects } from "../web3/projects";
import { formatEthCompact } from "../web3/format";

function ProjectSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2">
          <div className="h-5 w-2/3 rounded bg-slate-200" />
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-4/5 rounded bg-slate-100" />
        </div>
        <div className="h-6 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="mt-6 h-2 w-full rounded-full bg-slate-100" />
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="h-10 rounded bg-slate-100" />
        <div className="h-10 rounded bg-slate-100" />
      </div>
    </Card>
  );
}

function Stat({ label, value, hint }) {
  return (
    <Card className="flex flex-col justify-between" padded>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}

export default function HomePage() {
  const { data, status, error, reload, isLoading, isRefreshing } = useAsyncData(
    () => loadProjects(),
    []
  );

  useFactoryEvents(reload, status !== "error");

  useEffect(() => {
    const timer = window.setInterval(() => reload(), 20000);
    return () => window.clearInterval(timer);
  }, [reload]);

  const projects = data?.projects ?? [];
  const failed = data?.failed ?? 0;
  const totalRaised = projects.reduce(
    (sum, project) => sum + project.totalRaised,
    0n
  );
  const active = projects.filter((project) => project.status === 0).length;

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        eyebrow="Campagnes"
        title="Des projets financés par la communauté"
        description="Chaque campagne est un contrat autonome : les fonds sont bloqués jusqu'à la date limite, puis remboursés ou débloqués après un vote des donateurs."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={reload}
              loading={isRefreshing}
              disabled={isLoading}
            >
              Actualiser
            </Button>
            <Link to="/create" className={buttonClass({ variant: "primary" })}>
              Créer une campagne
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Campagnes"
          value={isLoading ? "—" : projects.length}
          hint={`${active} en cours`}
        />
        <Stat
          label="Total collecté"
          value={isLoading ? "—" : `${formatEthCompact(totalRaised)} ETH`}
          hint="Toutes campagnes confondues"
        />
        <Stat
          label="Donateurs"
          value={
            isLoading
              ? "—"
              : projects.reduce((sum, project) => sum + project.donors.length, 0)
          }
          hint="Participations enregistrées"
        />
      </div>

      {error ? (
        <Alert tone="rose" title="Impossible de charger les campagnes">
          <p>{error}</p>
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={reload}>
              Réessayer
            </Button>
          </div>
        </Alert>
      ) : null}

      {failed > 0 ? (
        <Alert tone="amber" title="Certaines campagnes sont indisponibles">
          {failed} campagne{failed > 1 ? "s" : ""} n'a pas pu être lue. Les
          autres restent affichées.
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <ProjectSkeleton />
          <ProjectSkeleton />
          <ProjectSkeleton />
        </div>
      ) : projects.length === 0 && !error ? (
        <EmptyState
          title="Aucune campagne pour le moment"
          description="Créez la première campagne ou lancez npm run seed pour charger les données de démonstration."
          action={
            <Link to="/create" className={buttonClass({ variant: "primary" })}>
              Créer une campagne
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.address} project={project} />
          ))}
        </div>
      )}

      {status === "success" && isRefreshing ? (
        <p className="text-center text-xs text-slate-500" role="status">
          Mise à jour des campagnes…
        </p>
      ) : null}
    </div>
  );
}
