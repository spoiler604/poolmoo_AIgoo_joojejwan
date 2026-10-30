const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'galaxy-player.js'), 'utf8');

function ellipse(width, height, angle) {
  const data = new Uint8ClampedArray(width * height * 4);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - width / 2, dy = y - height / 2;
      const radius = Math.hypot((dx * cos + dy * sin) / (width * .3), (-dx * sin + dy * cos) / (height * .16));
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = radius < 1 ? 180 : 0;
      data[i + 3] = 255;
    }
  }
  data[0] = data[1] = data[2] = 180; // Bright debris at a rectangular corner.
  return data;
}

function setup({ rejected = false, calibrate = false } = {}) {
  const classes = new Set(), listeners = new Map(), callbacks = new Map(), timers = new Map();
  let next = 0, drawn = 0, output;
  const root = { dataset: {}, querySelector: () => calibrate ? { complete: true, naturalWidth: 1280 } : null, classList: { add: c => classes.add(c), remove: c => classes.delete(c) } };
  const video = {
    readyState: 4, currentTime: 0, duration: 8, seeking: false,
    play: () => rejected ? Promise.reject(new Error('blocked')) : Promise.resolve(),
    pause() {},
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: type => listeners.delete(type),
    requestVideoFrameCallback(fn) { callbacks.set(++next, fn); return next; },
    cancelVideoFrameCallback: id => callbacks.delete(id),
  };
  const canvas = { dataset: {}, getContext: () => ({
    clearRect() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    drawImage() {},
    getImageData: () => ({ data: calibrate ? ellipse(840, 700, -40 * Math.PI / 180) : new Uint8ClampedArray(0) }),
  }) };
  const buffer = { getContext: () => ({
    drawImage() { drawn++; },
    getImageData: () => ({ data: calibrate ? ellipse(480, 270, -30 * Math.PI / 180) : new Uint8ClampedArray([0, 0, 0, 255, 200, 120, 90, 255]) }),
    putImageData: image => { output = image.data; },
  }) };
  const window = {};
  vm.runInNewContext(source, { window, document: { createElement: () => buffer }, console: { warn() {} }, setTimeout: fn => { timers.set(++next, fn); return next; }, clearTimeout: id => timers.delete(id) });
  const player = window.createGalaxyPlayer({ root, video, canvas });
  return {
    player, root, video, canvas, timers, callbacks,
    get visible() { return classes.has('is-video-playing'); },
    get drawn() { return drawn; }, get output() { return output; },
    frame(time) { video.currentTime = time; const [id, fn] = callbacks.entries().next().value; callbacks.delete(id); fn(); },
    event(type) { listeners.get(type)?.(); },
  };
}

test('video playback starts without fading the still until a real frame is drawn', async () => {
  const s = setup();
  const complete = s.player.play();
  await Promise.resolve();
  assert.equal(s.visible, false);
  s.frame(.1);
  assert.equal(s.visible, true);
  assert.equal(s.canvas.dataset.frames, '1');
  assert.equal(s.output[3], 0, 'black background becomes transparent');
  assert.equal(s.output[7], 255, 'galaxy pixels remain visible');
  s.frame(2);
  assert.equal(s.drawn, 2);
  assert.equal(s.canvas.dataset.mediaTime, '2.000');
  s.event('ended');
  assert.equal(await complete, true);
  assert.equal(s.visible, false);
  assert.equal(s.video.currentTime, 2, 'last frame is held during the fade');
  assert.equal(s.callbacks.size, 0);
  assert.equal(s.timers.size, 0);
});

test('a rejected play keeps the still visible and reports failure', async () => {
  const s = setup({ rejected: true });
  assert.equal(await s.player.play(), false);
  assert.equal(s.visible, false);
  assert.equal(s.root.dataset.galaxyPlayback, 'unavailable');
  assert.equal(s.callbacks.size, 0);
});

test('a short clip finishes at its cutoff without waiting for the full video', async () => {
  const s = setup();
  const complete = s.player.play(1.2, 3);
  s.frame(.1);
  s.frame(2.9);
  assert.equal(s.visible, true);
  s.frame(3.01);
  assert.equal(await complete, true);
  assert.equal(s.root.dataset.galaxyPlayback, 'finished');
  assert.equal(s.visible, false);
  assert.ok(s.video.currentTime < s.video.duration);
  assert.equal(s.callbacks.size, 0);
  assert.equal(s.timers.size, 0);
});

test('loading without decoded frames times out without an opacity-only animation', async () => {
  const s = setup();
  const complete = s.player.play();
  s.timers.values().next().value();
  assert.equal(await complete, false);
  assert.equal(s.drawn, 0);
  assert.equal(s.visible, false);
});

test('starting again cancels the old player and resets the frame count', async () => {
  const s = setup();
  const first = s.player.play();
  s.frame(1);
  const second = s.player.play(2);
  assert.equal(await first, false);
  assert.equal(s.canvas.dataset.frames, '0');
  assert.equal(s.visible, false);
  s.frame(.2);
  assert.equal(s.video.playbackRate, 2);
  s.event('ended');
  assert.equal(await second, true);
  assert.equal(s.callbacks.size, 0);
  assert.equal(s.timers.size, 0);
});

test('video tilt follows the still and the oval feather removes bright rectangular corners', async () => {
  const s = setup({ calibrate: true });
  const complete = s.player.play();
  s.frame(.1);
  assert.ok(Math.abs(Number(s.canvas.dataset.angleCorrection) + 10) < 1);
  assert.equal(s.output[3], 0, 'corner debris is cropped away');
  assert.equal(s.output[(135 * 480 + 240) * 4 + 3], 255, 'the galaxy core remains solid');
  assert.ok(s.output.some((value, index) => index % 4 === 3 && value > 0 && value < 255), 'the edge fades smoothly');
  s.event('ended');
  assert.equal(await complete, true);
});

test('duplicate and overly frequent decoded frames do not repeat pixel processing', async () => {
  const s = setup();
  const complete = s.player.play();
  s.frame(.1);
  s.frame(.1);
  s.frame(.12);
  assert.equal(s.drawn, 1);
  s.frame(.15);
  assert.equal(s.drawn, 2);
  s.event('ended');
  assert.equal(await complete, true);
});
