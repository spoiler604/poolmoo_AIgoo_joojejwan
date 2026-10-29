(() => {
  'use strict';
  const viewport = document.querySelector('.viewport');
  const garden = document.querySelector('.garden');
  const planets = Array.from(document.querySelectorAll('.planet-drifter'));
  if (!viewport || !garden || !planets.length) return;
  const flights = new Map(), pending = new Map();
  const random = (min, max) => min + Math.random() * (max - min);
  const reduced = () => document.documentElement.dataset.ambientMotion === 'reduced';
  let started = false;

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
    const corner = Math.floor(random(0, 4));
    const right = corner % 2 === 1, bottom = corner >= 2;
    // Begin wholly outside a random corner, then follow a shallow curve
    // to the opposite edge. Convert screen coordinates to the map's space.
    const padding = 42;
    const start = { x: right ? view.width + padding : -padding, y: bottom ? view.height + padding : -padding };
    const end = { x: right ? -padding : view.width + padding, y: bottom ? -padding : view.height + padding };
    const bend = random(-.18, .18);
    const control = { x: view.width * (.5 + bend), y: view.height * (.5 - bend) };
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
    planet.dataset.entryCorner = ['top-left', 'top-right', 'bottom-left', 'bottom-right'][corner];
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
