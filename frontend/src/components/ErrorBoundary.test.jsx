import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Boom() {
  throw new Error('Rendu cassé');
}

describe('ErrorBoundary', () => {
  it('affiche ses enfants quand tout va bien', () => {
    render(
      <ErrorBoundary>
        <p>Contenu normal</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Contenu normal')).toBeInTheDocument();
  });

  it('remplace une page blanche par un message et un bouton de rechargement', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { name: 'L’interface a rencontré une erreur' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith(
      '[Cagnotte] erreur de rendu',
      expect.objectContaining({ message: 'Rendu cassé' }),
      expect.anything(),
    );
  });

  it('montre le détail de l’erreur en développement', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(import.meta.env.DEV).toBe(true);
    expect(screen.getByText('Rendu cassé')).toBeInTheDocument();
  });
});
