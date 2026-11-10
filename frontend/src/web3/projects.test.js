import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAddress, parseEther } from 'ethers';

const mocks = vi.hoisted(() => ({
  getFactory: vi.fn(),
  getProject: vi.fn(),
  getBalance: vi.fn(),
}));

vi.mock('./contracts', () => ({
  getFactory: mocks.getFactory,
  getProject: mocks.getProject,
}));

vi.mock('./provider', () => ({
  readProvider: { getBalance: mocks.getBalance },
}));

import {
  createProject,
  createWithdrawRequest,
  donate,
  loadProject,
  loadProjects,
  refund,
  voteWithdrawRequest,
  withdrawRequestedAmount,
} from './projects';

const FACTORY = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const PROJECT_A = '0xa16E02E87b7454126E5E10d957A927A7F5B5d2be';
const PROJECT_B = '0xB7A5bd0345EF1Cc5E66bf61BdeC17D2461fBd968';
const DONOR_1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const DONOR_2 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

function makeProject(overrides = {}) {
  const contributions = {
    [getAddress(DONOR_1)]: parseEther('1'),
    [getAddress(DONOR_2)]: parseEther('2'),
  };

  return {
    creator: vi.fn().mockResolvedValue(DONOR_1),
    title: vi.fn().mockResolvedValue('Atelier vélo'),
    description: vi.fn().mockResolvedValue('Un atelier pour réparer les vélos.'),
    goal: vi.fn().mockResolvedValue(parseEther('5')),
    minContribution: vi.fn().mockResolvedValue(parseEther('0.1')),
    deadline: vi.fn().mockResolvedValue(1_800_000_000n),
    totalRaised: vi.fn().mockResolvedValue(parseEther('3')),
    getStatus: vi.fn().mockResolvedValue(0n),
    getDonors: vi.fn().mockResolvedValue([DONOR_1, DONOR_2]),
    timeLeft: vi.fn().mockResolvedValue(120n),
    contributions: vi
      .fn()
      .mockImplementation(async (address) => contributions[getAddress(address)] ?? 0n),
    getWithdrawRequestsCount: vi.fn().mockResolvedValue(0n),
    withdrawRequests: vi.fn(),
    hasVoted: vi.fn().mockResolvedValue(false),
    contribute: vi.fn(),
    createWithdrawRequest: vi.fn(),
    voteWithdrawRequest: vi.fn(),
    withdrawRequestedAmount: vi.fn(),
    refund: vi.fn(),
    ...overrides,
  };
}

function makeSigner() {
  return { address: DONOR_1 };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getBalance.mockResolvedValue(parseEther('3'));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('loadProjects', () => {
  it('charge les campagnes et renvoie leurs résumés', async () => {
    const project = makeProject();
    mocks.getFactory.mockReturnValue({
      getProjects: vi.fn().mockResolvedValue([PROJECT_A]),
    });
    mocks.getProject.mockReturnValue(project);

    const result = await loadProjects();

    expect(result.failed).toBe(0);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]).toMatchObject({
      address: getAddress(PROJECT_A),
      title: 'Atelier vélo',
      status: 0,
      goal: parseEther('5'),
      totalRaised: parseEther('3'),
      donors: [DONOR_1, DONOR_2],
      timeLeft: 120n,
    });
  });

  it('ignore une campagne illisible sans faire échouer la liste', async () => {
    const good = makeProject();
    const bad = makeProject({ creator: vi.fn().mockRejectedValue(new Error('RPC')) });

    mocks.getFactory.mockReturnValue({
      getProjects: vi.fn().mockResolvedValue([PROJECT_A, PROJECT_B]),
    });
    mocks.getProject.mockImplementation((address) =>
      address === PROJECT_A ? good : bad,
    );

    const result = await loadProjects();

    expect(result.failed).toBe(1);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].address).toBe(getAddress(PROJECT_A));
  });
});

describe('loadProject', () => {
  it('ajoute le solde, la contribution, les donateurs triés et les demandes', async () => {
    const project = makeProject({
      getWithdrawRequestsCount: vi.fn().mockResolvedValue(1n),
      withdrawRequests: vi.fn().mockResolvedValue([
        parseEther('2'),
        'Achat du matériel',
        DONOR_1,
        2n,
        false,
      ]),
      hasVoted: vi.fn().mockResolvedValue(true),
    });
    mocks.getProject.mockReturnValue(project);
    mocks.getBalance.mockResolvedValue(parseEther('3'));

    const result = await loadProject(PROJECT_A, DONOR_1);

    expect(result.balance).toBe(parseEther('3'));
    expect(result.contributions).toBe(parseEther('1'));
    expect(result.donors).toEqual([
      { address: DONOR_2, amount: parseEther('2') },
      { address: DONOR_1, amount: parseEther('1') },
    ]);
    expect(result.withdrawRequestsCount).toBe(1);
    expect(result.withdrawRequests[0]).toMatchObject({
      id: 0,
      amount: parseEther('2'),
      reason: 'Achat du matériel',
      recipient: DONOR_1,
      approvals: 2,
      executed: false,
      hasVoted: true,
    });
  });

  it('ne lit pas la contribution ni les votes sans compte connecté', async () => {
    const project = makeProject();
    mocks.getProject.mockReturnValue(project);

    const result = await loadProject(PROJECT_A, null);

    expect(result.contributions).toBeNull();
    // Les contributions des donateurs sont lues pour trier la liste,
    // mais jamais celle d'un compte absent (null).
    expect(project.contributions.mock.calls.map(([addr]) => addr)).toEqual([
      getAddress(DONOR_1),
      getAddress(DONOR_2),
    ]);
    expect(project.contributions).not.toHaveBeenCalledWith(null);
    expect(project.hasVoted).not.toHaveBeenCalled();
  });
});

