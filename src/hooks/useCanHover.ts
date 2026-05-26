import { useEffect, useState } from 'react';

const hoverQuery = '(hover: hover) and (pointer: fine)';

export function useCanHover() {
  const [canHover, setCanHover] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(hoverQuery).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(hoverQuery);
    const update = () => setCanHover(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return canHover;
}
