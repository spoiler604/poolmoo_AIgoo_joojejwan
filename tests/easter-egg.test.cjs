const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','easter-egg.js'),'utf8');
function setup() {
  const events=new Map(),timers=new Map();
  let now=0,id=0,visits=0,resolveFlight;
  const flight={finished:new Promise(resolve=>{resolveFlight=resolve;}),cancel(){},pause(){},play(){}};
  const cat={hidden:true,style:{},animate(frames,options){visits++;return flight;}};
  const document={hidden:false,documentElement:{dataset:{ambientMotion:'full'}},querySelector:s=>s==='.cat-easter-egg'?cat:{clientWidth:1280,clientHeight:720},addEventListener:(name,fn)=>events.set(name,fn)};
  vm.runInNewContext(source,{document,performance:{now:()=>now},Math,setTimeout:(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;},clearTimeout:key=>timers.delete(key)});
  return {cat,document,events,timers,resolveFlight,get visits(){return visits;},tick(ms){now+=ms;for(const [id,t] of [...timers]) if(t.at<=now){timers.delete(id);t.fn();}}};
}
test('cat stays hidden until two minutes after the map is revealed',()=>{
  const s=setup();assert.equal(s.timers.size,0);assert.equal(s.cat.hidden,true);
  s.events.get('mindmap:reveal')();s.tick(119999);assert.equal(s.visits,0);
  s.tick(1);assert.equal(s.visits,1);assert.equal(s.cat.hidden,false);
  s.tick(119999);assert.equal(s.visits,1);s.tick(1);assert.equal(s.visits,2);
});
test('switching tabs pauses the two-minute countdown',()=>{
  const s=setup();s.events.get('mindmap:reveal')();s.tick(60000);
  s.document.hidden=true;s.events.get('visibilitychange')();s.tick(900000);assert.equal(s.visits,0);
  s.document.hidden=false;s.events.get('visibilitychange')();s.tick(59999);assert.equal(s.visits,0);
  s.tick(1);assert.equal(s.visits,1);
});
test('finishing the crossing hides the cat again',async()=>{
  const s=setup();s.events.get('mindmap:reveal')();s.tick(120000);assert.equal(s.cat.hidden,false);
  s.resolveFlight();await Promise.resolve();assert.equal(s.cat.hidden,true);
});
