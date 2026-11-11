import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

describe('mapContractError — chaque require du contrat', () => {
  const CASES = [
    ['Createur uniquement', 'Seul le créateur peut effectuer cette action.'],
    ['Createur invalide', "L'adresse du créateur est invalide."],
    ['Objectif invalide', "L'objectif doit être supérieur à 0."],
    ['Don minimum invalide', 'Le don minimum doit être supérieur à 0.'],
    ['Duree invalide', 'La durée doit être supérieure à 0.'],
    ['Campagne terminee', 'La campagne est terminée : les dons sont fermés.'],
    ['Don trop faible', 'Le montant est inférieur au don minimum.'],
    ['Campagne non reussie', "La campagne n'a pas atteint son objectif."],
    ['Destinataire invalide', "L'adresse du destinataire est invalide."],
    ['Montant invalide', 'Le montant demandé est invalide.'],
    ['Demande inexistante', "Cette demande de retrait n'existe pas."],
    ['Pas donateur', 'Seuls les donateurs peuvent voter.'],
    ['Deja execute', 'Ce retrait a déjà été exécuté.'],
    ['Deja vote', 'Vous avez déjà voté pour cette demande.'],
    ["Moins de 50% d'approbation", "Il faut l'accord d'au moins la moitié des donateurs."],
    ['Solde insuffisant', 'Le solde de la campagne ne suffit pas.'],
    ['Echec du virement', 'Le virement a échoué. Réessayez.'],
    ['Remboursement impossible', "Le remboursement n'est possible que si la campagne a échoué."],
    ['Rien a rembourser', "Vous n'avez rien à récupérer sur cette campagne."],
    ['Echec du remboursement', 'Le remboursement a échoué. Réessayez.'],
  ];

  it.each(CASES)('« %s » → message dédié', (revert, expected) => {
    // Forme réelle renvoyée par ethers v6 pour un require()
    expect(
      mapContractError({
        shortMessage: `execution reverted: "${revert}"`,
        reason: revert,
      }),
    ).toBe(expected);
  });

  it('couvre toutes les chaînes require() présentes dans les contrats', () => {
    const sources = ['Project.sol', 'Crowdfunding.sol']
      .map((file) =>
        readFileSync(resolve(__dirname, '../../../contracts', file), 'utf8'),
      )
      .join('\n');
    const reverts = [...sources.matchAll(/require\([^;]*,\s*"([^"]+)"\s*\)/g)].map(
      (match) => match[1],
    );

    expect(reverts.length).toBeGreaterThan(0);
    const known = CASES.map(([revert]) => revert);
    // Un nouveau require() sans traduction tomberait sur le message générique
    expect(reverts.filter((revert) => !known.includes(revert))).toEqual([]);
  });
});

describe('mapContractError — autres formes d’erreur', () => {
  it('accepte une chaîne brute', () => {
    expect(mapContractError('execution reverted: Pas donateur')).toBe(
      'Seuls les donateurs peuvent voter.',
    );
  });

  it('lit les messages imbriqués dans error.error et data', () => {
    expect(mapContractError({ error: { message: 'Rien a rembourser' } })).toBe(
      "Vous n'avez rien à récupérer sur cette campagne.",
    );
    expect(mapContractError({ data: { message: 'Solde insuffisant' } })).toBe(
      'Le solde de la campagne ne suffit pas.',
    );
  });

  it('lit un code de refus imbriqué dans info.error', () => {
    expect(mapContractError({ info: { error: { code: 4001 } } })).toBe(
      'Transaction annulée dans MetaMask.',
    );
  });

  it('privilégie le refus utilisateur sur un message de contrat', () => {
    expect(mapContractError({ code: 4001, reason: 'Deja vote' })).toBe(
      'Transaction annulée dans MetaMask.',
    );
  });

  it('détecte l’absence de MetaMask dans le message', () => {
    expect(mapContractError(new Error("MetaMask n'est pas installé."))).toBe(
      MISSING_METAMASK_MESSAGE,
    );
  });

  it('explique comment configurer l’adresse de la fabrique', () => {
    expect(
      mapContractError(new Error('Adresse de la fabrique introuvable.')),
    ).toBe(
      "L'adresse de la fabrique n'est pas configurée. Lancez « npm run sync » puis rechargez la page.",
    );
  });

  it.each(['Failed to fetch', 'network error', 'connect ECONNREFUSED 127.0.0.1:8545', 'timeout exceeded'])(
    'reconnaît l’erreur réseau « %s »',
    (message) => {
      expect(mapContractError({ message })).toBe(
        'Impossible de joindre le réseau local. Vérifiez que « npm run node » est lancé.',
      );
    },
  );

  it('reconnaît « user denied » comme un refus', () => {
    expect(mapContractError({ message: 'MetaMask Tx Signature: User denied transaction signature.' })).toBe(
      'Transaction annulée dans MetaMask.',
    );
  });
});
