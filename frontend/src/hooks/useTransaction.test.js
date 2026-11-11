import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTransaction } from './useTransaction';

describe('useTransaction', () => {
  it('démarre inactif', () => {
    const { result } = renderHook(() => useTransaction());
    expect(result.current).toMatchObject({
      status: 'idle',
      error: null,
      isPending: false,
      isSuccess: false,
    });
  });

  it('passe par « pending » puis « success » et renvoie le résultat', async () => {
    const { result } = renderHook(() => useTransaction());
    let resolve;
    const action = () =>
      new Promise((done) => {
        resolve = done;
      });

    let outcome;
    act(() => {
      outcome = result.current.run(action);
    });
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      resolve('0xabc');
      await outcome;
    });

    expect(await outcome).toEqual({ ok: true, result: '0xabc' });
    expect(result.current).toMatchObject({
      status: 'success',
      isPending: false,
      isSuccess: true,
      error: null,
    });
  });

  it('traduit l’erreur du contrat et la renvoie à l’appelant', async () => {
    const { result } = renderHook(() => useTransaction());

    let outcome;
    await act(async () => {
      outcome = await result.current.run(async () => {
        throw { reason: 'Deja vote' };
      });
    });

    expect(outcome).toEqual({
      ok: false,
      error: 'Vous avez déjà voté pour cette demande.',
    });
    expect(result.current).toMatchObject({
      status: 'error',
      error: 'Vous avez déjà voté pour cette demande.',
      isPending: false,
    });
  });

  it('reset revient à l’état inactif après une erreur', async () => {
    const { result } = renderHook(() => useTransaction());
    await act(async () => {
      await result.current.run(async () => {
        throw { code: 4001 };
      });
    });
    expect(result.current.status).toBe('error');

    act(() => result.current.reset());
    expect(result.current).toMatchObject({ status: 'idle', error: null });
  });

  it('garde des fonctions stables entre les rendus', () => {
    const { result, rerender } = renderHook(() => useTransaction());
    const { run, reset } = result.current;
    rerender();
    expect(result.current.run).toBe(run);
    expect(result.current.reset).toBe(reset);
  });
});
