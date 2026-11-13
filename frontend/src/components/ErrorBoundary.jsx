import { Component } from 'react';

/**
 * Filet de sécurité : une erreur d'affichage ne doit jamais laisser une page
 * blanche. En développement, le message est visible pour faciliter le debug.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Cagnotte] erreur de rendu', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 sm:p-8">
          <h1 className="text-lg font-semibold">
            L’interface a rencontré une erreur
          </h1>
          <p className="mt-2 text-sm leading-relaxed">
            Rechargez la page. Si le problème persiste, vérifiez que le nœud
            local est lancé et que MetaMask est configuré sur la chaîne 31338.
          </p>

          {import.meta.env.DEV && (
            <pre className="mt-4 overflow-auto rounded-xl bg-white/70 p-3 font-mono text-xs text-rose-900">
              {error.message}
            </pre>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }
}
