import { describe, expect, it } from 'vitest';
import { campaignTheme, donorAddress } from './campaignTheme';

const A = '0x1234567890abcdef1234567890abcdef12345678';
const B = '0xa16E02E87b7454126E5E10d957A927A7F5B5d2be';

describe('campaignTheme', () => {
  it('est déterministe pour une même adresse', () => {
    expect(campaignTheme(A)).toEqual(campaignTheme(A));
  });

  it('ignore la casse de l’adresse (checksum ou minuscules)', () => {
    expect(campaignTheme(B)).toEqual(campaignTheme(B.toLowerCase()));
  });

  it('renvoie toutes les propriétés attendues', () => {
    const theme = campaignTheme(A);
    expect(theme.gradient).toMatch(/^from-\S+ via-\S+ to-\S+$/);
    expect(theme.emoji).toBeTruthy();
    expect(theme.avatarStyle).toMatch(/^bg-\S+ text-\S+$/);
    expect(theme.patternSize).toMatch(/^(150px 112px|104px 104px)$/);
  });

  it('produit un motif SVG en data URI décodable', () => {
    const { pattern } = campaignTheme(A);
    expect(pattern.startsWith('data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(pattern.slice('data:image/svg+xml,'.length));
    expect(svg).toMatch(/^<svg xmlns='http:\/\/www\.w3\.org\/2000\/svg'/);
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('prend la première lettre après 0x, en majuscule, comme monogramme', () => {
    expect(campaignTheme('0xabc').monogram).toBe('A');
    expect(campaignTheme('0X9f').monogram).toBe('9');
  });

  it('varie selon les adresses', () => {
    const themes = Array.from({ length: 24 }, (_, i) =>
      campaignTheme(`0x${i.toString(16).padStart(40, '0')}`),
    );
    expect(new Set(themes.map((t) => t.gradient)).size).toBeGreaterThan(1);
    expect(new Set(themes.map((t) => t.pattern)).size).toBeGreaterThan(1);
  });

  it('supporte une adresse absente sans planter', () => {
    const theme = campaignTheme(undefined);
    expect(theme.monogram).toBe('');
    expect(theme).toEqual(campaignTheme(''));
  });
});

describe('donorAddress', () => {
  it('accepte une adresse brute ou un objet { address }', () => {
    expect(donorAddress(A)).toBe(A);
    expect(donorAddress({ address: A, amount: 1n })).toBe(A);
  });

  it('renvoie une chaîne vide sinon', () => {
    expect(donorAddress(null)).toBe('');
    expect(donorAddress({})).toBe('');
  });
});
