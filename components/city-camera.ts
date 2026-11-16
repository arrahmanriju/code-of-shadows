import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

type Landmark = { id: string; x: number; z: number; h: number };
export const SKY_SIGNAL_POSITION: [number,number,number] = [0,26,-22];
export const SKY_SIGNAL_RADIUS = 3.67;

export function cityFocus(landmark: Landmark | null) {
  return landmark ? new Vector3(landmark.x,landmark.h/2,landmark.z) : new Vector3(0,3.5,0);
}

function fitSceneDistance(focus: Vector3, direction: Vector3, aspect: number, fov: number, landmark: Landmark | null) {
  const right = new Vector3(0,1,0).cross(direction).normalize();
  const up = direction.clone().cross(right).normalize();
  const vertical = Math.tan(fov*Math.PI/360)*.86;
  const horizontal = vertical*aspect;
  const points = landmark ? [
    {position:new Vector3(landmark.x,0,landmark.z),radius:1.8},
    {position:new Vector3(landmark.x,landmark.h+2.6,landmark.z),radius:1.8},
  ] : [-14,14].flatMap(x=>[-10,10].flatMap(z=>[0,12].map(y=>({position:new Vector3(x,y,z),radius:1}))));
  // Include the sky only in the initial overview composition. Manual zoom and
  // focused tower views must never use the decorative signal as a constraint.
  if (!landmark) points.push({position:new Vector3(...SKY_SIGNAL_POSITION),radius:SKY_SIGNAL_RADIUS});
  return Math.max(...points.map(({position,radius})=>{
    const relative=position.sub(focus);
    return relative.dot(direction)+Math.max(
      (Math.abs(relative.dot(right))+radius)/horizontal,
      (Math.abs(relative.dot(up))+radius)/vertical,
    );
  }));
}

export const CAMERA_LIMITS = {
  overview: { min: 22, max: 85 },
  landmark: { min: 12, max: 50 },
  // All procedural buildings and spires are below this altitude.
  minHeight: 16,
};

export const CITY_PAN_BOUNDS = { minX:-24, maxX:24, minZ:-20, maxZ:20 };

/** One owner for both cinematic transitions and user-controlled dolly zoom. */
export class CityCameraController {
  private viewKey = '';
  private focus = new Vector3(0, 3.5, 0);
  private desiredFocus = new Vector3(0, 3.5, 0);
  private direction = new Vector3();
  private destination = new Vector3();
  private limits = CAMERA_LIMITS.overview;
  private distance = 0;
  private focused = false;
  private framing = 1;
  private baseDistance = 1;
  private fov = 43;
  private baseFocus = new Vector3(0,3.5,0);
  private panOffset = new Vector3();
  private panning = false;

  setView(entered: boolean, landmark: Landmark | null, aspect = 1.8) {
    const key = landmark ? landmark.id : entered ? 'city' : 'landing';
    const framing = Math.max(1, Math.min(1.55, 1.05 / Math.max(.4,aspect)));
    const fov = aspect < 1.1 ? 50 : 43;
    if (key === this.viewKey && Math.abs(framing-this.framing)<.005 && fov===this.fov) return;
    const zoomRatio = key===this.viewKey ? this.distance/this.baseDistance : 1;
    if(key!==this.viewKey) {
      this.panOffset.set(0,0,0);
      this.panning=false;
    }
    this.viewKey = key;
    this.framing = framing;
    this.fov = fov;
    this.focused = !!landmark;
    const bounds = landmark ? CAMERA_LIMITS.landmark : CAMERA_LIMITS.overview;
    this.limits = {min:bounds.min*framing,max:bounds.max*framing};
    this.baseFocus.copy(cityFocus(landmark));
    this.desiredFocus.copy(this.baseFocus).add(this.panOffset);
    if (landmark) {
      this.destination.set(landmark.x + 12, landmark.h + 12, landmark.z + 18);
    } else {
      if (entered) this.destination.set(28, 22, 34);
      else this.destination.set(32, 24, 38);
    }
    this.direction.copy(this.destination).sub(this.baseFocus);
    const poseDistance=this.direction.length()*framing;
    this.direction.normalize();
    const overviewDistance = !landmark ? fitSceneDistance(this.baseFocus,this.direction,aspect,fov,null)*1.05 : poseDistance;
    this.baseDistance=MathUtils.clamp(Math.max(poseDistance,overviewDistance),this.limits.min,this.limits.max);
    this.distance=MathUtils.clamp(this.baseDistance*zoomRatio,this.limits.min,this.limits.max);
  }

