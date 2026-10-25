const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../book-model.js');

test('28쪽 책을 표지부터 마지막 장까지 빠짐없이 순서대로 넘긴다', () => {
  for (const single of [false, true]) {
    const visited = []; let current = 1;
    for (let i = 0; i < 30; i++) {
      visited.push(...model.spread(current, 28, single).filter(Boolean));
      const next = model.next(current, 28, single);
      if (next === current) break;
      current = next;
    }
    assert.deepEqual(visited, Array.from({ length: 28 }, (_, i) => i + 1));
  }
});

test('뒤로 넘기기와 화면 모드 변경이 유효한 쪽을 유지한다', () => {
  for (const single of [false, true]) {
    for (let p = 1; p <= 28; p++) {
      const normalized = model.page(p, 28, single);
      const next = model.next(normalized, 28, single);
      if (next !== normalized) assert.equal(model.previous(next, 28, single), normalized);
    }
  }
  assert.deepEqual(model.spread(27, 28, false), [26, 27]);
  assert.deepEqual(model.spread(28, 28, false), [28, null]);
  assert.equal(model.page(999, 28, true), 28);
  assert.equal(model.page(-10, 28, true), 1);
});

test('표지만 있는 책과 홀수 쪽 책도 경계를 벗어나지 않는다', () => {
  assert.equal(model.next(1, 1), 1);
  assert.equal(model.previous(1, 1), 1);
  assert.deepEqual(model.spread(27, 27), [26, 27]);
  assert.equal(model.next(26, 27), 26);
});

test('책의 모든 페이지 이미지와 원본 PDF가 배포 자산에 존재한다', () => {
  const base = path.join(__dirname, '..', 'assets', 'books', 'lit');
  assert.ok(fs.statSync(path.join(base, 'LIT.pdf')).size > 0);
  for (let p = 1; p <= 28; p++) {
    assert.ok(fs.statSync(path.join(base, `page-${String(p).padStart(2, '0')}.jpg`)).size > 1000);
  }
});
