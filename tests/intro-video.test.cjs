const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','intro-video.js'),'utf8');

function setup({rejected=false}={}) {
  const listeners=new Map(), frames=new Map(), timers=new Map(), classes=new Set(), documentEvents=new Map();
  let id=0,paused=0,plays=0;
  const video={
    currentTime:0,duration:8,readyState:4,seeking:false,
    play:()=>{plays++;return rejected?Promise.reject(new Error('blocked')):Promise.resolve();},
    pause(){paused++;},
    addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),
    requestVideoFrameCallback(fn){frames.set(++id,fn);return id;},cancelVideoFrameCallback:key=>frames.delete(key),
  };
  const intro={dataset:{},classList:{add:key=>classes.add(key),remove:key=>classes.delete(key),contains:key=>classes.has(key)}};
  const document={hidden:false,addEventListener:(type,fn)=>documentEvents.set(type,fn),removeEventListener:type=>documentEvents.delete(type)};
  const window={};
  vm.runInNewContext(source,{window,document,setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:key=>timers.delete(key)});
  const player=window.createIntroVideo({intro,video});
  return {player,intro,video,timers,frames,listeners,documentEvents,document,
    get paused(){return paused;},get plays(){return plays;},get visible(){return classes.has('has-video');},
    frame(time){video.currentTime=time;const [key,fn]=frames.entries().next().value;frames.delete(key);fn();},
  };
}

test('idle video repeats the walking section until the visitor clicks',async()=>{
  const s=setup();
  assert.equal(s.video.playbackRate,.82);
  assert.equal(s.visible,false);
  s.frame(.1);assert.equal(s.visible,true);
  s.frame(2.03);
  assert.equal(s.video.currentTime,2.02);
  assert.equal(s.paused,1);
  assert.equal(s.intro.dataset.videoState,'looping');
  const restart=[...s.timers.values()].at(-1);restart();
  await Promise.resolve();
  assert.equal(s.video.currentTime,.08);
  assert.equal(s.intro.dataset.videoState,'walking');
  assert.equal(s.frames.size,1);
  s.player.stop();assert.equal(s.frames.size,0);
});

test('clicking lets the current walk finish naturally before the image handoff',async()=>{
  const s=setup();s.frame(1.2);
  const finished=s.player.finishWalk();
  assert.equal(s.intro.dataset.videoState,'finishing');
  s.frame(2.03);
  assert.equal(await finished,true);
  assert.equal(s.video.currentTime,2.02);
  assert.equal(s.intro.dataset.videoState,'stopped');
  s.player.stop();
  assert.equal(s.visible,false);
  assert.equal(s.intro.classList.contains('video-handoff'),true);
  assert.equal(s.intro.dataset.videoState,'handoff');
  assert.equal(s.frames.size,0);assert.equal(s.timers.size,0);
  assert.equal(s.listeners.size,0);assert.equal(s.documentEvents.size,0);
});

test('a rejected autoplay keeps the image intro available',async()=>{
  const s=setup({rejected:true});
  const finished=s.player.finishWalk();
  for(let i=0;i<6;i++) await Promise.resolve();
  assert.equal(await finished,false);
  assert.equal(s.visible,false);
  assert.equal(s.intro.dataset.videoState,'unavailable');
  s.player.stop();assert.equal(s.frames.size,0);
});

test('visibility changes pause and resume the repeating walk',async()=>{
  const s=setup();s.frame(.5);
  s.document.hidden=true;s.documentEvents.get('visibilitychange')();
  assert.equal(s.paused,1);
  s.document.hidden=false;s.documentEvents.get('visibilitychange')();
  await Promise.resolve();
  assert.equal(s.plays,2);
  s.player.stop();
});

test('stopping while a click is waiting releases the intro and cleans up',async()=>{
  const s=setup();s.frame(.5);
  const finished=s.player.finishWalk();
  s.player.stop();
  assert.equal(await finished,false);
  assert.equal(s.frames.size,0);assert.equal(s.timers.size,0);
});
