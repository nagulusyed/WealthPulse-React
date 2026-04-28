import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive breakpoints.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Convenience: is the viewport mobile-sized? */
export function useIsMobile() {
  return useMediaQuery('(max-width: 768px)');
}
