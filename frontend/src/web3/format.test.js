import { describe, expect, it } from 'vitest';
import { parseEther } from 'ethers';
import {
  ethInputValue,
  formatDeadline,
  formatDuration,
  formatEth,
  formatEthCompact,
  formatPercent,
  parseEth,
  percent,
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
