import assert from 'node:assert/strict';
import test from 'node:test';
import { TowerHoverState } from '../components/tower-hover.ts';

test('moving between tower hit targets publishes one intended highlight per frame',()=>{
  const changes=[];
  const hover=new TowerHoverState(id=>changes.push(id));
  hover.enter('mesh','about'); hover.flush();
  hover.enter('mesh','projects');
  hover.leave('mesh','about'); // delayed out from an old raycast hit
  assert.equal(hover.flush(),'projects');
  for(let i=0;i<30;i++) { hover.enter('mesh','projects'); hover.flush(); }
  assert.deepEqual(changes,['about','projects']);
  hover.leave('mesh','projects');
  assert.equal(hover.flush(),null);
});

test('tower-to-label handoff never flashes the normal appearance',()=>{
  const changes=[];
  const hover=new TowerHoverState(id=>changes.push(id));
  hover.enter('mesh','skills'); hover.flush();
  hover.leave('mesh','skills'); hover.enter('label','skills'); hover.flush();
  hover.enter('mesh','skills'); hover.leave('label','skills'); hover.flush();
  assert.deepEqual(changes,['skills']);
  hover.clear('mesh'); hover.flush();
  assert.deepEqual(changes,['skills',null]);
});

test('DOM and keyboard sources do not get cleared by stale leaves from another tower',()=>{
  const hover=new TowerHoverState(()=>{});
  hover.enter('mesh','about');
  hover.enter('label','research');
  hover.enter('focus','contact');
  hover.leave('label','skills');
  assert.equal(hover.flush(),'contact');
  hover.leave('focus','contact');
  assert.equal(hover.flush(),'research');
  hover.leave('label','research');
  assert.equal(hover.flush(),'about');
  hover.reset();
  assert.equal(hover.flush(),null);
});
