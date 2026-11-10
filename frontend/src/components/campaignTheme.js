/**
 * Thème visuel dérivé de l'adresse de la campagne : un dégradé et un picto
 * déterministes, pour donner une identité chaude à chaque cagnotte
 * sans dépendre d'images externes.
 */

const GRADIENTS = [
  'from-emerald-200 via-emerald-50 to-teal-200',
  'from-teal-200 via-sky-50 to-cyan-200',
  'from-indigo-200 via-indigo-50 to-violet-200',
  'from-amber-200 via-orange-50 to-amber-200',
  'from-rose-200 via-orange-50 to-amber-200',
];

const EMOJIS = ['🌱', '🤝', '✨', '🎨', '🌍', '🚀', '💛', '📚'];

const AVATAR_STYLES = [
  'bg-emerald-100 text-emerald-800',
  'bg-teal-100 text-teal-800',
  'bg-indigo-100 text-indigo-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
];

function hashAddress(address) {
  const key = String(address ?? '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * @param {string} address Adresse du contrat de campagne.
 * @returns {{gradient: string, emoji: string, monogram: string, avatarStyle: string}}
 */
export function campaignTheme(address) {
  const hash = hashAddress(address);
  return {
    gradient: GRADIENTS[hash % GRADIENTS.length],
    emoji: EMOJIS[hash % EMOJIS.length],
    monogram: String(address ?? '')
      .toLowerCase()
      .replace(/^0x/, '')
      .slice(0, 1)
      .toUpperCase(),
    avatarStyle: AVATAR_STYLES[Math.floor(hash / 7) % AVATAR_STYLES.length],
  };
}

/** Le(s) donateur(s) peut(vent) être une adresse (string) ou { address }. */
export function donorAddress(donor) {
  return typeof donor === 'string' ? donor : donor?.address ?? '';
}
