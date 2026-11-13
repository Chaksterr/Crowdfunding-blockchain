import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

const mocks = vi.hoisted(() => ({
  hasMetaMask: vi.fn(() => false),
  getBrowserProvider: vi.fn(),
  connectWallet: vi.fn(),
  ensureChain: vi.fn(),
  getWalletBalance: vi.fn(),
}));

vi.mock('../web3/provider', () => ({
  hasMetaMask: mocks.hasMetaMask,
  getBrowserProvider: mocks.getBrowserProvider,
  connectWallet: mocks.connectWallet,
  ensureChain: mocks.ensureChain,
  getWalletBalance: mocks.getWalletBalance,
  readProvider: { name: 'read-only' },
}));

import walletReducer, {
  connectWalletThunk,
  disconnected,
  hydrateWallet,
  refreshBalance,
  setAccount,
  setChain,
  setError,
} from './walletSlice';
import { MISSING_METAMASK_MESSAGE } from '../web3/errors';

const ACCOUNT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

function makeStore(wallet) {
  return configureStore({
    reducer: { wallet: walletReducer },
    preloadedState: wallet
      ? { wallet: { ...walletReducer(undefined, { type: '@@init' }), ...wallet } }
      : undefined,
  });
}

function makeBrowserProvider({ accounts = [ACCOUNT], chainId = '0x7a6a' } = {}) {
  return {
    send: vi.fn(async (method) => {
      if (method === 'eth_accounts') return accounts;
      if (method === 'eth_chainId') return chainId;
      throw new Error(`méthode inattendue ${method}`);
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasMetaMask.mockReturnValue(false);
  mocks.getWalletBalance.mockResolvedValue(5n);
});

describe('walletSlice — état initial', () => {
  it('démarre inactif et vide sans MetaMask', () => {
    expect(walletReducer(undefined, { type: '@@init' })).toEqual({
      status: 'idle',
      account: null,
      chainId: null,
      balance: null,
      error: null,
    });
  });

  it('démarre en chargement quand MetaMask est détecté', async () => {
    vi.resetModules();
    mocks.hasMetaMask.mockReturnValue(true);
    const { default: freshReducer } = await import('./walletSlice');
    expect(freshReducer(undefined, { type: '@@init' }).status).toBe('loading');
  });
});

describe('walletSlice — reducers', () => {
  const initial = walletReducer(undefined, { type: '@@init' });

  it('setAccount connecte puis déconnecte en effaçant solde et erreur', () => {
    const connected = walletReducer(initial, setAccount(ACCOUNT));
    expect(connected).toMatchObject({ account: ACCOUNT, status: 'connected' });

    const withData = { ...connected, balance: '42', error: 'oups' };
    expect(walletReducer(withData, setAccount(null))).toMatchObject({
      account: null,
      status: 'idle',
      balance: null,
      error: null,
    });
  });

  it('setAccount traite une chaîne vide comme une déconnexion', () => {
    expect(walletReducer(initial, setAccount(''))).toMatchObject({
      account: null,
      status: 'idle',
    });
  });

  it('setChain enregistre la chaîne et normalise undefined en null', () => {
    expect(walletReducer(initial, setChain(31338)).chainId).toBe(31338);
    expect(walletReducer({ ...initial, chainId: 1 }, setChain(undefined)).chainId).toBeNull();
  });

  it('setError garde le statut connecté si un compte est présent', () => {
    const connected = { ...initial, account: ACCOUNT, status: 'connected' };
    expect(walletReducer(connected, setError('Réseau incorrect'))).toMatchObject({
      error: 'Réseau incorrect',
      status: 'connected',
    });
  });

  it('setError passe en erreur sans compte puis revient à inactif quand on efface', () => {
    const errored = walletReducer(initial, setError('Boom'));
    expect(errored).toMatchObject({ error: 'Boom', status: 'error' });
    expect(walletReducer(errored, setError(null))).toMatchObject({
      error: null,
      status: 'idle',
    });
  });

  it('disconnected remet tout à zéro sauf la chaîne', () => {
    const state = {
      status: 'connected',
      account: ACCOUNT,
      chainId: 31338,
      balance: '10',
      error: 'x',
    };
    expect(walletReducer(state, disconnected())).toEqual({
      status: 'idle',
      account: null,
      chainId: 31338,
      balance: null,
      error: null,
    });
  });
});

describe('hydrateWallet', () => {
  it('ne contacte rien sans MetaMask', async () => {
    const store = makeStore();
    await store.dispatch(hydrateWallet());

    expect(mocks.getBrowserProvider).not.toHaveBeenCalled();
    expect(store.getState().wallet).toMatchObject({ status: 'idle', account: null });
  });

  it('récupère compte, chaîne et solde sans demander l’accès', async () => {
    mocks.hasMetaMask.mockReturnValue(true);
    const provider = makeBrowserProvider();
    mocks.getBrowserProvider.mockReturnValue(provider);

    const store = makeStore();
    await store.dispatch(hydrateWallet());

    expect(provider.send).toHaveBeenCalledWith('eth_accounts', []);
    expect(provider.send).not.toHaveBeenCalledWith('eth_requestAccounts', expect.anything());
    expect(mocks.getWalletBalance).toHaveBeenCalledWith(ACCOUNT, provider);
    expect(store.getState().wallet).toMatchObject({
      status: 'connected',
      account: ACCOUNT,
      chainId: 31338,
      balance: '5',
    });
  });

  it('reste inactif si aucun compte n’est autorisé', async () => {
    mocks.hasMetaMask.mockReturnValue(true);
    mocks.getBrowserProvider.mockReturnValue(makeBrowserProvider({ accounts: [], chainId: '0x1' }));

    const store = makeStore();
    await store.dispatch(hydrateWallet());

    expect(mocks.getWalletBalance).not.toHaveBeenCalled();
    expect(store.getState().wallet).toMatchObject({
      status: 'idle',
      account: null,
      chainId: 1,
      balance: null,
    });
  });

  it('garde la connexion même si le solde est illisible', async () => {
    mocks.hasMetaMask.mockReturnValue(true);
    mocks.getBrowserProvider.mockReturnValue(makeBrowserProvider());
    mocks.getWalletBalance.mockRejectedValue(new Error('RPC down'));

    const store = makeStore();
    await store.dispatch(hydrateWallet());

    expect(store.getState().wallet).toMatchObject({
      status: 'connected',
      account: ACCOUNT,
      balance: null,
    });
  });

  it('retombe sur un état vide si MetaMask répond une erreur', async () => {
    mocks.hasMetaMask.mockReturnValue(true);
    mocks.getBrowserProvider.mockReturnValue({
      send: vi.fn().mockRejectedValue(new Error('locked')),
    });

    const store = makeStore();
    await store.dispatch(hydrateWallet());

    expect(store.getState().wallet).toMatchObject({
      status: 'idle',
      account: null,
      chainId: null,
    });
  });
});

describe('connectWalletThunk', () => {
  it('refuse sans MetaMask avec un message explicite', async () => {
    const store = makeStore();
    await store.dispatch(connectWalletThunk());

    expect(mocks.connectWallet).not.toHaveBeenCalled();
    expect(store.getState().wallet).toMatchObject({
      status: 'error',
      error: MISSING_METAMASK_MESSAGE,
    });
  });

  it('connecte, bascule sur la chaîne Hardhat et lit le solde', async () => {
    mocks.hasMetaMask.mockReturnValue(true);
    mocks.getBrowserProvider.mockReturnValue(makeBrowserProvider());
    mocks.connectWallet.mockResolvedValue({ account: ACCOUNT, chainId: 1 });
    mocks.ensureChain.mockResolvedValue(undefined);

    const store = makeStore();
    const pending = store.dispatch(connectWalletThunk());
    expect(store.getState().wallet.status).toBe('connecting');
    await pending;

    expect(mocks.ensureChain).toHaveBeenCalledWith(31338);
    expect(store.getState().wallet).toEqual({
      status: 'connected',
      account: ACCOUNT,
      chainId: 31338,
      balance: '5',
      error: null,
    });
  });

  it('garde la connexion sur la chaîne d’origine si le changement de réseau est refusé', async () => {
    mocks.hasMetaMask.mockReturnValue(true);
    mocks.getBrowserProvider.mockReturnValue(makeBrowserProvider());
    mocks.connectWallet.mockResolvedValue({ account: ACCOUNT, chainId: 1 });
    mocks.ensureChain.mockRejectedValue({ code: 4001 });

    const store = makeStore();
    await store.dispatch(connectWalletThunk());

    expect(store.getState().wallet).toMatchObject({
      status: 'connected',
      account: ACCOUNT,
      chainId: 1,
      error: null,
    });
  });

  it('reconnaît un refus de réseau imbriqué dans info.error', async () => {
    mocks.hasMetaMask.mockReturnValue(true);
    mocks.getBrowserProvider.mockReturnValue(makeBrowserProvider());
    mocks.connectWallet.mockResolvedValue({ account: ACCOUNT, chainId: 1 });
    mocks.ensureChain.mockRejectedValue({ info: { error: { code: 4001 } } });

    const store = makeStore();
    await store.dispatch(connectWalletThunk());

    expect(store.getState().wallet).toMatchObject({ status: 'connected', chainId: 1 });
  });

  it('échoue si le changement de réseau plante pour une autre raison', async () => {
    mocks.hasMetaMask.mockReturnValue(true);
    mocks.connectWallet.mockResolvedValue({ account: ACCOUNT, chainId: 1 });
    mocks.ensureChain.mockRejectedValue({ message: 'could not detect network' });

    const store = makeStore();
    await store.dispatch(connectWalletThunk());

    expect(store.getState().wallet).toMatchObject({
      status: 'error',
      account: null,
      error:
        'Impossible de joindre le réseau local. Vérifiez que « npm run node » est lancé.',
    });
  });

  it('signale qu’aucun compte n’a été autorisé', async () => {
    mocks.hasMetaMask.mockReturnValue(true);
    mocks.connectWallet.mockResolvedValue({ account: null, chainId: 31338 });

    const store = makeStore();
    await store.dispatch(connectWalletThunk());

    expect(mocks.ensureChain).not.toHaveBeenCalled();
    expect(store.getState().wallet).toMatchObject({
      status: 'error',
      error: "Aucun compte n'a été autorisé.",
    });
  });

  it('traduit un refus de connexion dans MetaMask', async () => {
    mocks.hasMetaMask.mockReturnValue(true);
    mocks.connectWallet.mockRejectedValue({ code: 4001 });

    const store = makeStore();
    await store.dispatch(connectWalletThunk());

    expect(store.getState().wallet.error).toBe('Transaction annulée dans MetaMask.');
  });

  it('un échec ne déconnecte pas un compte déjà connecté', async () => {
    mocks.hasMetaMask.mockReturnValue(true);
    mocks.connectWallet.mockRejectedValue({ code: 4001 });

    const store = makeStore({ account: ACCOUNT, status: 'connected', balance: '7' });
    await store.dispatch(connectWalletThunk());

    expect(store.getState().wallet).toMatchObject({
      status: 'connected',
      account: ACCOUNT,
      balance: '7',
      error: 'Transaction annulée dans MetaMask.',
    });
  });
});

describe('refreshBalance', () => {
  it('ne fait rien sans compte connecté', async () => {
    const store = makeStore();
    await store.dispatch(refreshBalance());

    expect(mocks.getWalletBalance).not.toHaveBeenCalled();
    expect(store.getState().wallet.balance).toBeNull();
  });

  it('met à jour le solde du compte connecté via le fournisseur en lecture seule', async () => {
    mocks.getWalletBalance.mockResolvedValue(1234n);
    const store = makeStore({ account: ACCOUNT, status: 'connected', balance: '1' });
    await store.dispatch(refreshBalance());

    expect(mocks.getWalletBalance).toHaveBeenCalledWith(ACCOUNT, { name: 'read-only' });
    expect(store.getState().wallet.balance).toBe('1234');
  });
});
