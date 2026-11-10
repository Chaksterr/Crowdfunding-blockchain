import { useCallback, useEffect, useRef, useState } from 'react';
import { mapContractError } from '../web3/errors';

/**
 * Charge des données asynchrones avec états loading / refreshing / error et
 * une fonction `reload` pour réessayer ou actualiser.
 *
 * @param {() => Promise<any>} load
 * @param {Array<any>} deps tableau de dépendances (relance le chargement)
 */
export function useAsyncData(load, deps = []) {
  const loadRef = useRef(load);
  loadRef.current = load;

  const [state, setState] = useState({
    status: 'loading', // loading | refreshing | success | error
    data: null,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setState((current) => ({
      // On garde les données précédentes visibles pendant une actualisation.
      status: current.data ? 'refreshing' : 'loading',
      data: current.data,
      error: null,
    }));

    loadRef
      .current()
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'success', data, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setState((current) => ({
          status: 'error',
          data: current.data,
          error: mapContractError(error),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return {
    ...state,
    reload,
    isLoading: state.status === 'loading',
    isRefreshing: state.status === 'refreshing',
  };
}
