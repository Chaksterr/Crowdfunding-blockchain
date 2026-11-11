import { describe, expect, it } from 'vitest';
import { parseEther } from 'ethers';
import {
  ethInputValue,
  formatDeadline,
  formatDuration,
  formatEth,
  formatEthCompact,
  formatEthNumber,
  formatPercent,
  parseEth,
  percent,
  plural,
  remainingLabel,
  shortAddress,
  timeLeftLabel,
} from './format';

describe('formatEth', () => {
  it('formate un montant en ETH sans unité', () => {
    expect(formatEth(parseEther('0.5'))).toBe('0,5');
    expect(formatEth(parseEther('12'))).toBe('12');
  });

  it('tronque aux décimales demandées', () => {
    expect(formatEth(parseEther('1.234567'), 2)).toBe('1,23');
  });

  it('affiche un tiret pour une valeur absente ou invalide', () => {
    expect(formatEth(null)).toBe('—');
    expect(formatEth('pas-un-nombre')).toBe('—');
  });
});

describe('parseEth', () => {
  it('accepte la virgule française', () => {
    expect(parseEth('0,5')).toBe(500000000000000000n);
  });

  it('accepte un entier', () => {
    expect(parseEth('2')).toBe(parseEther('2'));
  });

  it('refuse une saisie invalide', () => {
    expect(() => parseEth('abc')).toThrow('Montant invalide.');
    expect(() => parseEth('')).toThrow('Montant invalide.');
    expect(() => parseEth('1,2,3')).toThrow('Montant invalide.');
  });
});

