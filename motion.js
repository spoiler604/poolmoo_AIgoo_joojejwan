(() => {
  'use strict';
  // This exhibition uses click-triggered motion as part of its storytelling.
  // Keep one policy for CSS, the intro, and the map so they cannot disagree.
  const preference = new URLSearchParams(location.search).get('intro-motion');
  const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => {
    const reduced = preference === 'reduced' || (preference === 'system' && systemMotion.matches);
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  };
  update();
  systemMotion.addEventListener('change', update);
})();
