const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'intro.js'), 'utf8');

function setup({ reduced = false, brokenVideo = false } = {}) {
  const timers = new Map(), frames = new Map(), animated = [];
  let timerId = 0, frameId = 0, now = 0, reveals = 0, tunnelStarts = 0, plays = 0;
  function element(name) {
    const listeners = new Map(), classes = new Set(), attrs = new Map();
    return {
      name, style: {}, dataset: {}, hidden: false, complete: true,
      classList: { add: value => classes.add(value), remove: (...values) => values.forEach(v => classes.delete(v)), contains: value => classes.has(value) },
      setAttribute: (key, value) => attrs.set(key, value), getAttribute: key => attrs.get(key) || null,
      removeAttribute: key => attrs.delete(key),
      addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
      removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
      fire(type) { [...(listeners.get(type) || [])].forEach(fn => fn()); },
      animate() { animated.push(name); return { finished: Promise.resolve(), cancel() {} }; },
      getBoundingClientRect: () => ({ left: 300, top: 50, width: 600, height: 600 }), focus() {},
    };
  }
  const intro = element('intro'), map = element('map'), video = element('video');
  const root = element('root'), camera = element('camera');
  const parts = new Map([
    ['.intro-person-walk', element('walk')], ['.intro-person-open', element('opened')],
    ['.intro-person-video', video], ['.intro-figure', element('figure')], ['.intro-camera', camera],
    ['.intro-chest-light', element('light')], ['.intro-invitation', element('invitation')],
    ['.intro-stars', element('stars')], ['.intro-aura', element('aura')], ['.intro-tunnel', element('canvas')],
  ]);
  intro.querySelector = selector => parts.get(selector);
  map.inert = true;
  video.dataset = { src: './assets/intro/intro-firefly.mp4', idleEnd: '1.2', end: '6.7', travel: 'included' };
  video.duration = 8; video.currentTime = 0; video.paused = true;
  Object.defineProperty(video, 'src', { set: value => video.setAttribute('src', value) });
  video.play = () => { plays++; video.paused = false; return brokenVideo ? Promise.reject(new Error('decode failed')) : Promise.resolve(); };
  video.pause = () => { video.paused = true; };
  video.requestVideoFrameCallback = fn => { frames.set(++frameId, fn); return frameId; };
  video.cancelVideoFrameCallback = id => frames.delete(id);
  const document = element('document');
  document.documentElement = { dataset: { motion: reduced ? 'reduced' : 'full' } };
  document.body = element('body');
  document.querySelector = selector => ({ '#intro': intro, '.page-shell': map, '.node-root': root })[selector];
  document.dispatchEvent = () => { reveals++; };
  const environment = {
    document, Event, console, getComputedStyle: () => ({ opacity: '1' }), innerWidth: 1280, innerHeight: 720,
    window: { createIntroTunnel: () => ({ start: () => { tunnelStarts++; return Promise.resolve(); }, stop() {} }) },
    setTimeout(fn, delay) { timers.set(++timerId, { fn, at: now + delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  };
  vm.runInNewContext(source, environment);
  return {
    intro, video, map, document, frames, timers, animated,
    get reveals() { return reveals; }, get tunnelStarts() { return tunnelStarts; }, get plays() { return plays; },
    tick(time) { now = time; [...timers].filter(([, t]) => t.at <= now).forEach(([id, t]) => { timers.delete(id); t.fn(); }); },
    advanceVideo(time) { video.currentTime = time; const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn()); video.fire('timeupdate'); },
    async flush() { for (let i = 0; i < 30; i++) await Promise.resolve(); },
  };
}

test('영상의 걷기 구간을 반복하다 클릭하면 이어 재생하고, 복귀 장면 전 지도에 도착한다', async () => {
  const s = setup();
  s.video.fire('loadeddata'); await s.flush();
  s.advanceVideo(1.5);
  assert.equal(s.video.currentTime, 0);
  s.intro.fire('click'); await s.flush();
  s.tick(6501); await s.flush();
  assert.equal(s.intro.hidden, false);
  s.advanceVideo(6.73); await s.flush();
  assert.equal(s.intro.dataset.openingSource, 'video');
  assert.equal(s.intro.hidden, true);
  assert.equal(s.map.inert, false);
  assert.equal(s.video.paused, true);
  assert.equal(s.tunnelStarts, 0);
  assert.equal(s.animated.includes('camera'), false);
  assert.equal(s.reveals, 1);
  assert.equal(s.frames.size, 0);
  assert.equal(s.timers.size, 0);
});

test('영상 재생이 실패하면 이미지와 별빛 터널로 전환해 지도에 도착한다', async () => {
  const s = setup({ brokenVideo: true });
  s.intro.fire('click'); await s.flush();
  s.tick(1000); await s.flush();
  assert.equal(s.intro.dataset.openingSource, 'image');
  assert.equal(s.tunnelStarts, 1);
  assert.equal(s.intro.hidden, true);
  assert.equal(s.map.inert, false);
  assert.equal(s.reveals, 1);
});

test('영상 재생 중 탭을 벗어나도 대기와 비디오 콜백을 정리한다', async () => {
  const s = setup();
  s.intro.fire('click'); await s.flush();
  s.document.hidden = true; s.document.fire('visibilitychange'); await s.flush();
  assert.equal(s.intro.hidden, true);
  assert.equal(s.map.inert, false);
  assert.equal(s.frames.size, 0);
  assert.equal(s.timers.size, 0);
  assert.equal(s.reveals, 1);
});

test('모션 감소 모드에서는 영상과 터널 없이 지도를 표시한다', async () => {
  const s = setup({ reduced: true });
  s.intro.fire('click'); await s.flush();
  assert.equal(s.plays, 0);
  assert.equal(s.tunnelStarts, 0);
  assert.equal(s.intro.hidden, true);
  assert.equal(s.map.inert, false);
});
