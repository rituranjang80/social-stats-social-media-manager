import { useState, useEffect } from 'react';

const MOBILE = 768;

export default function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { isMobile, isDesktop: !isMobile };
}
