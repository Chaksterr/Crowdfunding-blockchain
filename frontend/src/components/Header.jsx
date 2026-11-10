import { Link, NavLink } from 'react-router-dom';
import WalletButton from './WalletButton';

const NAV_LINKS = [
  { to: '/', label: 'Accueil', shortLabel: 'Accueil', end: true },
  {
    to: '/create',
    label: 'Créer une campagne',
    shortLabel: 'Créer',
  },
  {
    to: '/my-contributions',
    label: 'Mes contributions',
    shortLabel: 'Contributions',
  },
];

function navLinkClass({ isActive }) {
  return [
    'inline-flex min-h-11 shrink-0 items-center rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');
}

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0 lg:px-8">
        <Link
          to="/"
          className="group flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          aria-label="Cagnotte — retour à l’accueil"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition-colors group-hover:bg-indigo-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.25V9.75"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 12.75c0-3.31 2.75-6 6.75-6 0 3.31-3 6.75-6.75 6.75Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15.75c0-2.9-2.35-5.25-5.75-5.25 0 3.31 2.35 5.25 5.75 5.25Z"
              />
              <path strokeLinecap="round" d="M7.5 20.25h9" />
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-base font-semibold tracking-tight text-slate-900">
              Cagnotte
            </span>
            <span className="mt-1 hidden text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 sm:block">
              Financement participatif
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navigation principale"
          className="order-3 flex w-full flex-wrap items-center gap-1 sm:order-none sm:mx-auto sm:w-auto"
        >
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              aria-label={link.label}
              className={navLinkClass}
            >
              <span className="sm:hidden">{link.shortLabel}</span>
              <span className="hidden sm:inline">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="order-2 ml-auto sm:order-none sm:ml-0">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