describe('shortAddress', () => {
  it('raccourcit une adresse', () => {
    expect(shortAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(
      '0x1234…5678',
    );
  });

  it('retourne une chaîne vide si absente', () => {
    expect(shortAddress(null)).toBe('');
  });
});

describe('formatDuration', () => {
  it('gère la fin de campagne', () => {
    expect(formatDuration(0)).toBe('Terminée');
  });

  it('gère les moins d’une minute', () => {
    expect(formatDuration(45)).toBe("moins d'une minute");
  });

  it('affiche les heures et les minutes', () => {
    expect(formatDuration(3900)).toBe('1 h 5 min');
  });

  it('affiche les jours et les heures', () => {
    expect(formatDuration(95400)).toBe('1 j 2 h');
  });
});

describe('percent', () => {
  it('calcule un pourcentage entier', () => {
    expect(percent(parseEther('2.5'), parseEther('5'))).toBe(50);
  });

  it('plafonne à 100', () => {
    expect(percent(parseEther('8'), parseEther('5'))).toBe(100);
  });

  it('retourne 0 si l’objectif est nul', () => {
    expect(percent(parseEther('1'), 0n)).toBe(0);
  });
});

describe('formatPercent', () => {
  it('ajoute le signe pourcentage', () => {
    expect(formatPercent(parseEther('2.5'), parseEther('5'))).toMatch(/50\s%/);
  });
});

describe('formatEthCompact', () => {
  it('compacte les grands montants', () => {
    expect(formatEthCompact(parseEther('1500'))).toMatch(/1,5\s*k/i);
  });

  it('garde les petits montants lisibles', () => {
    expect(formatEthCompact(parseEther('0.5'))).toBe('0,5');
  });
});

describe('ethInputValue', () => {
  it('utilise la virgule et aucun séparateur', () => {
    expect(ethInputValue(parseEther('1234.5'))).toBe('1234,5');
  });
});

describe('formatDeadline', () => {
  it('formate une date Unix en français', () => {
    expect(formatDeadline(1700000000n)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('retourne un tiret si la date est absente', () => {
    expect(formatDeadline(0)).toBe('—');
  });
});

describe('timeLeftLabel', () => {
  it('accepte un bigint', () => {
    expect(timeLeftLabel(3900n)).toBe('1 h 5 min restantes');
  });

  it('gère la fin', () => {
    expect(timeLeftLabel(0n)).toBe('Terminée');
  });
});

describe('formatEth — cas limites', () => {
  it('accepte zéro et les chaînes numériques', () => {
    expect(formatEth(0n)).toBe('0');
    expect(formatEth('1000000000000000000')).toBe('1');
  });

  it('affiche un tiret pour une chaîne vide', () => {
    expect(formatEth('')).toBe('—');
    expect(formatEth(undefined)).toBe('—');
  });
});

describe('formatEthNumber', () => {
  it('formate un nombre décimal à la française', () => {
    expect(formatEthNumber(1.23456)).toBe('1,2346');
    expect(formatEthNumber('0.5')).toBe('0,5');
  });

  it('sépare les milliers', () => {
    expect(formatEthNumber(1234.5)).toMatch(/^1\s234,5$/);
  });

  it('affiche un tiret pour une valeur non numérique', () => {
    expect(formatEthNumber('abc')).toBe('—');
    expect(formatEthNumber(Infinity)).toBe('—');
  });
});

describe('parseEth — cas limites', () => {
  it('ignore les espaces autour de la saisie', () => {
    expect(parseEth('  1,5 ')).toBe(parseEther('1.5'));
  });

  it('accepte une saisie sans zéro initial et un nombre JS', () => {
    expect(parseEth('.5')).toBe(parseEther('0.5'));
    expect(parseEth(2)).toBe(parseEther('2'));
  });

  it('refuse les montants négatifs, absents ou en notation scientifique', () => {
    expect(() => parseEth('-1')).toThrow('Montant invalide.');
    expect(() => parseEth(null)).toThrow('Montant invalide.');
    expect(() => parseEth('1e18')).toThrow('Montant invalide.');
    expect(() => parseEth('1.')).toThrow('Montant invalide.');
  });

  it('refuse plus de 18 décimales (sous le wei)', () => {
    expect(parseEth('0.000000000000000001')).toBe(1n);
    expect(() => parseEth('0.0000000000000000001')).toThrow('Montant invalide.');
  });
});

describe('shortAddress — cas limites', () => {
  it('respecte le nombre de caractères demandé', () => {
    expect(shortAddress('0x1234567890abcdef1234567890abcdef12345678', 6)).toBe(
      '0x123456…345678',
    );
  });

  it('laisse intacte une chaîne déjà courte', () => {
    expect(shortAddress('0x12345678')).toBe('0x12345678');
  });

  it('retourne une chaîne vide pour une valeur non textuelle', () => {
    expect(shortAddress(12345)).toBe('');
  });
});

describe('formatDuration — cas limites', () => {
  it('omet les unités nulles', () => {
    expect(formatDuration(7200)).toBe('2 h');
    expect(formatDuration(3 * 86400)).toBe('3 j');
    expect(formatDuration(300)).toBe('5 min');
  });

  it('ignore les minutes quand il reste plus d’un jour', () => {
    expect(formatDuration(86400 + 3600 + 59 * 60)).toBe('1 j 1 h');
  });

  it('traite négatif, NaN et bigint', () => {
    expect(formatDuration(-10)).toBe('Terminée');
    expect(formatDuration('abc')).toBe('Terminée');
    expect(formatDuration(60n)).toBe('1 min');
  });
});

describe('percent — cas limites', () => {
  it('garde deux décimales de précision', () => {
    expect(percent(parseEther('1'), parseEther('3'))).toBe(33.33);
  });

  it('retourne 0 pour des entrées invalides ou un objectif négatif', () => {
    expect(percent('abc', parseEther('1'))).toBe(0);
    expect(percent(parseEther('1'), -1n)).toBe(0);
    expect(percent(null, undefined)).toBe(0);
  });

  it('reste exact sur de très grands montants (bigint)', () => {
    const goal = 10n ** 30n;
    expect(percent(goal / 4n, goal)).toBe(25);
  });
});

describe('formatPercent — cas limites', () => {
  it('affiche deux décimales sous 1 %', () => {
    expect(formatPercent(1n, 300n)).toMatch(/^0,33\s%$/);
  });

  it('affiche 0 % et 100 %', () => {
    expect(formatPercent(0n, parseEther('1'))).toMatch(/^0\s%$/);
    expect(formatPercent(parseEther('2'), parseEther('1'))).toMatch(/^100\s%$/);
  });
});

describe('formatEthCompact — cas limites', () => {
  it('affiche 0 sans décimale et un tiret si absent', () => {
    expect(formatEthCompact(0n)).toBe('0');
    expect(formatEthCompact(null)).toBe('—');
    expect(formatEthCompact('pas-un-nombre')).toBe('—');
  });

  it('garde trois décimales sous 1 ETH et deux au-delà', () => {
    expect(formatEthCompact(parseEther('0.12345'))).toBe('0,123');
    expect(formatEthCompact(parseEther('12.5'))).toBe('12,5');
  });

  it('compacte les millions', () => {
    expect(formatEthCompact(parseEther('2500000'))).toMatch(/2,5\s*M/);
  });
});

describe('ethInputValue — cas limites', () => {
  it('retourne une chaîne vide pour une valeur invalide', () => {
    expect(ethInputValue('abc')).toBe('');
    expect(ethInputValue(undefined)).toBe('');
  });

  it('fait l’aller-retour avec parseEth', () => {
    const wei = parseEther('0.125');
    expect(parseEth(ethInputValue(wei))).toBe(wei);
  });
});

describe('formatDeadline — cas limites', () => {
  it('accepte une chaîne numérique', () => {
    expect(formatDeadline('1700000000')).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('retourne un tiret pour une valeur invalide ou négative', () => {
    expect(formatDeadline(undefined)).toBe('—');
    expect(formatDeadline('demain')).toBe('—');
    expect(formatDeadline(-5)).toBe('—');
  });
});

describe('timeLeftLabel — cas limites', () => {
  it('gère moins d’une minute et plusieurs jours', () => {
    expect(timeLeftLabel(30)).toBe("moins d'une minute restante");
    expect(timeLeftLabel(2 * 86400 + 14 * 3600)).toBe('2 j 14 h restantes');
  });

  it('considère une valeur invalide comme terminée', () => {
    expect(timeLeftLabel(undefined)).toBe('Terminée');
  });
});

describe('plural', () => {
  it('accorde au singulier jusqu’à 1 inclus', () => {
    expect(plural(0, 'donateur')).toBe('0 donateur');
    expect(plural(1, 'donateur')).toBe('1 donateur');
  });

  it('ajoute un s au-delà de 1', () => {
    expect(plural(2, 'donateur')).toBe('2 donateurs');
    expect(plural(3n, 'vote')).toBe('3 votes');
  });

  it('utilise le pluriel irrégulier fourni', () => {
    expect(plural(2, 'travail', 'travaux')).toBe('2 travaux');
    expect(plural(1, 'travail', 'travaux')).toBe('1 travail');
  });

  it('remplace une valeur invalide par 0', () => {
    expect(plural('abc', 'donateur')).toBe('0 donateur');
  });
});

describe('remainingLabel', () => {
  it('indique le montant manquant', () => {
    expect(remainingLabel(parseEther('2.5'), parseEther('5'))).toBe(
      "Il manque 2,5 ETH pour atteindre l'objectif",
    );
  });

  it('indique l’objectif atteint à égalité ou au-delà', () => {
    expect(remainingLabel(parseEther('5'), parseEther('5'))).toBe('Objectif atteint');
    expect(remainingLabel(parseEther('6'), parseEther('5'))).toBe('Objectif atteint');
  });

  it('ne plante pas sur un objectif nul ou une valeur invalide', () => {
    expect(remainingLabel(0n, 0n)).toBe('Objectif atteint');
    expect(remainingLabel('abc', parseEther('1'))).toBe('Objectif atteint');
  });

  it('compte depuis zéro quand rien n’a été collecté', () => {
    expect(remainingLabel(undefined, parseEther('1'))).toBe(
      "Il manque 1 ETH pour atteindre l'objectif",
    );
  });
});
