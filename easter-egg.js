(() => {
  'use strict';
  const cat = document.querySelector('.cat-easter-egg');
  const viewport = document.querySelector('.viewport');
  if (!cat || !viewport) return;
  const interval = 3 * 60 * 1000;
  let started = false, timer = 0, due = 0, remaining = interval, flight = null;
  function arm() {
    if (!started || document.hidden) return;
    due = performance.now() + remaining;
    timer = setTimeout(visit, remaining);
  }
  function visit() {
    remaining = interval;
    arm();
    if (document.documentElement.dataset.ambientMotion === 'reduced') return;
    cat.style.top = `${Math.round(viewport.clientHeight * (.18 + Math.random() * .55))}px`;
    cat.hidden = false;
    const animation = cat.animate([
      { transform: 'translateX(-70px)', opacity: 0 },
      { opacity: .9, offset: .07 },
      { opacity: .9, offset: .93 },
      { transform: `translateX(${viewport.clientWidth + 70}px)`, opacity: 0 },
    ], { duration: 18000, easing: 'linear' });
    flight = animation;
    animation.finished.then(() => {
      if (flight !== animation) return;
      cat.hidden = true;
      animation.cancel();
      flight = null;
    }, () => {});
  }
  document.addEventListener('mindmap:reveal', () => {
    if (started) return;
    started = true;
    arm();
  }, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (!started) return;
    if (document.hidden) {
      clearTimeout(timer);
      remaining = Math.max(0, due - performance.now());
      flight?.pause();
    } else {
      flight?.play();
      arm();
    }
  });
})();
