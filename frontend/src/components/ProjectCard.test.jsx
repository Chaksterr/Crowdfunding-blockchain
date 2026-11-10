import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { parseEther } from 'ethers';
import ProjectCard from './ProjectCard';

const project = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  creator: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  title: 'Atelier vélo solidaire',
  description: 'Un atelier de réparation ouvert aux étudiants.',
  goal: parseEther('5'),
  minContribution: parseEther('0.1'),
  deadline: 1700000000n,
  totalRaised: parseEther('2.5'),
  status: 0,
  donors: ['0x1111111111111111111111111111111111111111'],
  timeLeft: 3600n,
};

function renderCard(overrides = {}) {
  return render(
    <MemoryRouter>
      <ProjectCard project={{ ...project, ...overrides }} />
    </MemoryRouter>,
  );
}

describe('ProjectCard', () => {
  it('affiche le titre, le statut, le montant et la progression', () => {
    renderCard();

    expect(
      screen.getByRole('heading', { name: 'Atelier vélo solidaire' }),
    ).toBeInTheDocument();
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.getByText('2,5 ETH')).toBeInTheDocument();
    expect(screen.getByText(/50\s% de 5 ETH/)).toBeInTheDocument();
    expect(screen.getByText('1 donateur')).toBeInTheDocument();
  });

  it('pointe vers la page de détail', () => {
    renderCard();
    expect(
      screen.getByRole('link', { name: 'Voir la campagne' }),
    ).toHaveAttribute('href', `/project/${project.address}`);
  });

  it('affiche le statut échoué et le nombre de donateurs au pluriel', () => {
    renderCard({
      status: 1,
      donors: [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ],
    });

    expect(screen.getByText('Échouée')).toBeInTheDocument();
    expect(screen.getByText('2 donateurs')).toBeInTheDocument();
  });
});