describe('createProject', () => {
  it('convertit les ETH et la durée puis renvoie l’adresse créée', async () => {
    const factory = {
      createProject: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue({ logs: [{}] }) }),
      interface: {
        parseLog: vi.fn().mockReturnValue({
          name: 'ProjectCreated',
          args: { project: PROJECT_A },
        }),
      },
    };
    mocks.getFactory.mockReturnValue(factory);

    const address = await createProject(
      {
        title: 'Atelier vélo',
        description: 'Un atelier pour réparer les vélos.',
        goalEth: '5',
        minContributionEth: '0,1',
        durationMinutes: 10,
      },
      makeSigner(),
    );

    expect(address).toBe(PROJECT_A);
    expect(mocks.getFactory).toHaveBeenCalledWith(makeSigner());
    expect(factory.createProject).toHaveBeenCalledWith(
      'Atelier vélo',
      'Un atelier pour réparer les vélos.',
      parseEther('5'),
      parseEther('0.1'),
      600,
    );
  });

  it('refuse un portefeuille absent et une durée nulle', async () => {
    await expect(
      createProject(
        {
          title: 'X',
          description: 'Description',
          goalEth: '1',
          minContributionEth: '0.1',
          durationMinutes: 10,
        },
        null,
      ),
    ).rejects.toThrow(/portefeuille connecté/i);

    await expect(
      createProject(
        {
          title: 'X',
          description: 'Description',
          goalEth: '1',
          minContributionEth: '0.1',
          durationMinutes: 0,
        },
        makeSigner(),
      ),
    ).rejects.toThrow(/durée/i);
  });

  it('signale une transaction sans ProjectCreated', async () => {
    const factory = {
      createProject: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue({ logs: [{}] }) }),
      interface: { parseLog: vi.fn().mockReturnValue(null) },
    };
    mocks.getFactory.mockReturnValue(factory);

    await expect(
      createProject(
        {
          title: 'X',
          description: 'Description',
          goalEth: '1',
          minContributionEth: '0.1',
          durationMinutes: 10,
        },
        makeSigner(),
      ),
    ).rejects.toThrow(/adresse n'a pas pu être lue/i);
  });
});

describe('transactions', () => {
  it('envoie un don avec la valeur convertie', async () => {
    const project = {
      contribute: vi.fn().mockResolvedValue({ wait: vi.fn().mockResolvedValue({}) }),
    };
    mocks.getProject.mockReturnValue(project);

    await donate(PROJECT_A, '1,5', makeSigner());

    expect(mocks.getProject).toHaveBeenCalledWith(PROJECT_A, makeSigner());
    expect(project.contribute).toHaveBeenCalledWith({ value: parseEther('1.5') });
  });

  it('refuse un don sans signer ou avec un montant nul', async () => {
    await expect(donate(PROJECT_A, '1', null)).rejects.toThrow(/portefeuille/i);
    await expect(donate(PROJECT_A, '0', makeSigner())).rejects.toThrow(/supérieur à 0/i);
  });

  it('crée une demande de retrait validée', async () => {
    const project = {
      createWithdrawRequest: vi
        .fn()
        .mockResolvedValue({ wait: vi.fn().mockResolvedValue({}) }),
    };
    mocks.getProject.mockReturnValue(project);

    await createWithdrawRequest(
      PROJECT_A,
      { amountEth: '2', reason: '  Achat matériel  ', recipient: DONOR_1 },
      makeSigner(),
    );

    expect(project.createWithdrawRequest).toHaveBeenCalledWith(
      parseEther('2'),
      'Achat matériel',
      getAddress(DONOR_1),
    );
  });

  it('refuse un motif trop court et un destinataire invalide', async () => {
    await expect(
      createWithdrawRequest(
        PROJECT_A,
        { amountEth: '2', reason: 'ok', recipient: DONOR_1 },
        makeSigner(),
      ),
    ).rejects.toThrow(/motif/i);

    await expect(
      createWithdrawRequest(
        PROJECT_A,
        { amountEth: '2', reason: 'Achat matériel', recipient: 'nope' },
        makeSigner(),
      ),
    ).rejects.toThrow(/destinataire/i);
  });

  it('appelle les bonnes méthodes pour voter, retirer et rembourser', async () => {
    const wait = vi.fn().mockResolvedValue({});
    const project = {
      voteWithdrawRequest: vi.fn().mockResolvedValue({ wait }),
      withdrawRequestedAmount: vi.fn().mockResolvedValue({ wait }),
      refund: vi.fn().mockResolvedValue({ wait }),
    };
    mocks.getProject.mockReturnValue(project);

    await voteWithdrawRequest(PROJECT_A, 0, makeSigner());
    await withdrawRequestedAmount(PROJECT_A, 1, makeSigner());
    await refund(PROJECT_A, makeSigner());

    expect(project.voteWithdrawRequest).toHaveBeenCalledWith(0);
    expect(project.withdrawRequestedAmount).toHaveBeenCalledWith(1);
    expect(project.refund).toHaveBeenCalled();
  });

  it('refuse les écritures sans signer', async () => {
    await expect(voteWithdrawRequest(PROJECT_A, 0, null)).rejects.toThrow(/portefeuille/i);
    await expect(withdrawRequestedAmount(PROJECT_A, 0, null)).rejects.toThrow(/portefeuille/i);
    await expect(refund(PROJECT_A, null)).rejects.toThrow(/portefeuille/i);
  });
});
