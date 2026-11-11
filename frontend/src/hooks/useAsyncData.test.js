import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsyncData } from './useAsyncData';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAsyncData', () => {
  it('commence en chargement puis expose les données', async () => {
    const load = vi.fn().mockResolvedValue(['a', 'b']);
    const { result } = renderHook(() => useAsyncData(load));

    expect(result.current).toMatchObject({
      status: 'loading',
      isLoading: true,
      data: null,
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current).toMatchObject({
      data: ['a', 'b'],
      error: null,
      isLoading: false,
      isRefreshing: false,
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('traduit une erreur de chargement', async () => {
    const load = vi.fn().mockRejectedValue({ message: 'Failed to fetch' });
    const { result } = renderHook(() => useAsyncData(load));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe(
      'Impossible de joindre le réseau local. Vérifiez que « npm run node » est lancé.',
    );
    expect(result.current.data).toBeNull();
  });

  it('reload passe en « refreshing » en gardant les données affichées', async () => {
    const second = deferred();
    const load = vi
      .fn()
      .mockResolvedValueOnce('v1')
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useAsyncData(load));
    await waitFor(() => expect(result.current.data).toBe('v1'));

    act(() => result.current.reload());
    expect(result.current).toMatchObject({
      status: 'refreshing',
      isRefreshing: true,
      isLoading: false,
      data: 'v1',
    });

    await act(async () => {
      second.resolve('v2');
    });
    expect(result.current).toMatchObject({ status: 'success', data: 'v2' });
  });

  it('garde les anciennes données si l’actualisation échoue', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce('v1')
      .mockRejectedValueOnce({ code: 4001 });
    const { result } = renderHook(() => useAsyncData(load));
    await waitFor(() => expect(result.current.data).toBe('v1'));

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.data).toBe('v1');
    expect(result.current.error).toBe('Transaction annulée dans MetaMask.');
  });

  it('relance le chargement quand une dépendance change', async () => {
    const load = vi.fn(async () => 'ok');
    const { rerender } = renderHook(({ id }) => useAsyncData(load, [id]), {
      initialProps: { id: 'a' },
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    rerender({ id: 'a' });
    expect(load).toHaveBeenCalledTimes(1);

    rerender({ id: 'b' });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });

  it('ignore une réponse arrivée après un changement de dépendance', async () => {
    const slow = deferred();
    const fast = deferred();
    const calls = { a: slow.promise, b: fast.promise };
    const { result, rerender } = renderHook(
      ({ id }) => useAsyncData(() => calls[id], [id]),
      { initialProps: { id: 'a' } },
    );

    rerender({ id: 'b' });
    await act(async () => {
      fast.resolve('donnée de b');
    });
    await act(async () => {
      slow.resolve('donnée périmée de a');
    });

    expect(result.current.data).toBe('donnée de b');
  });

  it('ne met plus l’état à jour après démontage', async () => {
    const pending = deferred();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = renderHook(() =>
      useAsyncData(() => pending.promise),
    );

    unmount();
    await act(async () => {
      pending.resolve('trop tard');
    });

    expect(result.current.status).toBe('loading');
    expect(error).not.toHaveBeenCalled();
  });
});
