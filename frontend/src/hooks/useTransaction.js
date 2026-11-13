import { useCallback, useState } from 'react';
import { mapContractError } from '../web3/errors';

/**
 * Suit une transaction d'écriture : inactif, en attente, réussi ou en erreur.
 * `run(action)` renvoie `{ ok, result }` ou `{ ok: false, error }` afin que
 * l'appelant puisse rafraîchir les données et naviguer en cas de succès.
 */
export function useTransaction() {
  const [state, setState] = useState({ status: 'idle', error: null });

  const run = useCallback(async (action) => {
    setState({ status: 'pending', error: null });

    try {
      const result = await action();
      setState({ status: 'success', error: null });
      return { ok: true, result };
    } catch (error) {
      if (import.meta.env.DEV) {
        // Erreur brute du portefeuille : indispensable pour diagnostiquer un
        // refus que mapContractError ne reconnaît pas encore.
        console.error('[transaction] erreur brute :', error);
      }
      const message = mapContractError(error);
      setState({ status: 'error', error: message });
      return { ok: false, error: message };
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', error: null });
  }, []);

  return {
    ...state,
    isPending: state.status === 'pending',
    isSuccess: state.status === 'success',
    run,
    reset,
  };
}
