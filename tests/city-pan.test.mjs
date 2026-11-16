import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Vector3 } from 'three';
import { CityCameraController, CITY_PAN_BOUNDS, CAMERA_LIMITS } from '../components/city-camera.ts';
import { CityDragIntent, attachCityPan, panOffsetFromDrag } from '../components/city-pan.ts';

function setup(close=true) {
  const controller=new CityCameraController();
  const camera=new PerspectiveCamera(43,1.8,.2,180);
  camera.position.set(32,24,38);
  controller.setView(true,null);
  if(close) for(let i=0;i<40;i++) controller.zoom(-1000);
  controller.update(camera,1/60,0,true);
  return {controller,camera};
}

test('panning is enabled by actual close camera distance, not an in-flight zoom request',()=>{
  const {controller,camera}=setup(false);
  assert.equal(controller.canPan(camera),false);
  for(let i=0;i<40;i++) controller.zoom(-1000);
  assert.equal(controller.canPan(camera),false);
  controller.update(camera,1/60,0,true);
  assert.equal(controller.canPan(camera),true);
});

test('ground-plane drag mapping preserves altitude, direction, zoom limits and city bounds',()=>{
  const {controller,camera}=setup();
  const limits=controller.getDistanceLimits();
  const before=camera.position.clone(),aim=controller.getFocus();
  const right=camera.getWorldDirection(new Vector3()).cross(new Vector3(0,1,0)).normalize();
  const delta=panOffsetFromDrag(camera,aim,800,100,80);
  assert.equal(delta.y,0);
  assert.ok(delta.dot(right)<0); // Drag right: camera moves left over the map.
  controller.panToOffset(delta);
  controller.setPanning(true);
  for(let i=0;i<120;i++) controller.update(camera,1/60,0,false);
  assert.ok(camera.position.distanceTo(before)>1);
  assert.ok(Math.abs(camera.position.y-before.y)<1e-8);
  assert.deepEqual(controller.getDistanceLimits(),limits);
  controller.panToOffset(new Vector3(10000,-10000,-10000));
  controller.update(camera,1/60,0,true);
  const focus=controller.getFocus();
  assert.equal(focus.x,CITY_PAN_BOUNDS.maxX);
  assert.equal(focus.z,CITY_PAN_BOUNDS.minZ);
  assert.equal(focus.y,aim.y);
  assert.ok(camera.position.y>=CAMERA_LIMITS.minHeight);
});

test('click focus and Back reset pan while screen resizing preserves the current pan',()=>{
  const {controller,camera}=setup(false);
  const overview=camera.position.clone();
  controller.panToOffset(new Vector3(4,0,6));
  controller.setView(true,null,.85);
  assert.deepEqual(controller.getPanOffset().toArray(),[4,0,6]);
  const landmark={id:'about',x:0,z:0,h:8};
  controller.setView(true,landmark);
  assert.deepEqual(controller.getPanOffset().toArray(),[0,0,0]);
  controller.panToOffset(new Vector3(-7,0,5));
  controller.setView(true,null);
  assert.deepEqual(controller.getPanOffset().toArray(),[0,0,0]);
  controller.update(camera,1/60,0,true);
  assert.ok(camera.position.distanceTo(overview)<1e-8);
});

test('mouse and touch thresholds distinguish clicks from drags, including cancel/reset',()=>{
  const intent=new CityDragIntent();
  intent.begin(1,0,0,false,true);
  assert.equal(intent.move(1,2,2),false);
  intent.finish(1);
  assert.equal(intent.consumeClick(),false);
  intent.begin(1,0,0,false,true);
  assert.equal(intent.move(1,6,0),true);
  intent.finish(1);
  assert.equal(intent.consumeClick(),true);
  assert.equal(intent.consumeClick(),false);
  intent.begin(2,0,0,true,true);
  assert.equal(intent.move(2,6,0),false);
  assert.equal(intent.move(2,9,0),true);
  intent.finish(2);
  intent.begin(3,0,0,false,false);
  assert.equal(intent.move(3,30,0),false);
  intent.finish(3);
  assert.equal(intent.consumeClick(),true); // A far-away drag must not open a tower either.
});

