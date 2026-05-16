import { useRef, useCallback } from 'react';

/**
 * useSwipeTabs — horizontal swipe to change tabs.
 *
 * Uses a callback ref instead of useEffect so listeners attach
 * the moment the element appears in the DOM, even if it renders
 * conditionally (e.g. after a lock screen unlocks).
 */
export function useSwipeTabs(tabIds, activeTab, setTab, threshold = 60) {
  const startX  = useRef(null);
  const startY  = useRef(null);
  const cleanup = useRef(null);

  // Always-fresh values — no stale closure problem
  const latest  = useRef({ tabIds, activeTab, setTab, threshold });
  latest.current = { tabIds, activeTab, setTab, threshold };

  // Callback ref: called with the element when it mounts, null when unmounts
  const ref = useCallback((el) => {
    // Clean up previous listeners if element changes
    if (cleanup.current) {
      cleanup.current();
      cleanup.current = null;
    }
    if (!el) return;

    const onStart = (e) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };

    const onMove = (e) => {
      if (startX.current === null) return;
      const dx = Math.abs(e.touches[0].clientX - startX.current);
      const dy = Math.abs(e.touches[0].clientY - startY.current);
      if (dx > dy && dx > 8) e.preventDefault();
    };

    const onEnd = (e) => {
      if (startX.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      const { tabIds, activeTab, setTab, threshold } = latest.current;

      if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.2) {
        const idx = tabIds.indexOf(activeTab);
        if (dx < 0 && idx < tabIds.length - 1) setTab(tabIds[idx + 1]);
        if (dx > 0 && idx > 0)                  setTab(tabIds[idx - 1]);
      }

      startX.current = null;
      startY.current = null;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: true });

    cleanup.current = () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, []); // stable — latest.current always has fresh values

  return ref;
}
