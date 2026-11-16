import { Vector3, type PerspectiveCamera } from 'three';
import type { CityCameraController } from './city-camera';

/** Distinguish a tap/click from a drag without depending on raycast geometry. */
export class CityDragIntent {
  pointerId:number|null=null;
  dragging=false;
  moved=false;
  enabled=false;
  startX=0;
  startY=0;
  private threshold=5;
  private blockClick=false;

  begin(id:number,x:number,y:number,touch:boolean,enabled:boolean) {
    this.pointerId=id; this.startX=x; this.startY=y;
    this.dragging=false; this.moved=false; this.enabled=enabled;
    this.threshold=touch?8:5; this.blockClick=false;
  }
  move(id:number,x:number,y:number) {
    if(id!==this.pointerId) return false;
    if(Math.hypot(x-this.startX,y-this.startY)>=this.threshold) this.moved=true;
    this.dragging=this.moved && this.enabled;
    return this.dragging;
  }
  finish(id:number) {
    if(id!==this.pointerId) return false;
    this.blockClick=this.moved;
    const dragged=this.dragging;
    this.pointerId=null; this.dragging=false;
    return dragged;
  }
  consumeClick() {
    const blocked=this.blockClick;
    this.blockClick=false;
    return blocked;
  }
}

/** Freeze the screen-to-ground mapping at pointer-down, so camera damping
 * cannot feed back into subsequent movement and cause jumps. */
export function panOffsetFromDrag(camera:PerspectiveCamera,focus:Vector3,height:number,dx:number,dy:number) {
  const forward=camera.getWorldDirection(new Vector3());
  const pitch=Math.max(.25,Math.abs(forward.y));
  const right=forward.clone().cross(new Vector3(0,1,0)).normalize();
  forward.y=0; forward.normalize();
  const units=2*camera.position.distanceTo(focus)*Math.tan(camera.fov*Math.PI/360)/Math.max(1,height);
  return right.multiplyScalar(-dx*units).addScaledVector(forward,dy*units/pitch);
}

const UI_TARGETS='header,nav,footer,.toolbar,.info-panel,.flat-index,.modal-backdrop,.shadow-chat,a,input,textarea,select,button:not(.city-label)';

export function attachCityPan(surface:HTMLElement,camera:PerspectiveCamera,controller:CityCameraController,onDragging:(active:boolean)=>void) {
  const root=surface.closest('main')??surface;
  const win=surface.ownerDocument.defaultView;
  if(!win) throw new Error('City panning requires a mounted browser window.');
  const intent=new CityDragIntent();
  let snapshot:PerspectiveCamera|null=null;
  let focus=new Vector3(),offset=new Vector3(),height=1;

  const finish=()=>{
    const id=intent.pointerId;
    if(id===null) return;
    const dragged=intent.finish(id);
    if(surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
    controller.setPanning(false);
    if(dragged) onDragging(false);
    snapshot=null;
  };
  const down=(event:PointerEvent)=>{
    if(intent.pointerId!==null) { if(event.pointerId!==intent.pointerId) finish(); return; }
    if(event.button!==0 || event.isPrimary===false || event.ctrlKey || event.metaKey || event.altKey) return;
    const bounds=surface.getBoundingClientRect();
    if(event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom) return;
    if((event.target as Element|null)?.closest(UI_TARGETS)) return;
    intent.begin(event.pointerId,event.clientX,event.clientY,event.pointerType==='touch',controller.canPan(camera));
    snapshot=camera.clone(); snapshot.updateMatrixWorld();
    focus=controller.getFocus(); offset=controller.getPanOffset(); height=bounds.height;
  };
  const move=(event:PointerEvent)=>{
    if(intent.pointerId!==event.pointerId) return;
    if(event.pointerType==='mouse' && (event.buttons&1)===0) { finish(); return; }
    const wasDragging=intent.dragging;
    if(!intent.move(event.pointerId,event.clientX,event.clientY) || !snapshot) return;
    if(!controller.canPan(camera)) { finish(); return; }
    if(!wasDragging) {
      surface.setPointerCapture(event.pointerId);
      controller.setPanning(true);
      onDragging(true);
    }
    event.preventDefault(); event.stopPropagation();
    controller.panToOffset(offset.clone().add(panOffsetFromDrag(snapshot,focus,height,event.clientX-intent.startX,event.clientY-intent.startY)));
  };
  const up=(event:PointerEvent)=>{
    if(intent.pointerId!==event.pointerId) return;
    // Include the final movement even when the browser coalesced move events.
    intent.move(event.pointerId,event.clientX,event.clientY);
    finish();
  };
  const cancel=(event:PointerEvent)=>{if(intent.pointerId===event.pointerId) finish();};
  const lostCapture=(event:PointerEvent)=>{
    // Touch initially captures to the canvas. Its lost-capture event bubbles
    // through this surface when we take ownership; that is not a cancellation.
    if(event.target===surface && intent.pointerId===event.pointerId && !surface.hasPointerCapture(event.pointerId)) finish();
  };
  const click=(event:MouseEvent)=>{
    if(event.detail===0 || !surface.contains(event.target as Node)) return;
    if((event.target as Element|null)?.closest(UI_TARGETS)) return;
    if(intent.consumeClick()) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  root.addEventListener('pointerdown',down as EventListener,true);
  root.addEventListener('click',click as EventListener,true);
  win.addEventListener('pointermove',move,{capture:true,passive:false});
  win.addEventListener('pointerup',up,true);
  win.addEventListener('pointercancel',cancel,true);
  win.addEventListener('blur',finish);
  surface.addEventListener('lostpointercapture',lostCapture as EventListener);
  return ()=>{
    finish();
    root.removeEventListener('pointerdown',down as EventListener,{capture:true});
    root.removeEventListener('click',click as EventListener,{capture:true});
    win.removeEventListener('pointermove',move,{capture:true});
    win.removeEventListener('pointerup',up,{capture:true});
    win.removeEventListener('pointercancel',cancel,{capture:true});
    win.removeEventListener('blur',finish);
    surface.removeEventListener('lostpointercapture',lostCapture as EventListener);
  };
}
