import { describe, expect, it } from 'vitest';
import { mapContractError, MISSING_METAMASK_MESSAGE } from './errors';

describe('mapContractError', () => {
  it('traduit un require du contrat', () => {
    expect(mapContractError({ reason: 'Don trop faible' })).toBe(
      'Le montant est inférieur au don minimum.',
    );
  });

  it('traduit un require imbriqué dans info.error', () => {
    expect(
      mapContractError({
        info: { error: { message: 'execution reverted: Deja vote' } },
      }),
    ).toBe('Vous avez déjà voté pour cette demande.');
  });

  it('traduit un refus MetaMask', () => {
    expect(mapContractError({ code: 4001 })).toBe(
      'Transaction annulée dans MetaMask.',
    );
    expect(mapContractError({ code: 'ACTION_REJECTED' })).toBe(
      'Transaction annulée dans MetaMask.',
    );
  });

  it('détecte un refus dans le message brut', () => {
    expect(mapContractError({ message: 'user rejected the request' })).toBe(
      'Transaction annulée dans MetaMask.',
    );
  });

  it('traduit l’absence de MetaMask', () => {
    expect(mapContractError({ code: 'MISSING_METAMASK' })).toBe(
      MISSING_METAMASK_MESSAGE,
    );
  });

  it('traduit un solde insuffisant', () => {
    expect(mapContractError({ code: 'INSUFFICIENT_FUNDS' })).toBe(
      'Solde insuffisant pour payer les frais de transaction.',
    );
  });

  it('traduit un RPC injoignable', () => {
    expect(mapContractError({ message: 'could not detect network' })).toBe(
      'Impossible de joindre le réseau local. Vérifiez que « npm run node » est lancé.',
    );
  });

  it('retourne un message générique sinon', () => {
    expect(mapContractError(null)).toBe(
      'Une erreur est survenue. Vérifiez votre connexion et réessayez.',
    );
    expect(mapContractError({ message: 'boom' })).toBe(
      'Une erreur est survenue. Vérifiez votre connexion et réessayez.',
    );
  });
});
