(() => {
  'use strict';
  // This exhibition uses click-triggered motion as part of its storytelling.
  // Keep one transition policy for the intro and map. Ambient planets remain
  // active when the intro is skipped, and follow explicit system motion mode.
  const preference = new URLSearchParams(location.search).get('intro-motion');
  const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => {
    const reduced = preference === 'reduced' || (preference === 'system' && systemMotion.matches);
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
    document.documentElement.dataset.ambientMotion = preference === 'system' && systemMotion.matches ? 'reduced' : 'full';
  };
  update();
  systemMotion.addEventListener('change', update);
})();
