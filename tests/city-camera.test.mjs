import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Vector3 } from 'three';
import { attachCityWheelZoom, CAMERA_LIMITS, CityCameraController, cityFocus, SKY_SIGNAL_POSITION, SKY_SIGNAL_RADIUS } from '../components/city-camera.ts';
import { landmarks } from '../data/profile.ts';

const overviewFocus = cityFocus(null);

function setup(landmark = null) {
  const controller = new CityCameraController();
  const camera = new PerspectiveCamera(46, 2, 0.1, 100);
  camera.position.set(34, 26, 43);
  controller.setView(true, landmark);
  controller.update(camera, 1 / 60, 0, true);
  return { controller, camera };
}

test('wheel up moves closer with damping; wheel down moves farther', () => {
  const { controller, camera } = setup();
  const initial = camera.position.distanceTo(overviewFocus);
  controller.zoom(-100);
  controller.update(camera, 1 / 60, 0, false);
  const firstFrame = camera.position.distanceTo(overviewFocus);
  assert.ok(firstFrame < initial);
  controller.update(camera, 1 / 60, 0, true);
  const settled = camera.position.distanceTo(overviewFocus);
  assert.ok(settled < firstFrame);
  controller.zoom(100);
  controller.update(camera, 1 / 60, 0, true);
  assert.ok(camera.position.distanceTo(overviewFocus) > settled);
});

test('zoom is clamped for overview and every landmark and stays above buildings', () => {
  for (const landmark of [null, ...landmarks]) {
    const { controller, camera } = setup(landmark);
    const focus = cityFocus(landmark);
    const limits = controller.getDistanceLimits();
    for (let i = 0; i < 100; i++) controller.zoom(-1000);
    controller.update(camera, 1 / 60, 0, true);
    assert.ok(camera.position.distanceTo(focus) >= limits.min - 1e-8);
    assert.ok(camera.position.y >= CAMERA_LIMITS.minHeight);
    for (let i = 0; i < 100; i++) controller.zoom(1000);
    controller.update(camera, 1 / 60, 0, true);
    assert.ok(camera.position.distanceTo(focus) <= limits.max + 1e-8);
  }
});

test('click focus and Back reset zoom and return to the original city overview', () => {
  const { controller, camera } = setup();
  const overview = camera.position.clone();
  controller.zoom(-1000);
  controller.update(camera, 1 / 60, 0, true);
  for (const landmark of landmarks) {
    controller.setView(true, landmark);
    for (let frame = 0; frame < 180; frame++) controller.update(camera, 1 / 60, 0, false);
    const focus = cityFocus(landmark);
    assert.ok(camera.position.distanceTo(focus) <= controller.getDistanceLimits().max + 1e-8);
    const direction = camera.getWorldDirection(new Vector3());
    assert.ok(direction.dot(focus.sub(camera.position).normalize()) > 0.999);
    controller.zoom(1000);
    controller.update(camera, 1 / 60, 0, true);
  }
  controller.setView(true, null);
  for (let frame = 0; frame < 240; frame++) controller.update(camera, 1 / 60, 0, false);
  assert.ok(camera.position.distanceTo(overview) < 0.001);
});

test('damping is consistent across frame rates', () => {
  function simulate(fps) {
    const { controller, camera } = setup();
    controller.zoom(-200);
    for (let frame = 0; frame < fps; frame++) controller.update(camera, 1 / fps, 0, false);
    return camera.position;
  }
  assert.ok(simulate(30).distanceTo(simulate(144)) < 1e-8);
});

test('the sky signal fits the initial overview while manual close zoom stays independent', () => {
  for(const aspect of [2.1,1.25,.85,.65]) for(const entered of [false,true]) {
    const controller=new CityCameraController();
    const camera=new PerspectiveCamera(43,aspect,.2,180);
    controller.setView(entered,null,aspect);
    controller.update(camera,1/60,0,true);
    camera.updateMatrixWorld();
    const center=new Vector3(...SKY_SIGNAL_POSITION).project(camera);
    const depth=-new Vector3(...SKY_SIGNAL_POSITION).applyMatrix4(camera.matrixWorldInverse).z;
    const radius=SKY_SIGNAL_RADIUS/(depth*Math.tan(camera.fov*Math.PI/360));
    assert.ok(Math.abs(center.x)+radius/aspect<1);
    assert.ok(Math.abs(center.y)+radius<1);
    const initial=camera.position.distanceTo(cityFocus(null));
    for(let i=0;i<40;i++) controller.zoom(-1000);
    controller.update(camera,1/60,0,true);
    assert.ok(camera.position.distanceTo(cityFocus(null))<initial*.7);
    assert.ok(controller.getDistanceLimits().min<=CAMERA_LIMITS.overview.min*1.55);
  }
});

