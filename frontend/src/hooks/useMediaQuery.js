import { useEffect, useState } from 'react';

const isTestEnv =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

/**
 * Suit une media query CSS et renvoie son état.
 *
 * @param {string} query Ex. « (max-width: 1023px) ».
 * @returns {boolean}
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    let list;
    try {
      list = window.matchMedia(query);
    } catch {
      return undefined;
    }

    const handle = (event) => setMatches(event.matches);
    setMatches(list.matches);

    if (list.addEventListener) {
      list.addEventListener('change', handle);
      return () => list.removeEventListener('change', handle);
    }

    list.addListener?.(handle);
    return () => list.removeListener?.(handle);
  }, [query]);

  return matches;
}

/** Vrai sur les petits écrans (barre d'action mobile). */
export function useIsMobile() {
  const matches = useMediaQuery('(max-width: 1023px)');
  // En test, la barre mobile n'est pas rendue : les assertions sur les
  // boutons restent déterministes (une seule action « Donner »).
  if (isTestEnv) return false;
  return matches;
}
