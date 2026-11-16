import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

// Reuse vectors so projecting the seven labels does not allocate every frame.
const projected = new Vector3();
const cameraPosition = new Vector3();

export function projectCityLabel(
  position: Vector3,
  camera: PerspectiveCamera,
  width: number,
  height: number,
) {
  projected.copy(position).project(camera);
  camera.getWorldPosition(cameraPosition);
  const distance = position.distanceTo(cameraPosition);
  const rawScale = 38 / (2 * Math.tan((camera.fov * Math.PI) / 360) * distance);
  const scale = MathUtils.clamp(rawScale,.95,1.15);

  return {
    visible: projected.z >= -1 && projected.z <= 1 &&
      Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 &&
      Number.isFinite(rawScale),
    x: (projected.x + 1) * width / 2,
    y: (1 - projected.y) * height / 2,
    scale,
    zIndex: Math.max(0, Math.min(10, Math.round(10 * (1 - distance / camera.far)))),
  };
}

type LabelBox = { x:number; y:number; width:number; height:number; scale:number; visible:boolean };

export function layoutCityLabels(labels:LabelBox[],width:number,height:number,priority=-1) {
  const placed:{left:number;right:number;top:number;bottom:number}[]=[];
  const result=labels.map(label=>({...label,visible:false}));
  const order=labels.map((_,index)=>index).sort((a,b)=>Number(b===priority)-Number(a===priority));
  const offsets=[[0,0],[0,-1],[0,1],[-1,0],[1,0],[0,-2],[0,2],[-1,-1],[1,-1],[-1,1],[1,1]];
  for(const index of order) {
    const label=labels[index];
    if (!label.visible) continue;
    const w=label.width*label.scale,h=label.height*label.scale;
    if(w>width-12 || h>height-12) continue;
    for(const [dx,dy] of offsets) {
      const x=MathUtils.clamp(label.x+dx*Math.min(w*.65,80),w/2+6,width-w/2-6);
      const y=MathUtils.clamp(label.y+dy*(h+8),h/2+6,height-h/2-6);
      const rect={left:x-w/2-3,right:x+w/2+3,top:y-h/2-3,bottom:y+h/2+3};
      if(placed.some(other=>rect.left<other.right && rect.right>other.left && rect.top<other.bottom && rect.bottom>other.top)) continue;
      result[index]={...label,x,y,visible:true};
      placed.push(rect);
      break;
    }
  }
  return result;
}
