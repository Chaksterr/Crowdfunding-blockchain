import { Link } from "react-router-dom";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
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
    project.status === 2 ? "success" : project.status === 1 ? "failed" : "indigo";

  return (
    <Card
      as="article"
      className="group flex h-full flex-col transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900">
            <Link
              to={`/project/${project.address}`}
              className="rounded-sm hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {project.title}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {project.description}
          </p>
        </div>
        <Badge status={project.status} className="shrink-0" />
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-slate-500">Collecté</span>
          <span className="font-semibold text-slate-900">
            {formatEth(project.totalRaised)} ETH
          </span>
        </div>
        <ProgressBar
          raised={project.totalRaised}
          goal={project.goal}
          tone={tone}
          label={`Progression de ${project.title}`}
        />
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {formatPercent(project.totalRaised, project.goal)} de{" "}
            {formatEth(project.goal)} ETH
          </span>
          <span>
            {project.donors.length} donateur
            {project.donors.length > 1 ? "s" : ""}
          </span>
        </div>
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
    </Card>
  );
}
