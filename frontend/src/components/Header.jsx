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
    shortLabel: 'Dons',
  },
];

function navLinkClass({ isActive }) {
  return [
    'inline-flex min-h-11 shrink-0 items-center rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    isActive
      ? 'bg-emerald-50 text-emerald-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');
}

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label="Cagnotte — retour à l’accueil"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 transition-colors group-hover:bg-emerald-700">
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
          <span className="hidden flex-col leading-none lg:flex">
            <span className="text-base font-semibold tracking-tight text-slate-900">
              Cagnotte
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
              Financement participatif
            </span>
          </span>
          {/* Sur mobile, seule la marque suffit : la navigation garde la place. */}
          <span className="sr-only lg:hidden">Cagnotte</span>
        </Link>

        {/* La navigation reste un enfant flex sur mobile et tablette (pas de
            centrage absolu avant lg) : plus de pincement entre 640 et 768 px.
            Sur les écrans étroits elle défile horizontalement, avec un dégradé
            qui signale la fin de la liste. */}
        <nav
          aria-label="Navigation principale"
          className="nav-scroll -mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 lg:absolute lg:left-1/2 lg:top-1/2 lg:m-0 lg:flex-none lg:translate-x-[-50%] lg:translate-y-[-50%] lg:overflow-visible lg:px-0"
        >
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              aria-label={link.label}
              className={navLinkClass}
            >
              <span className="lg:hidden">{link.shortLabel}</span>
              <span className="hidden lg:inline">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto shrink-0">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