function inputHarness(close=true) {
  const {camera,controller}=setup(close);
  const surface=new EventTarget(),win=new EventTarget(),captures=new Set(),changes=[];
  let ui=false;
  surface.closest=selector=>selector==='main'?null:ui?surface:null;
  surface.getBoundingClientRect=()=>({left:0,top:0,right:800,bottom:600,height:600});
  surface.ownerDocument={defaultView:win};
  surface.contains=target=>target===surface;
  surface.setPointerCapture=id=>captures.add(id);
  surface.hasPointerCapture=id=>captures.has(id);
  surface.releasePointerCapture=id=>captures.delete(id);
  const detach=attachCityPan(surface,camera,controller,active=>changes.push(active));
  function send(type,props={}) {
    const event=new Event(type,{cancelable:true});
    Object.assign(event,{pointerId:1,pointerType:'mouse',button:0,buttons:1,isPrimary:true,clientX:400,clientY:300,detail:1,ctrlKey:false,metaKey:false,altKey:false},props);
    (['pointermove','pointerup','pointercancel','blur'].includes(type)?win:surface).dispatchEvent(event);
    return event;
  }
  return {controller,camera,changes,captures,send,detach,setUi:value=>{ui=value}};
}

test('native pointer drag captures input and suppresses its click; normal/keyboard clicks survive',()=>{
  const input=inputHarness();
  input.send('pointerdown');
  assert.equal(input.send('pointermove',{clientX:403}).defaultPrevented,false);
  assert.equal(input.send('pointermove',{clientX:450,clientY:340}).defaultPrevented,true);
  assert.ok(input.captures.has(1));
  assert.ok(input.controller.getPanOffset().length()>0);
  input.send('pointerup',{clientX:450,clientY:340,buttons:0});
  assert.deepEqual(input.changes,[true,false]);
  assert.equal(input.captures.size,0);
  const offset=input.controller.getPanOffset();
  input.send('pointermove',{clientX:550});
  assert.ok(input.controller.getPanOffset().equals(offset));
  assert.equal(input.send('click').defaultPrevented,true);
  input.send('pointerdown');input.send('pointerup',{buttons:0});
  assert.equal(input.send('click').defaultPrevented,false);
  assert.equal(input.send('click',{detail:0}).defaultPrevented,false);
  input.detach();
});

test('touch drag, pointer cancel, window blur, cleanup, UI exclusion and far view behave safely',()=>{
  const input=inputHarness();
  input.setUi(true);input.send('pointerdown');input.send('pointermove',{clientX:500});
  assert.equal(input.controller.getPanOffset().length(),0);
  input.setUi(false);
  input.send('pointerdown',{pointerType:'touch'});
  assert.equal(input.send('pointermove',{pointerType:'touch',clientX:450}).defaultPrevented,true);
  input.send('pointercancel',{pointerType:'touch'});
  assert.equal(input.captures.size,0);
  input.send('pointerdown');input.send('pointermove',{clientX:460});input.send('blur');
  assert.equal(input.captures.size,0);
  input.send('pointerdown');input.send('pointermove',{clientX:470});input.detach();
  assert.equal(input.captures.size,0);
  const offset=input.controller.getPanOffset();
  input.send('pointerdown');input.send('pointermove',{clientX:500});
  assert.ok(input.controller.getPanOffset().equals(offset));
  const far=inputHarness(false);
  far.send('pointerdown');assert.equal(far.send('pointermove',{clientX:500}).defaultPrevented,false);
  assert.equal(far.controller.getPanOffset().length(),0);
  far.send('pointerup',{clientX:500,buttons:0});
  assert.equal(far.send('click').defaultPrevented,true);
  far.detach();
});

test('touch capture handoff does not cancel a drag, but losing surface ownership does',()=>{
  const input=inputHarness();
  input.send('pointerdown',{pointerType:'touch'});
  input.send('pointermove',{pointerType:'touch',clientX:450});
  input.send('lostpointercapture',{pointerType:'touch'});
  assert.deepEqual(input.changes,[true]);
  assert.ok(input.captures.has(1));
  input.send('pointermove',{pointerType:'touch',clientX:500});
  input.captures.clear();
  input.send('lostpointercapture',{pointerType:'touch'});
  assert.deepEqual(input.changes,[true,false]);
  const offset=input.controller.getPanOffset();
  input.send('pointermove',{pointerType:'touch',clientX:550});
  assert.ok(input.controller.getPanOffset().equals(offset));
  input.detach();
});
