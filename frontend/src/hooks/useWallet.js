import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CHAIN_ID } from '../config';
import {
  connectWalletThunk,
  disconnected,
  hydrateWallet,
  refreshBalance,
  setAccount,
  setChain,
  setError,
} from '../store/walletSlice';
import { mapContractError } from '../web3/errors';
import { ensureChain, revokeWalletPermission, watchWallet } from '../web3/provider';

export const selectWallet = (state) => state.wallet;
export const selectAccount = (state) => state.wallet.account;
export const selectBalance = (state) => state.wallet.balance;
export const selectChainId = (state) => state.wallet.chainId;
export const selectWalletStatus = (state) => state.wallet.status;
export const selectWalletError = (state) => state.wallet.error;
export const selectIsConnected = (state) => Boolean(state.wallet.account);
export const selectIsWrongNetwork = (state) =>
  Boolean(state.wallet.account) &&
  state.wallet.chainId !== null &&
  state.wallet.chainId !== CHAIN_ID;

/** État du portefeuille + actions de connexion / déconnexion. */
export function useWallet() {
  const dispatch = useDispatch();
  const wallet = useSelector(selectWallet);
  const isWrongNetwork = useSelector(selectIsWrongNetwork);

  const connect = useCallback(async () => {
    try {
      await dispatch(connectWalletThunk()).unwrap();
      return true;
    } catch {
      return false;
    }
  }, [dispatch]);

  const disconnect = useCallback(async () => {
    // Révoque l'accès du site dans MetaMask, sinon le portefeuille se
    // reconnecte tout seul à l'hydratation suivante (eth_accounts).
    await revokeWalletPermission();
    dispatch(disconnected());
  }, [dispatch]);

  const refresh = useCallback(() => {
    dispatch(refreshBalance());
  }, [dispatch]);

  const switchNetwork = useCallback(async () => {
    try {
      await ensureChain(CHAIN_ID);
      dispatch(setChain(CHAIN_ID));
      dispatch(refreshBalance());
      return true;
    } catch (error) {
      dispatch(setError(mapContractError(error)));
      return false;
    }
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(setError(null));
  }, [dispatch]);

  return {
    ...wallet,
    isConnected: Boolean(wallet.account),
    isConnecting: wallet.status === 'connecting',
    isWrongNetwork,
    connect,
    disconnect,
    refresh,
    switchNetwork,
    clearError,
  };
}

/**
 * À monter une seule fois (Layout) : hydrate le portefeuille au démarrage puis
 * suit les changements de compte et de réseau.
 */
export function useWalletListeners() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(hydrateWallet());

    const cleanup = watchWallet({
      onAccountsChanged: (accounts) => {
        const account = accounts?.[0] ?? null;
        if (account) {
          dispatch(setAccount(account));
          dispatch(refreshBalance());
        } else {
          dispatch(disconnected());
        }
      },
      onChainChanged: (chainId) => {
        dispatch(setChain(chainId));
        dispatch(refreshBalance());
      },
    });

    return cleanup;
  }, [dispatch]);
}
