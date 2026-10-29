const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'cosmos-data.js'), 'utf8'), context);
const topics = context.window.COSMIC_TOPICS;
const styles = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

test('seven named charts, in the requested order', () => {
  assert.equal(topics.map(t => t.name).join(','), '한울,상목,소모둠 소개,승원,경찬,겸서,우희');
  assert.equal(new Set(topics.map(t => t.id)).size, 7);
  assert.equal(topics.find(t => t.id === 'aigu').image, './assets/cosmos/astronaut-constellation-mono.png');
  assert.ok(topics.filter(t => t.id !== 'aigu').every(t => !t.image));
  assert.notEqual(JSON.stringify(topics[0].points), JSON.stringify(topics[3].points));
});

for (const topic of topics) {
  test(`${topic.name}: every star is reachable along the chart lines`, () => {
    const graph = topic.points.map(() => new Set());
    assert.ok(topic.points.every(p => p.length === 2 && p.every(v => Number.isFinite(v) && Math.abs(v) <= 140.01)));
    for (const line of topic.lines) {
      assert.ok(line.length >= 2);
      line.forEach((index, i) => {
        assert.ok(Number.isInteger(index) && topic.points[index]);
        if (i) { graph[index].add(line[i - 1]); graph[line[i - 1]].add(index); }
      });
    }
    const pending = [0], seen = new Set(pending);
    while (pending.length) {
      for (const next of graph[pending.shift()]) {
        if (!seen.has(next)) { seen.add(next); pending.push(next); }
      }
    }
    assert.equal(seen.size, topic.points.length);
    const storyCount = ['sangmok', 'gyeongchan'].includes(topic.id) ? 1 : 3;
    assert.equal(topic.stars.length, storyCount);
    assert.equal(new Set(topic.stars.map(s => s.anchor)).size, storyCount);
    assert.equal(topic.stars.filter(s => s.bayer.startsWith('α')).length, 1);
    assert.ok(topic.stars.every(s => topic.points[s.anchor]));
    assert.ok(topic.stars.every(s => !s.position || (s.position.length === 2 && s.position.every(Number.isFinite))));
  });
}

test('소모둠 소개의 소주제 별은 새 우주인 이미지의 헬멧·왼손·오른발 별에 맞춰 배치된다', () => {
  const aigu = topics.find(topic => topic.id === 'aigu');
  assert.deepEqual(Array.from(aigu.stars, star => Array.from(star.position)), [[-2,-139],[-80,28],[70,119]]);
});

test('상목과 소모둠 소개의 소주제 1은 Canva 발표자료를 직접 표시한다', () => {
  for (const topicId of ['sangmok', 'aigu']) {
    const presentation = topics.find(topic => topic.id === topicId).stars[0].presentation;
    assert.match(presentation.url, /^https:\/\/canva\.link\//);
    assert.match(presentation.embedUrl, /^https:\/\/www\.canva\.com\/design\/.+\/view\?embed$/);
    assert.equal(presentation.type, undefined);
  }
});

test('소모둠 소개의 소주제 3은 소개글 읽기 창을 연다', () => {
  const article = topics.find(topic => topic.id === 'aigu').stars[2].article;
  assert.equal(article.title, '소개글');
  assert.equal(article.template, 'aigu-introduction');
});

test('소모둠 소개는 별과 선을 먼저 그리고 우주인 이미지를 이어서 표시한다', () => {
  assert.match(styles, /\.has-illustration\.is-unfolding \.topic-art \{ opacity: 1; \}/);
  assert.match(styles, /\.has-illustration\.is-unfolding \.astronaut-art \{ animation: astronaut-chart-arrive/);
  assert.match(styles, /@keyframes astronaut-chart-arrive/);
});
