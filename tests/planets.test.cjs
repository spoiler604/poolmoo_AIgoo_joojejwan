const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','planets.js'),'utf8');

test('each four arrivals use all four edges and begin outside the screen',()=>{
  const events=new Map(),timers=[],arrivals=[];
  const view={left:30,top:20,width:1280,height:720};
  const map={left:-200,top:-160,width:1920};
  const planets=Array.from({length:8},()=>({dataset:{},classList:{add(){},remove(){}},animate(frames){
    arrivals.push({edge:this.dataset.entryEdge,frames});
    return {finished:new Promise(()=>{}),cancel(){}};
  }}));
  const document={hidden:false,documentElement:{dataset:{ambientMotion:'full'}},
    querySelector:s=>s==='.viewport'?{getBoundingClientRect:()=>view}:{getBoundingClientRect:()=>map,offsetWidth:2400},
    querySelectorAll:()=>planets,addEventListener:(name,fn)=>events.set(name,fn)};
  vm.runInNewContext(source,{document,window:{addEventListener(){}},performance:{now:()=>0},Math,
    MutationObserver:class{observe(){}},setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;},clearTimeout(){}});
  assert.equal(timers.length,0);
  events.get('mindmap:reveal')();
  timers.sort((a,b)=>a.delay-b.delay).forEach(timer=>timer.fn());
  assert.equal(arrivals.length,8);
  for(let i=0;i<8;i+=4) assert.deepEqual(arrivals.slice(i,i+4).map(a=>a.edge).sort(),['bottom','left','right','top']);
  for(const arrival of arrivals) {
    const [,x,y]=arrival.frames[0].transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/).map(Number);
    const screenX=(x+23)*.8+map.left-view.left;
    const screenY=(y+23)*.8+map.top-view.top;
    if(arrival.edge==='top'||arrival.edge==='bottom') {
      assert.ok(screenX>0&&screenX<view.width);
      assert.ok(arrival.edge==='top'?screenY<0:screenY>view.height);
    } else {
      assert.ok(screenY>0&&screenY<view.height);
      assert.ok(arrival.edge==='left'?screenX<0:screenX>view.width);
    }
    assert.equal(arrival.frames[0].opacity,0);
    assert.equal(arrival.frames.at(-1).opacity,0);
  }
});
