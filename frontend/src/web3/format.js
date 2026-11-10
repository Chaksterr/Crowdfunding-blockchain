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
 * Convertit un montant en ETH (nombre) en chaîne lisible française.
 * Utilisé pour les animations de compteur, où la valeur est déjà décimale.
 * @param {number|string|null|undefined} eth
 * @param {number} maxDecimals
 */
export function formatEthNumber(eth, maxDecimals = 4) {
  const value = Number(eth);
  if (!Number.isFinite(value)) return EMPTY;

  return value.toLocaleString('fr-FR', {
    maximumFractionDigits: maxDecimals,
  });
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

/** « 62,5 % » — un chiffre après la virgule, deux sous 1 %. */
export function formatPercent(raised, goal) {
  const value = percent(raised, goal);
  const digits = value > 0 && value < 1 ? 2 : 1;

  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: digits,
  }).format(value)} %`;
}

const compactFormatter = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Montant ETH compact pour les totaux : « 8,5 », « 1,2 k », « 3 M ».
 * @param {bigint|string|number|null|undefined} wei
 */
export function formatEthCompact(wei) {
  if (wei === null || wei === undefined || wei === '') return EMPTY;

  let value;
  try {
    value = Number(formatEther(BigInt(wei)));
  } catch {
    return EMPTY;
  }

  if (!Number.isFinite(value)) return EMPTY;
  if (value === 0) return '0';
  if (Math.abs(value) >= 1000) return compactFormatter.format(value);

  return value.toLocaleString('fr-FR', {
    maximumFractionDigits: value < 1 ? 3 : 2,
  });
}

/**
 * Montant en ETH utilisable dans un champ de saisie, sans séparateur de
 * milliers et avec la virgule française : « 0,5 ».
 * @param {bigint|string|number} wei
 */
export function ethInputValue(wei) {
  try {
    return formatEther(BigInt(wei)).replace('.', ',');
  } catch {
    return '';
  }
}

/** « 2 j 14 h restantes », « moins d'une minute restante », « Terminée ». */
export function timeLeftLabel(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  if (total === 0) return 'Terminée';
  if (total < 60) return "moins d'une minute restante";

  return `${formatDuration(total)} restantes`;
}

/**
 * Accord simple en nombre : `plural(1, 'donateur')` → « 1 donateur »,
 * `plural(2, 'donateur')` → « 2 donateurs ».
 * Le pluriel peut être fourni explicitement pour les formes irrégulières.
 * @param {number|bigint|string} count
 * @param {string} singular
 * @param {string} [pluralForm]
 */
export function plural(count, singular, pluralForm) {
  const value = Number(count);
  const safe = Number.isFinite(value) ? value : 0;
  const word = safe > 1 ? pluralForm ?? `${singular}s` : singular;
  return `${safe} ${word}`;
}

/**
 * Phrase « combien reste-t-il à collecter ? ».
 * « Il manque 2,5 ETH pour atteindre l'objectif » ou « Objectif atteint ».
 * @param {bigint|string|number} raised
 * @param {bigint|string|number} goal
 * @returns {string}
 */
export function remainingLabel(raised, goal) {
  try {
    const raisedValue = BigInt(raised ?? 0);
    const goalValue = BigInt(goal ?? 0);
    if (goalValue <= 0n) return 'Objectif atteint';

    if (raisedValue >= goalValue) return 'Objectif atteint';

    const missing = goalValue - raisedValue;
    return `Il manque ${formatEth(missing)} ETH pour atteindre l'objectif`;
  } catch {
    return 'Objectif atteint';
  }
}
