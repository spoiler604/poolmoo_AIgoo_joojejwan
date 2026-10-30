const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'intro-tunnel.js'), 'utf8');

function scene(width = 1280, height = 720) {
  let now = 0, nextFrame = 0, draws = 0;
  const frames = new Map(), listeners = new Map();
  const gradient = () => ({ addColorStop() {} });
  const context = {
    createRadialGradient: gradient, createLinearGradient: gradient,
    setTransform() {}, clearRect() {}, save() {}, restore() {}, beginPath() {},
    moveTo() {}, lineTo() {}, closePath() {}, clip() {}, fillRect() {},
    stroke() { draws++; }, fill() {},
    arc(x, y, radius) {
      assert.ok([x, y, radius].every(Number.isFinite));
      assert.ok(radius > 0);
    },
  };
  const canvas = { dataset: {}, style: {}, getContext: () => context };
  const environment = {
    window: {}, innerWidth: width, innerHeight: height, devicePixelRatio: 3,
    performance: { now: () => now },
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) { if (listeners.get(name) === callback) listeners.delete(name); },
  };
  vm.runInNewContext(source, environment);
  return {
    create: environment.window.createIntroTunnel, canvas, frames, listeners,
    get draws() { return draws; },
    step(time) {
      now = time;
      const batch = [...frames.values()]; frames.clear();
      batch.forEach(callback => callback(now));
    },
  };
}

test('터널은 클릭 전에는 그리지 않고, 완료 시 프레임과 리사이즈 리스너를 정리한다', async () => {
  const s = scene(), tunnel = s.create(s.canvas);
  assert.equal(s.frames.size, 0);
  const done = tunnel.start({ x: .52, y: .55 });
  assert.equal(tunnel.start({ x: .5, y: .5 }), done);
  for (let t = 0; t <= 3200; t += 100) s.step(t);
  await done;
  assert.ok(s.draws > 0);
  assert.equal(s.canvas.dataset.state, 'settled');
  assert.equal(s.frames.size, 0);
  assert.equal(s.listeners.size, 0);
});

test('중도 종료하면 대기를 해제하고 이후 프레임을 그리지 않는다', async () => {
  const s = scene(), tunnel = s.create(s.canvas);
  const done = tunnel.start({ x: .52, y: .55 });
  s.step(100); tunnel.stop();
  const drawn = s.draws;
  await done;
  s.step(1000);
  assert.equal(s.draws, drawn);
  assert.equal(s.frames.size, 0);
  assert.equal(s.listeners.size, 0);
  tunnel.stop();
});

test('좁은 고해상도 화면에서도 입자 좌표가 유효하고 캔버스 배율을 제한한다', async () => {
  const s = scene(390, 844), tunnel = s.create(s.canvas);
  const done = tunnel.start({ x: .52, y: .55 });
  for (let t = 0; t <= 3200; t += 100) s.step(t);
  await done;
  assert.equal(s.canvas.width, 585);
  assert.equal(s.canvas.height, 1266);
  assert.ok(s.draws > 0);
});

test('Canvas를 사용할 수 없으면 일반 인트로로 진행할 수 있다', () => {
  const s = scene();
  assert.equal(s.create(null), null);
  assert.equal(s.create({ getContext: () => null }), null);
});

test('4K 화면에서도 터널의 그리기 버퍼는 약 160만 픽셀 이내로 제한한다', async () => {
  const s = scene(3840, 2160), tunnel = s.create(s.canvas);
  const done = tunnel.start({ x: .52, y: .55 });
  assert.ok(s.canvas.width * s.canvas.height <= 1602000);
  for (let t = 0; t <= 3200; t += 100) s.step(t);
  await done;
  assert.ok(s.draws > 0);
});
