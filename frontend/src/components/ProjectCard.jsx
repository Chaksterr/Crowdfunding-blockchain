import { Link } from "react-router-dom";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import CampaignBanner from "./CampaignBanner";
import DonorAvatars from "./DonorAvatars";
import ProgressBar from "./ProgressBar";
import { buttonClass } from "./ui/Button";
import {
  formatDeadline,
  formatEth,
  formatPercent,
  timeLeftLabel,
} from "../web3/format";

export default function ProjectCard({ project }) {
  const tone =
    project.status === 2 ? "success" : project.status === 1 ? "failed" : undefined;

  return (
    <Card
      as="article"
      padded={false}
      className="group flex h-full flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <CampaignBanner address={project.address}>
        <span className="absolute right-3 top-3">
          <Badge status={project.status} />
        </span>
      </CampaignBanner>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900">
            <Link
              to={`/project/${project.address}`}
              className="rounded-sm hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {project.title}
            </Link>
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {project.description}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              {formatEth(project.totalRaised)} ETH
            </p>
            <DonorAvatars donors={project.donors} />
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">
              {project.donors.length} donateur
              {project.donors.length > 1 ? "s" : ""}
            </span>
            <span>
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

        <div className="mt-auto pt-5">
          <Link
            to={`/project/${project.address}`}
            className={buttonClass({ variant: "secondary", fullWidth: true })}
          >
            Voir la campagne
          </Link>
        </div>
      </div>
    </Card>
  );
}
