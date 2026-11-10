import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';

vi.mock('../web3/projects', () => ({
  loadProjects: vi.fn(),
}));

vi.mock('../hooks/useChainEvents', () => ({
  useFactoryEvents: vi.fn(),
}));

import { loadProjects } from '../web3/projects';

const FACTORY_PROJECTS = [
  {
    address: '0x1111111111111111111111111111111111111111',
    creator: '0x2222222222222222222222222222222222222222',
    title: 'Atelier vélo',
    description: 'Un atelier de réparation pour les étudiants.',
    goal: 5_000_000_000_000_000_000n,
    minContribution: 100_000_000_000_000_000n,
    deadline: 2_000_000_000n,
    totalRaised: 2_500_000_000_000_000_000n,
    status: 0,
    donors: ['0x3333333333333333333333333333333333333333'],
    timeLeft: 3_600n,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche les campagnes chargées depuis la chaîne', async () => {
    loadProjects.mockResolvedValue({ projects: FACTORY_PROJECTS, failed: 0 });

    renderPage();

    expect(await screen.findByText('Atelier vélo')).toBeInTheDocument();
    expect(screen.getByText('Voir la campagne')).toBeInTheDocument();
    expect(screen.getAllByText('Campagnes').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Total collecté')).toBeInTheDocument();
  });

  it('affiche un état vide quand la fabrique ne contient aucune campagne', async () => {
    loadProjects.mockResolvedValue({ projects: [], failed: 0 });

    renderPage();

    expect(
      await screen.findByText('Aucune campagne pour le moment'),
    ).toBeInTheDocument();
  });

  it('affiche une erreur et permet de réessayer', async () => {
    loadProjects
      .mockRejectedValueOnce(new Error('RPC indisponible'))
      .mockResolvedValueOnce({ projects: FACTORY_PROJECTS, failed: 0 });

    renderPage();

    expect(
      await screen.findByText('Impossible de charger les campagnes'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    await waitFor(() => expect(loadProjects).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Atelier vélo')).toBeInTheDocument();
  });
});
