import { Link } from "react-router-dom";
import { formatEther } from "ethers";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import CampaignBanner from "./CampaignBanner";
import CountUp from "./CountUp";
import DonorAvatars from "./DonorAvatars";
import ProgressBar from "./ProgressBar";
import {
  formatDeadline,
  formatEth,
  formatEthNumber,
  formatPercent,
  plural,
  remainingLabel,
  timeLeftLabel,
} from "../web3/format";

export default function ProjectCard({ project }) {
  const tone =
    project.status === 2 ? "success" : project.status === 1 ? "failed" : undefined;

  const raisedEth = Number(formatEther(project.totalRaised));
  const isActive = project.status === 0;

  return (
    <Card
      as="article"
      padded={false}
      className="group relative flex h-full flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2 focus-within:ring-offset-white"
    >
      <CampaignBanner address={project.address}>
        <span className="absolute right-3 top-3">
          <Badge
            status={project.status}
            className="ring-2 ring-white/60 shadow-sm"
          />
        </span>
      </CampaignBanner>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900 transition group-hover:text-emerald-700">
            {project.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {project.description}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              <CountUp
                value={raisedEth}
                format={(value) => formatEthNumber(value)}
                suffix=" ETH"
              />
            </p>
            <DonorAvatars donors={project.donors} />
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">
              {plural(project.donors.length, "donateur")}
            </span>
            <span className="tabular-nums">
              {formatPercent(project.totalRaised, project.goal)} de{" "}
              {formatEth(project.goal)} ETH
            </span>
          </div>

          <ProgressBar
            raised={project.totalRaised}
            goal={project.goal}
            tone={tone}
            label={`Progression de ${project.title}`}
          />

          <p className="text-xs font-medium tabular-nums text-slate-500">
            {remainingLabel(project.totalRaised, project.goal)}
          </p>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
          <div>
            <dt className="font-medium text-slate-500">Date limite</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">
              {formatDeadline(project.deadline)}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Temps restant</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">
              {timeLeftLabel(project.timeLeft)}
            </dd>
          </div>
        </dl>

        {/* Lien étiré : toute la carte est cliquable. Le libellé accessible
            du lien reste « Voir la campagne », l'action visible est « Donner ». */}
        <div className="mt-auto pt-5">
          <Link
            to={`/project/${project.address}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-sm transition after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {isActive ? (
              <>
                <span className="sr-only">Voir la campagne</span>
                <span
                  aria-hidden="true"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-600 text-white shadow-emerald-600/20 transition group-hover:bg-emerald-700"
                >
                  Donner
                </span>
              </>
            ) : (
              <span className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700">
                Voir la campagne
              </span>
            )}
          </Link>
        </div>
      </div>
    </Card>
  );
}
