import { Link } from 'react-router-dom';
import { buttonClass } from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center sm:py-24">
      <p className="font-mono text-6xl font-semibold tracking-tight text-indigo-200 sm:text-7xl">
        404
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
        Page introuvable
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Cette page n’existe pas ou a été déplacée. Vérifiez l’adresse ou revenez
        à la liste des campagnes.
      </p>
      <Link to="/" className={`${buttonClass()} mt-6`}>
        Retour à l’accueil
      </Link>
    </div>
  );
}
