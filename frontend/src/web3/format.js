import { formatEther, parseEther } from 'ethers';

const EMPTY = '—';
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

/**
 * Convertit des wei en montant lisible (sans unité).
 * @param {bigint|string|number|null|undefined} wei
 * @param {number} maxDecimals
 */
export function formatEth(wei, maxDecimals = 4) {
  if (wei === null || wei === undefined || wei === '') return EMPTY;

  try {
    const value = Number(formatEther(BigInt(wei)));
    if (!Number.isFinite(value)) return EMPTY;

    return value.toLocaleString('fr-FR', {
      maximumFractionDigits: maxDecimals,
    });
  } catch {
    return EMPTY;
  }
}

/**
 * Convertit une saisie utilisateur (virgule acceptée) en wei.
 * @param {string|number} value
 * @returns {bigint}
 */
export function parseEth(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(',', '.');

  if (!/^\d*\.?\d+$/.test(normalized) || !normalized) {
    throw new Error('Montant invalide.');
  }

  try {
    return parseEther(normalized);
  } catch {
    throw new Error('Montant invalide.');
  }
}

/** 0x1234…abcd */
export function shortAddress(address, chars = 4) {
  if (!address || typeof address !== 'string') return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Date limite (secondes Unix) au format français court. */
export function formatDeadline(unixSeconds) {
  if (unixSeconds === null || unixSeconds === undefined) return EMPTY;

  const seconds = Number(unixSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return EMPTY;

  return dateFormatter.format(new Date(seconds * 1000));
}

/** Durée compacte : « 2 j 14 h », « 14 h 05 min », « 32 min ». */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  if (total === 0) return 'Terminée';
  if (total < 60) return "moins d'une minute";

  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (days > 0) return hours > 0 ? `${days} j ${hours} h` : `${days} j`;
  if (hours > 0) {
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  }
  return `${minutes} min`;
}

/** Pourcentage de progression, plafonné à 100. */
export function percent(raised, goal) {
  try {
    const raisedValue = BigInt(raised ?? 0);
    const goalValue = BigInt(goal ?? 0);
    if (goalValue <= 0n) return 0;

    const basisPoints = (raisedValue * 10000n) / goalValue;
    return Math.min(100, Math.max(0, Number(basisPoints) / 100));
  } catch {
    return 0;
  }
}
