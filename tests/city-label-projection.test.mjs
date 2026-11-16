import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Vector3 } from 'three';
import { layoutCityLabels, projectCityLabel } from '../components/city-label-projection.ts';

function cameraAtOrigin() {
  const camera = new PerspectiveCamera(46, 2, 0.1, 100);
  camera.updateMatrixWorld();
  return camera;
}

test('projects a landmark ahead of the camera into the viewport center', () => {
  const point = projectCityLabel(new Vector3(0, 0, -10), cameraAtOrigin(), 800, 400);
  assert.equal(point.visible, true);
  assert.equal(point.x, 400);
  assert.equal(point.y, 200);
  assert.ok(point.scale > 0);
});

test('hides labels behind the camera, beyond clipping planes, or outside the viewport', () => {
  const camera = cameraAtOrigin();
  for (const position of [
    new Vector3(0, 0, 10),
    new Vector3(0, 0, -200),
    new Vector3(0, 0, -0.01),
    new Vector3(100, 0, -10),
    new Vector3(0, 100, -10),
    new Vector3(0, 0, 0),
  ]) {
    assert.equal(projectCityLabel(position, camera, 800, 400).visible, false);
  }
});

test('tracks camera transitions and viewport resizing', () => {
  const camera = cameraAtOrigin();
  camera.position.set(20, 12, 30);
  const landmark = new Vector3(7, 8.6, 1);
  camera.lookAt(landmark);
  camera.updateMatrixWorld();
  const point = projectCityLabel(landmark, camera, 1200, 600);
  assert.equal(point.visible, true);
  assert.ok(Math.abs(point.x - 600) < 0.001);
  assert.ok(Math.abs(point.y - 300) < 0.001);
  const resized = projectCityLabel(landmark, camera, 600, 300);
  assert.ok(Math.abs(resized.x - 300) < 0.001);
  assert.ok(Math.abs(resized.y - 150) < 0.001);
});

test('keeps distant labels smaller and behind closer labels', () => {
  const camera = cameraAtOrigin();
  const near = projectCityLabel(new Vector3(0, 0, -5), camera, 800, 400);
  const far = projectCityLabel(new Vector3(0, 0, -80), camera, 800, 400);
  assert.ok(near.scale > far.scale);
  assert.ok(near.zIndex > far.zIndex);
  assert.ok(near.zIndex <= 10 && far.zIndex >= 0);
  assert.ok(far.scale>=.95);
  assert.ok(near.scale<=1.15);
});

test('crowded mobile labels do not overlap and the active label gets priority', () => {
  const labels=Array.from({length:7},()=>({x:160,y:190,width:130,height:42,scale:1,visible:true}));
  const result=layoutCityLabels(labels,320,380,6);
  assert.ok(result[6].visible);
  const visible=result.filter(label=>label.visible);
  assert.ok(visible.length>=3);
  for(const label of visible) {
    assert.ok(label.x-label.width/2>=0 && label.x+label.width/2<=320);
    assert.ok(label.y-label.height/2>=0 && label.y+label.height/2<=380);
  }
  for(let i=0;i<visible.length;i++) for(let j=i+1;j<visible.length;j++) {
    const a=visible[i],b=visible[j];
    assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2 || Math.abs(a.y-b.y)>=(a.height+b.height)/2);
  }
});
