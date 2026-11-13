import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { parseEther } from 'ethers';
import { ToastProvider } from '../components/ToastProvider';
import ProjectPage from './ProjectPage';
import { donate, loadProject } from '../web3/projects';
import { useWallet } from '../hooks/useWallet';

vi.mock('../web3/projects', () => ({
  loadProject: vi.fn(),
  donate: vi.fn(),
  createWithdrawRequest: vi.fn(),
  voteWithdrawRequest: vi.fn(),
  withdrawRequestedAmount: vi.fn(),
  refund: vi.fn(),
}));

vi.mock('../hooks/useWallet', () => ({ useWallet: vi.fn() }));
vi.mock('../hooks/useChainEvents', () => ({ useProjectEvents: vi.fn() }));
vi.mock('../web3/provider', () => ({ getSigner: vi.fn() }));

const PROJECT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const CREATOR = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const DONOR = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const OTHER_DONOR = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

function makeProject(overrides = {}) {
  return {
    address: PROJECT_ADDRESS,
    creator: CREATOR,
    title: 'Atelier vélo',
    description: 'Un atelier de réparation de vélos pour les étudiants.',
    goal: parseEther('5'),
    minContribution: parseEther('0.1'),
    deadline,
    totalRaised: parseEther('2.5'),
    status: 0,
    donors: [{ address: DONOR, amount: parseEther('2.5') }],
    timeLeft: 3600n,
    balance: parseEther('2.5'),
    contributions: 0n,
    withdrawRequestsCount: 0,
    withdrawRequests: [],
    ...overrides,
  };
}

function pageTree() {
  return (
    <ToastProvider>
      <MemoryRouter initialEntries={[`/project/${PROJECT_ADDRESS}`]}>
        <Routes>
          <Route path="/project/:address" element={<ProjectPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

function renderPage() {
  return render(pageTree());
}

function mockWallet(overrides = {}) {
  useWallet.mockReturnValue({
    account: null,
    chainId: 31338,
    balance: '0',
    status: 'disconnected',
    isConnected: false,
    isConnecting: false,
    isWrongNetwork: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    refreshBalance: vi.fn(),
    switchNetwork: vi.fn(),
    error: null,
    clearError: vi.fn(),
    ...overrides,
  });
}

describe('ProjectPage', () => {
  it('invite à connecter le portefeuille et masque le don quand aucun compte n’est connecté', async () => {
    mockWallet();
    loadProject.mockResolvedValue(makeProject());

    renderPage();

    expect(await screen.findByText('Atelier vélo')).toBeInTheDocument();
    expect(
      screen.getByText(/Connectez votre portefeuille pour envoyer un don/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Donner/ })).not.toBeInTheDocument();
  });

  it('affiche le formulaire de don pour une campagne en cours quand le portefeuille est connecté', async () => {
    mockWallet({ account: DONOR, status: 'connected', isConnected: true });
    loadProject.mockResolvedValue(makeProject({ contributions: parseEther('1') }));

    renderPage();

    expect(await screen.findByText('Atelier vélo')).toBeInTheDocument();
    expect(screen.getByLabelText(/Montant du don/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Donner/ })).toBeInTheDocument();
    expect(screen.getByText(/Votre contribution actuelle/i)).toBeInTheDocument();
  });

  it('affiche le formulaire de demande de retrait au créateur d’une campagne réussie', async () => {
    mockWallet({ account: CREATOR, status: 'connected', isConnected: true });
    loadProject.mockResolvedValue(
      makeProject({
        status: 2,
        contributions: 0n,
        withdrawRequestsCount: 1,
        withdrawRequests: [
          {
            id: 0,
            amount: parseEther('2'),
            reason: 'Achat du matériel',
            recipient: CREATOR,
            approvals: 0,
            executed: false,
            hasVoted: false,
          },
        ],
      }),
    );

    renderPage();

    expect(await screen.findByText('Atelier vélo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer la demande' })).toBeInTheDocument();
    expect(screen.getByText('Achat du matériel')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voter' })).not.toBeInTheDocument();
  });

  it('propose le remboursement à un donateur d’une campagne échouée', async () => {
    mockWallet({ account: DONOR, status: 'connected', isConnected: true });
    loadProject.mockResolvedValue(
      makeProject({ status: 1, contributions: parseEther('2') }),
    );

    renderPage();

    expect(await screen.findByText('Atelier vélo')).toBeInTheDocument();
    expect(screen.getAllByText('Campagne échouée').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: /Rembourser/i })).toBeInTheDocument();
  });

  it('ne propose pas de remboursement sans contribution', async () => {
    mockWallet({ account: DONOR, status: 'connected', isConnected: true });
    loadProject.mockResolvedValue(
      makeProject({ status: 1, contributions: 0n }),
    );

    renderPage();

    expect(await screen.findByText('Atelier vélo')).toBeInTheDocument();
    expect(screen.queryByText(/L'objectif n'a pas été atteint/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rembourser/i })).not.toBeInTheDocument();
  });

  it('réaffiche le formulaire de don quand on change de compte après un don', async () => {
    const user = userEvent.setup();
    mockWallet({ account: DONOR, status: 'connected', isConnected: true });
    loadProject.mockResolvedValue(makeProject());
    donate.mockResolvedValue({ status: 1 });

    const { rerender } = renderPage();
    const amount = await screen.findByLabelText(/Montant du don/i);
    await user.clear(amount);
    await user.type(amount, '1');
    await user.click(screen.getByRole('button', { name: /^Donner/ }));
    expect(
      await screen.findByText(/Merci ! Votre don de 1 ETH est confirmé/),
    ).toBeInTheDocument();

    // Démo : on passe au donateur suivant dans MetaMask, sans recharger.
    mockWallet({ account: OTHER_DONOR, status: 'connected', isConnected: true });
    rerender(pageTree());

    expect(await screen.findByLabelText(/Montant du don/i)).toBeInTheDocument();
    expect(screen.queryByText(/Merci ! Votre don/)).not.toBeInTheDocument();
  });

  it('aligne le compte à rebours sur l’horloge de la blockchain', async () => {
    mockWallet();
    const now = Math.floor(Date.now() / 1000);
    // `npm run ff` a avancé la chaîne de 10 min : le contrat voit 5 min
    // restantes alors que l'horloge du navigateur en voit 15.
    loadProject.mockResolvedValue(
      makeProject({ deadline: BigInt(now + 930), timeLeft: 330n }),
    );

    renderPage();

    expect(await screen.findByText('Atelier vélo')).toBeInTheDocument();
    expect(screen.getAllByText('5 min restantes').length).toBeGreaterThan(0);
    expect(screen.queryByText('15 min restantes')).not.toBeInTheDocument();
  });

  it('affiche « Terminée » pour une campagne finie, même si le navigateur est en retard', async () => {
    mockWallet();
    const now = Math.floor(Date.now() / 1000);
    loadProject.mockResolvedValue(
      makeProject({ status: 2, deadline: BigInt(now + 600), timeLeft: 0n }),
    );

    renderPage();

    expect(await screen.findByText('Atelier vélo')).toBeInTheDocument();
    expect(screen.queryByText(/restantes/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Terminée').length).toBeGreaterThanOrEqual(2);
  });
});
