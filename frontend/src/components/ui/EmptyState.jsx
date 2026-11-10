function DefaultIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 7.5 12 3l8.25 4.5v9L12 21l-8.25-4.5v-9Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3.75 7.5 8.25 4.5 8.25-4.5M12 12v9"
      />
    </svg>
  );
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center sm:py-16',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
        {icon ?? <DefaultIcon />}
      </span>

      {title && (
        <h2 className="max-w-md text-base font-semibold text-slate-900">
          {title}
        </h2>
      )}

      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
