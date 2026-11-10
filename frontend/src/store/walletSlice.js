import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { CHAIN_ID } from '../config';
import { mapContractError, MISSING_METAMASK_MESSAGE } from '../web3/errors';
import {
  connectWallet,
  ensureChain,
  getBrowserProvider,
  getWalletBalance,
  hasMetaMask,
  readProvider,
} from '../web3/provider';

const initialState = {
  // Avec MetaMask, on affiche un squelette discret pendant la vérification
  // silencieuse (eth_accounts) au lieu de « Connecter » puis « Connecté ».
  status: hasMetaMask() ? 'loading' : 'idle',
  account: null,
  chainId: null,
  balance: null, // wei sous forme de chaîne, pour rester sérialisable
  error: null,
};

async function fetchBalance(account) {
  try {
    const provider = hasMetaMask() ? getBrowserProvider() : null;
    return (await getWalletBalance(account, provider ?? readProvider)).toString();
  } catch {
    return null;
  }
}

/** Hydratation silencieuse : ne demande jamais l'accès au portefeuille. */
export const hydrateWallet = createAsyncThunk('wallet/hydrate', async () => {
  if (!hasMetaMask()) {
    return { account: null, chainId: null, balance: null };
  }

  try {
    const provider = getBrowserProvider();
    const accounts = await provider.send('eth_accounts', []);
    const chainId = Number.parseInt(await provider.send('eth_chainId', []), 16);
    const account = accounts?.[0] ?? null;

    return {
      account,
      chainId,
      balance: account ? await fetchBalance(account) : null,
    };
  } catch {
    return { account: null, chainId: null, balance: null };
  }
});

/** Connexion explicite déclenchée par l'utilisateur. */
export const connectWalletThunk = createAsyncThunk(
  'wallet/connect',
  async (_, { rejectWithValue }) => {
    if (!hasMetaMask()) return rejectWithValue(MISSING_METAMASK_MESSAGE);

    try {
      const { account, chainId } = await connectWallet();
      if (!account) {
        return rejectWithValue("Aucun compte n'a été autorisé.");
      }

      let activeChain = chainId;
      try {
        await ensureChain(CHAIN_ID);
        activeChain = CHAIN_ID;
      } catch (networkError) {
        const code =
          networkError?.code ??
          networkError?.info?.error?.code ??
          networkError?.data?.originalError?.code;
        // Refus de changer de réseau : la connexion reste valable, le bandeau
        // « mauvais réseau » prend le relais.
        if (code !== 4001 && code !== 'ACTION_REJECTED') throw networkError;
      }

      return {
        account,
        chainId: activeChain,
        balance: await fetchBalance(account),
      };
    } catch (error) {
      return rejectWithValue(mapContractError(error));
    }
  },
);

/** Rafraîchit le solde du compte connecté. */
export const refreshBalance = createAsyncThunk(
  'wallet/refreshBalance',
  async (_, { getState }) => {
    const { account } = getState().wallet;
    if (!account) return null;
    return fetchBalance(account);
  },
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setAccount(state, action) {
      state.account = action.payload || null;
      state.status = state.account ? 'connected' : 'idle';
      if (!state.account) {
        state.balance = null;
        state.error = null;
      }
    },
    setChain(state, action) {
      state.chainId = action.payload ?? null;
    },
    setError(state, action) {
      state.error = action.payload || null;
      if (state.error) {
        state.status = state.account ? 'connected' : 'error';
      } else if (!state.account && state.status === 'error') {
        state.status = 'idle';
      }
    },
    disconnected(state) {
      state.status = 'idle';
      state.account = null;
      state.balance = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateWallet.pending, (state) => {
        if (state.status === 'idle') state.status = 'loading';
      })
      .addCase(hydrateWallet.fulfilled, (state, action) => {
        state.account = action.payload.account;
        state.chainId = action.payload.chainId;
        state.balance = action.payload.balance;
        state.status = state.account ? 'connected' : 'idle';
      })
      .addCase(hydrateWallet.rejected, (state) => {
        state.status = 'idle';
      })
      .addCase(connectWalletThunk.pending, (state) => {
        state.status = 'connecting';
        state.error = null;
      })
      .addCase(connectWalletThunk.fulfilled, (state, action) => {
        state.account = action.payload.account;
        state.chainId = action.payload.chainId;
        state.balance = action.payload.balance;
        state.status = 'connected';
        state.error = null;
      })
      .addCase(connectWalletThunk.rejected, (state, action) => {
        state.error = action.payload ?? "La connexion a échoué.";
        state.status = state.account ? 'connected' : 'error';
      })
      .addCase(refreshBalance.fulfilled, (state, action) => {
        if (state.account) state.balance = action.payload;
      });
  },
});

export const {
  setAccount,
  setChain,
  setError,
  disconnected,
} = walletSlice.actions;

export default walletSlice.reducer;
