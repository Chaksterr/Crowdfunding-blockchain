/**
 * Thème visuel dérivé de l'adresse de la campagne : un dégradé, un motif SVG
 * et un picto déterministes, pour donner une identité à chaque cagnotte
 * sans dépendre d'images externes.
 */

const GRADIENTS = [
  'from-emerald-200 via-emerald-50 to-teal-200',
  'from-teal-200 via-sky-50 to-cyan-200',
  'from-indigo-200 via-indigo-50 to-violet-200',
  'from-amber-200 via-orange-50 to-amber-200',
  'from-rose-200 via-orange-50 to-amber-200',
  'from-violet-200 via-fuchsia-50 to-rose-200',
  'from-lime-200 via-emerald-50 to-teal-200',
  'from-sky-200 via-cyan-50 to-indigo-200',
];

const EMOJIS = [
  '🌱',
  '🤝',
  '✨',
  '🎨',
  '🌍',
  '🚀',
  '💛',
  '📚',
  '🧵',
  '🍀',
  '🛠️',
  '🎧',
  '🔬',
  '🏡',
  '🍲',
  '🎭',
];

const AVATAR_STYLES = [
  'bg-emerald-100 text-emerald-800',
  'bg-teal-100 text-teal-800',
  'bg-indigo-100 text-indigo-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
];

/** Motifs SVG déterministes : trames, arcs ou points superposés au dégradé. */
const PATTERNS = ['waves', 'dots', 'grid', 'arches'];

function hashAddress(address) {
  const key = String(address ?? '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Construit un motif SVG inline (data URI) déterministe pour une adresse.
 * @param {string} address
 * @param {number} seed
 * @returns {string}
 */
function patternSvg(seed) {
  const kind = PATTERNS[seed % PATTERNS.length];
  const tint = `hsl(${(seed * 47) % 360} 65% 45%)`;
  const light = `hsl(${(seed * 47 + 170) % 360} 85% 88%)`;
  const stroke = 'rgba(255,255,255,0.42)';
  const fill = 'rgba(255,255,255,0.16)';
  const offset = seed % 12;

  let shapes = '';

  if (kind === 'waves') {
    const paths = [0, 16, 32].map((dy) => {
      const shift = (offset + dy) % 20;
      return `<path d="M-20 ${70 + dy} C 10 ${48 + shift}, 40 ${92 + dy - shift}, 70 ${
        70 + dy
      } S 130 ${48 + shift}, 160 ${70 + dy} S 220 ${92 + dy - shift}, 260 ${
        70 + dy
      } V 140 H -20 Z" fill="${fill}"/>`;
    });
    shapes = paths.join('');
  } else if (kind === 'dots') {
    const radius = 2.5 + (seed % 3);
    const dots = [];
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 10; col += 1) {
        const cx = 6 + col * 16 + (row % 2 === 0 ? 0 : 8);
        const cy = 8 + row * 16;
        dots.push(
          `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}"/>`,
        );
      }
    }
    shapes = dots.join('');
  } else if (kind === 'grid') {
    const lines = [];
    for (let i = 0; i <= 8; i += 1) {
      const p = i * 16 + (offset % 6);
      lines.push(
        `<path d="M${p} 0 V 120" stroke="${stroke}" stroke-width="1"/>`,
        `<path d="M0 ${p} H 160" stroke="${stroke}" stroke-width="1"/>`,
      );
    }
    shapes = lines.join('');
  } else {
    const arches = [];
    for (let i = 0; i < 4; i += 1) {
      const x = 4 + i * 40 + (offset % 8);
      arches.push(
        `<path d="M${x} 112 V 66 a 17 17 0 0 1 34 0 V 112" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round"/>`,
      );
    }
    shapes = arches.join('');
  }

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120' viewBox='0 0 160 120'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${light}' stop-opacity='0.35'/><stop offset='100%' stop-color='${tint}' stop-opacity='0.18'/></linearGradient></defs><rect width='160' height='120' fill='url(#g)'/>${shapes}</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * @param {string} address Adresse du contrat de campagne.
 * @returns {{gradient: string, emoji: string, monogram: string, avatarStyle: string, pattern: string, patternSize: string}}
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
    pattern: patternSvg(hash),
    patternSize: hash % 2 === 0 ? '150px 112px' : '104px 104px',
  };
}

/** Le(s) donateur(s) peut(vent) être une adresse (string) ou { address }. */
export function donorAddress(donor) {
  return typeof donor === 'string' ? donor : donor?.address ?? '';
}
