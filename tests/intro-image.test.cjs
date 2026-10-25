const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'intro.js'), 'utf8');

function setup({ reduced = false, brokenImage = false } = {}) {
  const timers = new Map(), animated = [];
  let timerId = 0, now = 0, reveals = 0, tunnelStarts = 0, stops = 0;
  function element(name) {
    const listeners = new Map(), classes = new Set(), attrs = new Map();
    return {
      name, style: {}, dataset: {}, hidden: false, complete: true,
      classList: { add: value => classes.add(value), remove: (...values) => values.forEach(v => classes.delete(v)), contains: value => classes.has(value) },
      setAttribute: (key, value) => attrs.set(key, value), getAttribute: key => attrs.get(key) || null,
      removeAttribute: key => attrs.delete(key),
      addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
      fire(type) { [...(listeners.get(type) || [])].forEach(fn => fn()); },
      animate() { animated.push(name); return { finished: Promise.resolve(), cancel() {} }; },
      getBoundingClientRect: () => ({ left: 300, top: 50, width: 600, height: 600 }), focus() {},
    };
  }
  const intro = element('intro'), map = element('map'), opened = element('opened');
  opened.complete = !brokenImage;
  opened.decode = () => brokenImage ? Promise.reject(new Error('decode failed')) : Promise.resolve();
  const parts = new Map([
    ['.intro-person-walk', element('walk')], ['.intro-person-open', opened],
    ['.intro-figure', element('figure')], ['.intro-camera', element('camera')],
    ['.intro-chest-light', element('light')], ['.intro-invitation', element('invitation')],
    ['.intro-stars', element('stars')], ['.intro-aura', element('aura')], ['.intro-tunnel', element('canvas')],
  ]);
  intro.querySelector = selector => parts.get(selector);
  map.inert = true;
  const document = element('document');
  document.documentElement = { dataset: { motion: reduced ? 'reduced' : 'full' } };
  document.body = element('body');
  document.querySelector = selector => ({ '#intro': intro, '.page-shell': map, '.node-root': element('root') })[selector];
  document.dispatchEvent = () => { reveals++; };
  const environment = {
    document, Event, console, innerWidth: 1280, innerHeight: 720,
    window: {
      createIntroTunnel: () => ({
        start(origin) {
          assert.ok(origin.x > 0 && origin.x < 1 && origin.y > 0 && origin.y < 1);
          tunnelStarts++; return Promise.resolve();
        },
        stop() { stops++; },
      }),
    },
    setTimeout(fn, delay) { timers.set(++timerId, { fn, at: now + delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  };
  vm.runInNewContext(source, environment);
  return {
    intro, map, document, timers, animated,
    get reveals() { return reveals; }, get tunnelStarts() { return tunnelStarts; }, get stops() { return stops; },
    tick(time) { now = time; [...timers].filter(([, t]) => t.at <= now).forEach(([id, t]) => { timers.delete(id); t.fn(); }); },
    async flush() { for (let i = 0; i < 30; i++) await Promise.resolve(); },
  };
}

test('이미지 가슴 열림과 카메라 이동 뒤 별빛 터널을 거쳐 지도에 도착한다', async () => {
  const s = setup();
  s.intro.fire('click'); await s.flush();
  assert.equal(s.intro.hidden, false);
  assert.ok(s.animated.includes('walk') && s.animated.includes('opened') && s.animated.includes('camera'));
  s.tick(1000); await s.flush();
  assert.equal(s.intro.dataset.openingSource, 'image');
  assert.equal(s.tunnelStarts, 1);
  assert.equal(s.intro.hidden, true);
  assert.equal(s.map.inert, false);
  assert.equal(s.reveals, 1);
  assert.equal(s.timers.size, 0);
});

test('연출 중 연속 클릭해도 중복 실행하거나 지도를 두 번 표시하지 않는다', async () => {
  const s = setup();
  s.intro.fire('click'); s.intro.fire('click'); await s.flush();
  s.tick(1000); await s.flush();
  assert.equal(s.animated.filter(name => name === 'opened').length, 1);
  assert.equal(s.tunnelStarts, 1);
  assert.equal(s.reveals, 1);
});

test('이미지 디코딩이 실패해도 지도로 이동하고 남은 대기를 정리한다', async () => {
  const s = setup({ brokenImage: true });
  s.intro.fire('click'); await s.flush();
  s.tick(1000); await s.flush();
  assert.equal(s.intro.hidden, true);
  assert.equal(s.map.inert, false);
  assert.equal(s.timers.size, 0);
});

test('줌인 중 탭을 벗어나면 터널을 중단하고 지도에 도착한다', async () => {
  const s = setup();
  s.intro.fire('click'); await s.flush();
  s.document.hidden = true; s.document.fire('visibilitychange'); await s.flush();
  assert.equal(s.intro.hidden, true);
  assert.equal(s.map.inert, false);
  assert.equal(s.tunnelStarts, 0);
  assert.equal(s.stops, 1);
  assert.equal(s.timers.size, 0);
  assert.equal(s.reveals, 1);
});

test('모션 감소 모드에서는 이미지 줌인과 터널 없이 지도를 표시한다', async () => {
  const s = setup({ reduced: true });
  s.intro.fire('click'); await s.flush();
  assert.equal(s.tunnelStarts, 0);
  assert.equal(s.animated.includes('camera'), false);
  assert.equal(s.intro.hidden, true);
  assert.equal(s.map.inert, false);
});