test('normalizes pixel, line, and page wheel units', () => {
  const pixel = setup(), line = setup(), page = setup();
  pixel.controller.zoom(-160, 0);
  line.controller.zoom(-10, 1);
  page.controller.zoom(-0.2, 2, 800);
  for (const rig of [pixel, line, page]) rig.controller.update(rig.camera, 0, 0, true);
  assert.ok(pixel.camera.position.distanceTo(line.camera.position) < 1e-8);
  assert.ok(pixel.camera.position.distanceTo(page.camera.position) < 1e-8);
});

test('tower zoom aims at each building and never intersects the sky signal or rooftops', () => {
  for(const aspect of [1.8,.85]) {
    const camera=new PerspectiveCamera(43,aspect,.2,180);
    camera.position.set(32,24,38);
    const controller=new CityCameraController();
    for(const landmark of [...landmarks,null]) {
      controller.setView(true,landmark,aspect);
      if(landmark) {
        assert.deepEqual(cityFocus(landmark).toArray(),[landmark.x,landmark.h/2,landmark.z]);
        assert.ok(controller.getDistanceLimits().min<=CAMERA_LIMITS.landmark.min*1.55);
      }
      for(let frame=0;frame<240;frame++) {
        if(frame===120) for(let i=0;i<40;i++) controller.zoom(-1000);
        controller.update(camera,1/60,0,false);
        assert.ok(camera.position.y>=CAMERA_LIMITS.minHeight);
        assert.ok(camera.position.distanceTo(new Vector3(...SKY_SIGNAL_POSITION))>SKY_SIGNAL_RADIUS+2);
      }
      if(landmark) assert.ok(camera.position.distanceTo(cityFocus(landmark))<24);
    }
  }
});

test('scene wheel cancels page scroll, preserves UI scrolling/browser zoom, and cleans up', () => {
  const root = new EventTarget();
  let overUi = false;
  // A chat-history child must bypass capture-phase camera zoom, even before
  // React's bubbling stopPropagation handler runs.
  root.closest = selector => overUi && selector.includes('.shadow-chat') ? root : null;
  const surface = {
    closest: () => root,
    getBoundingClientRect: () => ({ left: 100, right: 900, top: 0, bottom: 600, height: 600 }),
  };
  const calls = [];
  const attach = () => attachCityWheelZoom(surface, (...args) => calls.push(args));
  function wheel(overrides = {}) {
    const event = new Event('wheel', { cancelable: true });
    Object.assign(event, { clientX: 500, clientY: 300, deltaY: -100, deltaMode: 0, ctrlKey: false, metaKey: false }, overrides);
    root.dispatchEvent(event);
    return event;
  }
  const detach = attach();
  assert.equal(wheel().defaultPrevented, true);
  assert.deepEqual(calls, [[-100, 0, 600]]);
  overUi = true;
  assert.equal(wheel().defaultPrevented, false);
  overUi = false;
  assert.equal(wheel({ clientX: 50 }).defaultPrevented, false);
  assert.equal(wheel({ ctrlKey: true }).defaultPrevented, false);
  assert.equal(wheel({ metaKey: true }).defaultPrevented, false);
  assert.equal(wheel({ deltaY: 0 }).defaultPrevented, false);
  assert.equal(calls.length, 1);
  detach();
  assert.equal(wheel().defaultPrevented, false);
  // Strict Mode setup/cleanup/setup must not accumulate duplicate listeners.
  const detachAgain = attach();
  wheel();
  assert.equal(calls.length, 2);
  detachAgain();
});
