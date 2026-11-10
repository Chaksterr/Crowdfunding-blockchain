import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Alert from "../components/ui/Alert";
import Button, { buttonClass } from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import ProjectCard from "../components/ProjectCard";
import { useAsyncData } from "../hooks/useAsyncData";
import { useFactoryEvents } from "../hooks/useChainEvents";
import { loadProjects } from "../web3/projects";
import { formatEthCompact, plural } from "../web3/format";

const FILTERS = [
  { id: "active", label: "En cours", status: 0 },
  { id: "succeeded", label: "Réussies", status: 2 },
  { id: "failed", label: "Échouées", status: 1 },
];

const SORTS = [
  { id: "recent", label: "Récemment créées" },
  { id: "raised", label: "Plus collecté" },
  { id: "remaining", label: "Temps restant" },
];

function ProjectSkeleton() {
  return (
    <Card className="animate-pulse" padded={false}>
      <div className="h-28 w-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200" />
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="w-full space-y-2">
            <div className="h-5 w-2/3 rounded bg-slate-200" />
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-4/5 rounded bg-slate-100" />
          </div>
          <div className="h-6 w-20 rounded-full bg-slate-100" />
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-10 rounded bg-slate-100" />
          <div className="h-10 rounded bg-slate-100" />
        </div>
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
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">
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

  const [filter, setFilter] = useState("active");
  const [sort, setSort] = useState("recent");

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

  const counts = useMemo(() => {
    return {
      active: projects.filter((project) => project.status === 0).length,
      succeeded: projects.filter((project) => project.status === 2).length,
      failed: projects.filter((project) => project.status === 1).length,
    };
  }, [projects]);

  const visibleProjects = useMemo(() => {
    const wanted = FILTERS.find((item) => item.id === filter)?.status;
    const filtered = projects.filter((project) => project.status === wanted);

    const sorted = [...filtered];
    if (sort === "raised") {
      sorted.sort((a, b) => (b.totalRaised > a.totalRaised ? 1 : b.totalRaised < a.totalRaised ? -1 : 0));
    } else if (sort === "remaining") {
      sorted.sort((a, b) => Number(a.timeLeft) - Number(b.timeLeft));
    } else {
      sorted.sort((a, b) => Number(b.deadline) - Number(a.deadline));
    }

    return sorted;
  }, [projects, filter, sort]);

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-6 py-10 shadow-sm sm:px-10 sm:py-12">
        <span
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-200/50 to-teal-100/40"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-gradient-to-tr from-amber-200/40 to-orange-100/30"
          aria-hidden="true"
        />
        <div className="relative max-w-3xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            <span className="h-px w-6 bg-emerald-300" aria-hidden="true" />
            Campagnes
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Des projets financés par la communauté
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
            Chaque campagne est un contrat autonome : les fonds sont bloqués
            jusqu'à la date limite, puis remboursés ou débloqués après un vote
            des donateurs.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/create" className={buttonClass({ variant: "primary", size: "lg" })}>
              Créer une campagne
            </Link>
            <Button
              variant="secondary"
              size="lg"
              onClick={reload}
              loading={isRefreshing}
              disabled={isLoading}
            >
              Actualiser
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
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
          {plural(failed, "campagne")} n'a pas pu être lue. Les autres restent
          affichées.
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
        <section className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Campagnes
            </h2>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div
                role="group"
                aria-label="Filtrer les campagnes par état"
                className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
              >
                {FILTERS.map((item) => {
                  const isActive = filter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFilter(item.id)}
                      aria-pressed={isActive}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        aria-hidden="true"
                        className={`ml-1.5 tabular-nums ${
                          isActive ? "text-emerald-100" : "text-slate-400"
                        }`}
                      >
                        {counts[item.id]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="sr-only sm:not-sr-only">Trier</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  {SORTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {visibleProjects.length === 0 ? (
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
              {visibleProjects.map((project, index) => (
                <div
                  key={project.address}
                  className="animate-rise"
                  style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                >
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {status === "success" && isRefreshing ? (
        <p className="text-center text-xs text-slate-500" role="status">
          Mise à jour des campagnes…
        </p>
      ) : null}
    </div>
  );
}
