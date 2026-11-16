'use client';

import {useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {resolveWeather,type WeatherSettings} from './weather';

function random(index:number,salt:number){const value=Math.sin(index*127.1+salt*311.7)*43758.5453;return value-Math.floor(value)}

function RainField({count,speed,opacity}:{count:number;speed:number;opacity:number}){
 const points=useRef<THREE.Points>(null);
 const {positions,speeds}=useMemo(()=>{
  const positions=new Float32Array(count*3),speeds=new Float32Array(count);
  for(let i=0;i<count;i++){
   positions[i*3]=(random(i,1)-.5)*86;
   positions[i*3+1]=random(i,2)*38;
   positions[i*3+2]=(random(i,3)-.5)*72;
   speeds[i]=.72+random(i,4)*.58;
  }
  return {positions,speeds};
 },[count]);
 useFrame((_,delta)=>{
  const attribute=points.current?.geometry.getAttribute('position') as THREE.BufferAttribute|undefined;
  if(!attribute)return;
  const step=Math.min(delta,.05);
  const array=attribute.array as Float32Array;
  for(let i=0;i<count;i++){
   const offset=i*3;
   array[offset]+=.8*step;
   array[offset+1]-=speed*speeds[i]*step;
   if(array[offset+1]<-.2){array[offset+1]=36+random(i,5)*4;array[offset]=(random(i,6)-.5)*86;}
   if(array[offset]>43)array[offset]=-43;
  }
  attribute.needsUpdate=true;
 });
 if(!count)return null;
 return <points ref={points} frustumCulled={false}>
  <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry>
  <pointsMaterial color="#b5d5e9" size={.055} transparent opacity={opacity} depthWrite={false} sizeAttenuation/>
 </points>;
}

const mistVertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const mistFragment='varying vec2 vUv;uniform float alpha;void main(){vec2 p=(vUv-.5)*2.;float edge=smoothstep(1.,.1,length(p));float bands=.72+.28*sin(vUv.x*18.+vUv.y*9.);gl_FragColor=vec4(.35,.53,.66,edge*bands*alpha);}';

function StreetMist({opacity,speed}:{opacity:number;speed:number}){
 const group=useRef<THREE.Group>(null);
 const uniforms=useMemo(()=>({alpha:{value:opacity}}),[opacity]);
 useFrame(({clock})=>{if(group.current&&speed)group.current.position.x=Math.sin(clock.elapsedTime*.08*speed)*5});
 if(!opacity)return null;
 return <group ref={group}>
  {[[-18,.18,-4,22,9],[8,.24,12,26,8],[16,.2,-15,20,7],[-5,.16,-18,28,8]].map(([x,y,z,w,h],index)=><mesh key={index} position={[x,y,z]} rotation={[-Math.PI/2,0,index*.35]}>
   <planeGeometry args={[w,h]}/><shaderMaterial uniforms={uniforms} vertexShader={mistVertex} fragmentShader={mistFragment} transparent depthWrite={false}/>
  </mesh>)}
 </group>;
}

const cloudSeeds=[[-32,27,-38],[3,30,-43],[34,25,-36],[-10,33,-52],[20,29,-57]] as const;
function CloudField({count,opacity,speed}:{count:number;opacity:number;speed:number}){
 const refs=useRef<(THREE.Group|null)[]>([]);
 useFrame((_,delta)=>{
  if(!speed)return;
  refs.current.forEach((cloud,index)=>{
   if(!cloud)return;
   cloud.position.x+=delta*speed*(.65+index*.08);
   if(cloud.position.x>48)cloud.position.x=-48;
  });
 });
 return <>{cloudSeeds.slice(0,count).map(([x,y,z],index)=><group key={index} ref={node=>{refs.current[index]=node}} position={[x,y,z]} scale={[1+index*.08,1,1]}>
  {[[-5,0,0,8],[2,.5,0,10],[8,0,-1,7]].map(([cx,cy,cz,scale],part)=><mesh key={part} position={[cx,cy,cz]} scale={[scale,scale*.16,scale*.38]}>
   <sphereGeometry args={[1,12,6]}/><meshBasicMaterial color={index%2?'#526a80':'#60788d'} transparent opacity={opacity*(1-part*.12)} depthWrite={false}/>
  </mesh>)}
 </group>)}</>;
}

function Lightning({enabled}:{enabled:boolean}){
 const light=useRef<THREE.DirectionalLight>(null);
 const nextFlash=useRef(5);
 const flashUntil=useRef(0);
 useFrame(({clock})=>{
  const target=light.current;if(!target)return;
  const time=clock.elapsedTime;
  if(!enabled){target.intensity=0;nextFlash.current=time+5;return;}
  if(time>=nextFlash.current){flashUntil.current=time+.11;nextFlash.current=time+8+random(Math.floor(time*10),9)*10;}
  target.intensity=time<flashUntil.current?3.8:0;
 });
 return <directionalLight ref={light} position={[-18,34,-24]} color="#c7e4ff" intensity={0}/>;
}

export function WetGround({settings,reduced}:{settings:WeatherSettings;reduced:boolean}){
 const width=useThree(state=>state.size.width);
 const weather=resolveWeather(settings,width<700,reduced);
 return <>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.1,0]}><planeGeometry args={[180,180]}/><meshStandardMaterial color="#142434" metalness={.08} roughness={weather.roadRoughness}/></mesh>
  {weather.reflectionOpacity>0&&[-15,-3,15].map((x,index)=><mesh key={x} position={[x,.012,index%2?2:-5]} rotation={[-Math.PI/2,0,0]}>
   <planeGeometry args={[.3,72]}/><meshBasicMaterial color={index===1?'#74c6df':'#e2ae63'} transparent opacity={weather.reflectionOpacity} depthWrite={false}/>
  </mesh>)}
 </>;
}

export default function WeatherEffects({settings,reduced}:{settings:WeatherSettings;reduced:boolean}){
 const width=useThree(state=>state.size.width);
 const weather=resolveWeather(settings,width<700,reduced);
 return <>
  <fog attach="fog" args={['#102238',weather.fogNear,weather.fogFar]}/>
  <RainField count={weather.rainCount} speed={weather.rainSpeed} opacity={weather.rainOpacity}/>
  <StreetMist opacity={weather.mistOpacity} speed={weather.cloudSpeed}/>
  <CloudField count={weather.cloudCount} opacity={weather.cloudOpacity} speed={weather.cloudSpeed}/>
  <Lightning enabled={weather.lightning}/>
 </>;
}
