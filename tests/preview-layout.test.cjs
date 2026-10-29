const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'preview-layout.js'), 'utf8'), context);
const layout = context.window.PreviewLayout;

test('a single story stays reachable and is centered on compact screens', () => {
  for (const [width, height] of [[1280,720],[768,689],[390,735],[320,568]]) {
    const center = {x:width/2,y:height/2};
    const cards = layout.arrange({width,height,center,anchors:[center],scale:.8,media:[{image:true,ratio:16/9}]});
    assert.equal(cards.length,1);
    const card = cards[0];
    assert.ok(card.x>=0 && card.y>=0);
    assert.ok(card.x+card.width<=width && card.y+card.height<=height-60);
    if (card.compact) assert.ok(Math.abs(card.x+card.width/2-width/2)<1);
  }
});

for (const [width, height, scale] of [[1280,720,1.2],[768,689,.75],[390,735,.8],[320,568,.6],[1280,400,.5]]) {
  test(`${width}×${height}: three reachable previews stay on screen without overlapping`, () => {
    const center = {x:width/2, y:height/2-30};
    // A deliberately crowded chart: all anchors almost share a position.
    const anchors = [{x:center.x-40,y:center.y},{x:center.x,y:center.y+2},{x:center.x+40,y:center.y+4}];
    const cards = layout.arrange({width,height,center,anchors,scale});
    assert.equal(cards.length, 3);
    for (const card of cards) {
      assert.ok(card.x >= 0 && card.y >= 0);
      assert.ok(card.x + card.width <= width);
      assert.ok(card.y + card.height <= height - 60);
      assert.ok(card.width >= 80 && card.height >= 44);
    }
    for (let i = 0; i < cards.length; i++) for (let j = i+1; j < cards.length; j++) {
      const a=cards[i],b=cards[j];
      assert.ok(a.x+a.width <= b.x || b.x+b.width <= a.x || a.y+a.height <= b.y || b.y+b.height <= a.y);
    }
  });
}

test('panning away and zooming in cannot push preview columns into each other', () => {
  for (const center of [{x:-400,y:-300},{x:1200,y:1200}]) {
    const width=768,height=689;
    const anchors=[{x:center.x-40,y:center.y},{x:center.x,y:center.y+20},{x:center.x+40,y:center.y+40}];
    const cards=layout.arrange({width,height,center,anchors,scale:1.2});
    for (const card of cards) {
      assert.ok(card.x>=0 && card.y>=0);
      assert.ok(card.x+card.width<=width && card.y+card.height<=height-60);
    }
    for (let i=0;i<cards.length;i++) for (let j=i+1;j<cards.length;j++) {
      const a=cards[i],b=cards[j];
      assert.ok(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y);
    }
  }
});

test('portrait image previews become taller, remain visible, and do not overlap', () => {
  const media=[{}, {image:true,ratio:400/592}, {image:true,ratio:845/1200}];
  for (const [width,height] of [[1280,720],[768,689],[390,735],[320,568],[1280,400]]) {
    const center={x:width/2,y:height/2};
    const anchors=[{x:center.x-80,y:center.y},{x:center.x+20,y:center.y},{x:center.x+80,y:center.y+20}];
    const cards=layout.arrange({width,height,center,anchors,scale:.8,media});
    const ordinary=layout.arrange({width,height,center,anchors,scale:.8});
    assert.ok(cards[1].mediaHeight>ordinary[1].mediaHeight);
    assert.ok(cards[2].mediaHeight>ordinary[2].mediaHeight);
    for (const card of cards) {
      assert.ok(card.x>=0 && card.y>=0);
      assert.ok(card.x+card.width<=width && card.y+card.height<=height-60);
    }
    for (let i=0;i<cards.length;i++) for (let j=i+1;j<cards.length;j++) {
      const a=cards[i],b=cards[j];
      assert.ok(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y);
    }
  }
});

test('landscape image previews get more space than ordinary previews on a desktop', () => {
  const width=1280,height=720,center={x:640,y:360};
  const anchors=[{x:600,y:320},{x:650,y:350},{x:700,y:400}];
  const cards=layout.arrange({width,height,center,anchors,scale:1.2,media:[{}, {image:true,ratio:1408/768}, {image:true,ratio:2048/954}]});
  assert.ok(cards[1].width>cards[0].width);
  assert.ok(cards[1].mediaHeight>cards[0].mediaHeight);
  assert.ok(cards[2].width>cards[0].width);
});