  getDistanceLimits() { return {...this.limits}; }
  getFocus() { return this.focus.clone(); }
  getPanOffset() { return this.panOffset.clone(); }

  canPan(camera:PerspectiveCamera) {
    const threshold=this.limits.min+(this.limits.max-this.limits.min)*.35;
    return this.distance<=threshold && camera.position.distanceTo(this.focus)<=threshold;
  }

  setPanning(active:boolean) { this.panning=active; }

  panToOffset(offset:Vector3) {
    if(!Number.isFinite(offset.x) || !Number.isFinite(offset.z)) return;
    this.desiredFocus.set(
      MathUtils.clamp(this.baseFocus.x+offset.x,CITY_PAN_BOUNDS.minX,CITY_PAN_BOUNDS.maxX),
      this.baseFocus.y,
      MathUtils.clamp(this.baseFocus.z+offset.z,CITY_PAN_BOUNDS.minZ,CITY_PAN_BOUNDS.maxZ),
    );
    this.panOffset.copy(this.desiredFocus).sub(this.baseFocus);
  }

  zoom(deltaY: number, deltaMode = 0, pageHeight = 800) {
    if (!Number.isFinite(deltaY)) return;
    // WheelEvent can report pixels, lines, or pages depending on the device.
    const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? pageHeight : 1);
    const step = MathUtils.clamp(pixels, -200, 200);
    this.distance = MathUtils.clamp(this.distance * Math.exp(step * 0.0015), this.limits.min, this.limits.max);
  }

  update(camera: PerspectiveCamera, delta: number, elapsed: number, reduced: boolean) {
    this.destination.copy(this.direction).multiplyScalar(this.distance).add(this.desiredFocus);
    if (!reduced && !this.focused && !this.canPan(camera) && this.panOffset.lengthSq()===0) this.destination.x += Math.sin(elapsed * 0.13) * 0.25;
    this.destination.y = Math.max(CAMERA_LIMITS.minHeight, this.destination.y);
    // Time-based damping behaves consistently at both 30 and 144 FPS.
    const alpha = reduced ? 1 : 1 - Math.exp(-(this.panning?10:3.5) * delta);
    if (Math.abs(camera.fov-this.fov) > .001) {
      camera.fov = MathUtils.lerp(camera.fov,this.fov,alpha);
      camera.updateProjectionMatrix();
    }
    camera.position.lerp(this.destination, alpha);
    camera.position.y = Math.max(CAMERA_LIMITS.minHeight, camera.position.y);
    this.focus.lerp(this.desiredFocus, alpha);
    camera.lookAt(this.focus);
  }
}

const UI_TARGETS = 'header, nav, footer, .toolbar, .info-panel, .flat-index, .shadow-chat, a, input, textarea, select, button:not(.city-label)';

export function attachCityWheelZoom(
  surface: HTMLElement,
  onZoom: (deltaY: number, deltaMode: number, pageHeight: number) => void,
) {
  // Capture at the portfolio root so decorative overlays and DOM labels cannot
  // swallow scene wheel input. Keep UI/panel scrolling and browser zoom native.
  const eventRoot = surface.closest('main') ?? surface;
  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey || event.deltaY === 0) return;
    const bounds = surface.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) return;
    const target = event.target as Element | null;
    if (target?.closest(UI_TARGETS)) return;
    event.preventDefault();
    onZoom(event.deltaY, event.deltaMode, bounds.height);
  };
  eventRoot.addEventListener('wheel', onWheel as EventListener, { passive: false, capture: true });
  return () => eventRoot.removeEventListener('wheel', onWheel as EventListener, { capture: true });
}
