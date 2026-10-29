(() => {
  'use strict';
  const viewport = document.querySelector('.viewport');
  const garden = document.querySelector('.garden');
  const planets = Array.from(document.querySelectorAll('.planet-drifter'));
  if (!viewport || !garden || !planets.length) return;
  const flights = new Map(), pending = new Map();
  const random = (min, max) => min + Math.random() * (max - min);
  const reduced = () => document.documentElement.dataset.ambientMotion === 'reduced';
  let entryEdges = [];
  let started = false;

  function nextEntryEdge() {
    if (!entryEdges.length) {
      entryEdges = ['top', 'bottom', 'left', 'right'];
      for (let i = entryEdges.length - 1; i > 0; i--) {
        const j = Math.floor(random(0, i + 1));
        [entryEdges[i], entryEdges[j]] = [entryEdges[j], entryEdges[i]];
      }
    }
    return entryEdges.pop();
  }

  function schedule(planet, delay) {
    const item = { remaining: delay, due: 0, timer: 0 };
    pending.set(planet, item);
    if (!document.hidden) arm(planet, item);
  }
  function arm(planet, item) {
    item.due = performance.now() + item.remaining;
    item.timer = setTimeout(() => {
      pending.delete(planet);
      if (!reduced()) launch(planet);
    }, item.remaining);
  }
  function launch(planet) {
    const view = viewport.getBoundingClientRect();
    const map = garden.getBoundingClientRect();
    const scale = map.width / garden.offsetWidth;
    if (!scale || !view.width || !view.height) return;
    const edge = nextEntryEdge();
    // Each shuffled group uses all four edges once, with independent entry
    // and exit positions along those edges. Convert to the map's space.
    const padding = 42;
    let start, end;
    if (edge === 'top' || edge === 'bottom') {
      start = { x: view.width * random(.08, .92), y: edge === 'top' ? -padding : view.height + padding };
      end = { x: view.width * random(.08, .92), y: edge === 'top' ? view.height + padding : -padding };
    } else {
      start = { x: edge === 'left' ? -padding : view.width + padding, y: view.height * random(.08, .92) };
      end = { x: edge === 'left' ? view.width + padding : -padding, y: view.height * random(.08, .92) };
    }
    const control = { x: view.width * random(.3, .7), y: view.height * random(.3, .7) };
    const frames = Array.from({ length: 41 }, (_, index) => {
      const t = index / 40, u = 1 - t;
      const x = u*u*start.x + 2*u*t*control.x + t*t*end.x;
      const y = u*u*start.y + 2*u*t*control.y + t*t*end.y;
      return {
        offset: t,
        transform: `translate(${(view.left + x - map.left) / scale - 23}px, ${(view.top + y - map.top) / scale - 23}px)`,
        opacity: index === 0 || index === 40 ? 0 : 1,
      };
    });
    planet.dataset.entryEdge = edge;
    planet.classList.add('is-travelling');
    const animation = planet.animate(frames, { duration: random(145000, 225000), easing: 'linear' });
    flights.set(planet, animation);
    animation.finished.then(() => {
      if (flights.get(planet) !== animation) return;
      flights.delete(planet);
      planet.classList.remove('is-travelling');
      animation.cancel();
      schedule(planet, random(8000, 22000));
    }, () => {});
  }
  function populate() {
    if (!started || reduced()) return;
    const order = planets.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random(0, i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    let delay = random(3000, 5500);
    order.forEach(planet => {
      schedule(planet, delay);
      delay += random(7000, 14000);
    });
  }
  function reset() {
    entryEdges = [];
    pending.forEach(item => clearTimeout(item.timer));
    pending.clear();
    flights.forEach(animation => animation.cancel());
    flights.clear();
    planets.forEach(planet => planet.classList.remove('is-travelling'));
    populate();
  }
  document.addEventListener('mindmap:reveal', () => {
    if (started) return;
    started = true;
    populate();
  }, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      flights.forEach(animation => animation.pause());
      pending.forEach(item => {
        clearTimeout(item.timer);
        item.remaining = Math.max(0, item.due - performance.now());
      });
    } else {
      flights.forEach(animation => animation.play());
      pending.forEach((item, planet) => arm(planet, item));
    }
  });
  window.addEventListener('resize', reset);
  new MutationObserver(reset).observe(document.documentElement, { attributes: true, attributeFilter: ['data-ambient-motion'] });
})();
