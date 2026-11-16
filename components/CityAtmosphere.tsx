'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { landmarks } from '@/data/profile';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { SKY_SIGNAL_POSITION, SKY_SIGNAL_RADIUS } from './city-camera';

type Box = { position: [number,number,number]; size: [number,number,number] };

export function Boxes({ boxes, color, emissive = '#000000', intensity = 0 }: { boxes: Box[]; color: string; emissive?: string; intensity?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    boxes.forEach((box,index) => {
      matrix.compose(new THREE.Vector3(...box.position),rotation,new THREE.Vector3(...box.size));
      mesh.setMatrixAt(index,matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes]);
  return <instancedMesh ref={ref} args={[undefined,undefined,boxes.length]}>
    <boxGeometry/>
    <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={intensity} roughness={.48} metalness={.35}/>
  </instancedMesh>;
}

const shells: Box[] = [], roofs: Box[] = [], warmWindows: Box[] = [], coolWindows: Box[] = [];
for (let i = 0; i < 110; i++) {
  const random = (n:number) => { const v = Math.sin(i*127.1+n*311.7)*43758.5453; return v-Math.floor(v); };
  const x=(random(1)-.5)*85, z=(random(2)-.5)*65, h=1.5+random(3)*10, w=1+random(4)*2;
  // Preserve the city footprint while clearing landmark sightlines and roads.
  if (landmarks.some(l=>Math.hypot(x-l.x,z-l.z)<5) ||
      [-15,-3,15].some(road=>Math.abs(x-road)<1.7) ||
      [-14,4,16].some(road=>Math.abs(z-road)<1.5) ||
      (z>12 && Math.abs(x)<14)) continue;
  shells.push({position:[x,h/2,z],size:[w,h,w]});
  roofs.push({position:[x,h+.22,z],size:[w*.68,.44,w*.68]});
  for (let row=0; row<Math.floor(h*1.4); row++) for (let col=0; col<3; col++) {
    if ((row+col+i)%5===0) continue;
    const y=.45+row*.62, offset=(col-1)*w*.24;
    const windows = i%4===0 ? coolWindows : warmWindows;
    windows.push({position:[x+offset,y,z+w/2+.015],size:[w*.1,.15,.025]});
    windows.push({position:[x+w/2+.015,y,z+offset],size:[.025,.15,w*.1]});
  }
}

export function BackgroundCity() {
  return <>
    <Boxes boxes={shells} color="#203442"/>
    <Boxes boxes={roofs} color="#2b4250"/>
    <Boxes boxes={warmWindows} color="#eec18a" emissive="#ffb552" intensity={1.8}/>
    <Boxes boxes={coolWindows} color="#98d9ea" emissive="#51a8ce" intensity={1.2}/>
  </>;
}

const vertexShader = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const fragmentShader = 'varying vec2 vUv; uniform vec3 tint; uniform float strength; void main(){float d=length(vUv-.5)*2.;float a=exp(-d*d*5.)*(1.-smoothstep(.25,1.,d));gl_FragColor=vec4(tint,a*strength);}';

export function Glow({size=8,color='#ffd582',opacity=.35,ground=false}:{size?:number;color?:string;opacity?:number;ground?:boolean}) {
  const uniforms=useMemo(()=>({tint:{value:new THREE.Color(color)},strength:{value:opacity}}),[color,opacity]);
  return <mesh rotation={ground?[-Math.PI/2,0,0]:[0,0,0]}>
    <planeGeometry args={[size,size]}/>
    <shaderMaterial {...{uniforms,vertexShader,fragmentShader}} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/>
  </mesh>;
}

const lamps = [-15,-3,15].flatMap(x=>[-14,-5,4,16].map(z=>({x,z})));
const poles:Box[]=lamps.map(({x,z})=>({position:[x+.65,1.25,z],size:[.065,2.5,.065]}));
const fixtures:Box[]=lamps.map(({x,z})=>({position:[x+.3,2.55,z],size:[.8,.1,.2]}));
export function StreetLights() {
  return <>
    <Boxes boxes={poles} color="#334550"/>
    <Boxes boxes={fixtures} color="#ffe5a2" emissive="#ffc46b" intensity={3}/>
    {lamps.map(({x,z},i)=><group key={i}>
      <group position={[x+.3,2.55,z]}><Billboard><Glow size={1.6} opacity={.32}/></Billboard></group>
      <group position={[x,.035,z]}><Glow size={5} ground opacity={.17}/></group>
      <mesh position={[x+.3,.04,z+1]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.14,2]}/><meshBasicMaterial color="#d5a657" transparent opacity={.16} depthWrite={false}/></mesh>
    </group>)}
    {/* A few local fill lights, not a shadow-casting light for every lamp. */}
    <pointLight position={[-3,3,4]} color="#ffbf69" intensity={24} distance={13} decay={2}/>
    <pointLight position={[15,3,-5]} color="#ffce81" intensity={20} distance={12} decay={2}/>
    <pointLight position={[-8,5,1]} color="#68c7e2" intensity={18} distance={12} decay={2}/>
  </>;
}

const ignoreSignalRaycast: THREE.Mesh['raycast'] = () => {};

function SignalLogo({logoUrl}:{logoUrl:string}) {
  const svg = useLoader(SVGLoader,logoUrl);
  const {geometries,center,scale} = useMemo(()=>{
    // Read the supplied SVG paths, including holes. Uniform fitting and the
    // SVG-to-Three Y flip change placement only, never the source proportions.
    const geometries = svg.paths.flatMap(path=>SVGLoader.createShapes(path).map(shape=>new THREE.ShapeGeometry(shape,48)));
    const bounds = new THREE.Box3();
    geometries.forEach(geometry=>{
      geometry.computeBoundingBox();
      if (geometry.boundingBox) bounds.union(geometry.boundingBox);
    });
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    // The full path bounding rectangle fits inside the spotlight circle, with
    // a golden border. Transparent viewBox padding does not shrink the logo.
    const diagonal = Math.hypot(size.x,size.y);
    return {geometries,center,scale:diagonal>0 ? (SKY_SIGNAL_RADIUS*2*.88)/diagonal : 1};
  },[svg]);
  useEffect(()=>()=>{geometries.forEach(geometry=>geometry.dispose());},[geometries]);
  return <group position={[0,0,.06]} scale={[scale,-scale,scale]}>
    <group position={[-center.x,-center.y,0]}>
      {geometries.map((geometry,index)=><mesh key={index} raycast={ignoreSignalRaycast}>
        <primitive object={geometry} attach="geometry"/>
        <meshBasicMaterial color="#080e16" toneMapped={false} fog={false} side={THREE.DoubleSide}/>
      </mesh>)}
    </group>
  </group>;
}

export function SkySignal({logoUrl}:{logoUrl:string}) {
  return <Billboard position={SKY_SIGNAL_POSITION} onUpdate={group=>{
    // Decoration is never a navigation/raycast target.
    group.traverse(object=>{object.raycast=()=>{};});
  }}>
    <Glow size={16} opacity={.35}/>
    <mesh position={[0,0,.02]}><circleGeometry args={[3.6,80]}/><meshBasicMaterial color="#f4cd78" toneMapped={false} fog={false}/></mesh>
    <mesh position={[0,0,.035]}><ringGeometry args={[3.6,SKY_SIGNAL_RADIUS,80]}/><meshBasicMaterial color="#ffe4a1" toneMapped={false} fog={false}/></mesh>
    <Suspense fallback={null}><SignalLogo logoUrl={logoUrl}/></Suspense>
  </Billboard>;
}

function Searchlight({position,phase,reduced}:{position:[number,number,number];phase:number;reduced:boolean}) {
  const ref=useRef<THREE.Group>(null);
  useFrame(({clock})=>{
    if (!ref.current) return;
    const t=reduced?phase:clock.elapsedTime*.12+phase;
    ref.current.rotation.set(Math.sin(t)*.2,0,Math.cos(t*.7)*.22);
  });
  return <group position={position} ref={ref}>
    <mesh position={[0,12,0]} rotation={[0,0,Math.PI]}><coneGeometry args={[3.8,24,20,1,true]}/><meshBasicMaterial color="#aacfe6" transparent opacity={.025} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false}/></mesh>
  </group>;
}

export function SkyAtmosphere({reduced}:{reduced:boolean}) {
  const signalBeam=useMemo(()=>{
    const start=new THREE.Vector3(8,5,9), end=new THREE.Vector3(...SKY_SIGNAL_POSITION);
    const delta=end.clone().sub(start);
    return {center:start.clone().add(end).multiplyScalar(.5),length:delta.length(),rotation:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,-1,0),delta.normalize())};
  },[]);
  return <>
    <Searchlight position={[-12,7,-6]} phase={0} reduced={reduced}/>
    <Searchlight position={[14,6,-12]} phase={2} reduced={reduced}/>
    <mesh position={signalBeam.center} quaternion={signalBeam.rotation}><coneGeometry args={[3.6,signalBeam.length,24,1,true]}/><meshBasicMaterial color="#f0c577" transparent opacity={.035} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false}/></mesh>
  </>;
}
