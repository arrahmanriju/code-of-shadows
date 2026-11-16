'use client';
import { Suspense, useEffect, useMemo, useRef, useState, memo, Component, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { landmarks } from '@/data/profile';
import { layoutCityLabels, projectCityLabel } from './city-label-projection';
import './CityLabels.css';
import { attachCityWheelZoom, CityCameraController } from './city-camera';
import { BackgroundCity, Boxes, Glow, SkyAtmosphere, SkySignal, StreetLights } from './CityAtmosphere';
import { Billboard } from '@react-three/drei';
import { TowerHoverState } from './tower-hover';
import { attachCityPan } from './city-pan';
import WeatherEffects, {WetGround} from './WeatherEffects';
import type {WeatherSettings} from './weather';
const Building=memo(function Building({item,index,onSelect,hover,hoverState,reduced}:{item:typeof landmarks[number];index:number;onSelect:(id:string)=>void;hover:boolean;hoverState:TowerHoverState;reduced:boolean}){
 const color=hover?'#e4bb75':index===0?'#e1ba7b':'#688e9f';
 const body=useRef<THREE.MeshStandardMaterial>(null);
 const targetColor=useMemo(()=>new THREE.Color(hover?'#375568':'#233b4c'),[hover]);
 useFrame((_,delta)=>{body.current?.color.lerp(targetColor,reduced?1:1-Math.exp(-10*delta));});
 const windows=useMemo(()=>Array.from({length:Math.floor(item.h*2)},(_,r)=>[0,1,2].flatMap(c=>[
   {position:[(c-1)*.65,.4+r*.46,1.27] as [number,number,number],size:[.23,.15,.025] as [number,number,number]},
   {position:[1.27,.4+r*.46,(c-1)*.65] as [number,number,number],size:[.025,.15,.23] as [number,number,number]},
 ])).flat(),[item.h]);
 const enter=(event:ThreeEvent<PointerEvent>)=>{event.stopPropagation();hoverState.enter('mesh',item.id);};
 return <group position={[item.x,0,item.z]}>
 <mesh position={[0,(item.h+2.8)/2,0]} onPointerOver={enter} onPointerMove={enter}
   onPointerOut={event=>{event.stopPropagation();hoverState.leave('mesh',item.id);}}
   onClick={event=>{event.stopPropagation();onSelect(item.id);}}>
   <boxGeometry args={[2.8,item.h+2.8,2.8]}/>
   <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/>
 </mesh>
 <mesh position={[0,item.h/2,0]}><boxGeometry args={[2.5,item.h,2.5]}/><meshStandardMaterial ref={body} color="#233b4c" metalness={0.45} roughness={0.42}/></mesh>
 <mesh position={[0,item.h+.35,0]}><boxGeometry args={[1.7,.7,1.7]}/><meshStandardMaterial color="#263b48"/></mesh>
 {(index===0||index===2)&&<mesh position={[0,item.h+1.5,0]}><coneGeometry args={[.85,2,4]}/><meshStandardMaterial color="#537284" metalness={.8} roughness={.3}/></mesh>}
 {index===3&&<mesh position={[0,item.h+.5,0]}><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#6ea4ab" wireframe/></mesh>}
 {index===4&&[-.85,0,.85].map(x=><mesh key={x} position={[x,item.h/2,1.35]}><cylinderGeometry args={[.13,.13,item.h,8]}/><meshStandardMaterial color="#9b977d"/></mesh>)}
 {index===6&&<mesh position={[0,item.h+1,0]} rotation={[.5,0,.4]}><cylinderGeometry args={[.8,.5,.3,24]}/><meshStandardMaterial color="#d6b47b"/></mesh>}
 <Boxes boxes={windows} color={color} emissive={index%3===1?'#62c9e5':'#ffc46e'} intensity={hover?3:1.7}/>
 <mesh position={[0,item.h-.15,0]}><boxGeometry args={[2.58,.06,2.58]}/><meshBasicMaterial color={hover?'#ffe1a0':'#65c3dc'} toneMapped={false}/></mesh>
 <group position={[0,item.h+.8,0]}><Billboard><Glow size={2.4} color={hover?'#ffd582':'#6acfe8'} opacity={.16}/></Billboard></group>
 <mesh position={[0,.04,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[2,2.03,48]}/><meshBasicMaterial color={color} transparent opacity={hover?1:.35}/></mesh>
 </group>
});

function HoverFeedback({hoverState,dragging}:{hoverState:TowerHoverState;dragging:boolean}) {
  const canvas=useThree(state=>state.gl.domElement);
  useEffect(()=>{
    const leave=()=>hoverState.clear('mesh');
    const blur=()=>hoverState.reset();
    canvas.addEventListener('pointerleave',leave);
    window.addEventListener('blur',blur);
    return ()=>{
      canvas.removeEventListener('pointerleave',leave);
      window.removeEventListener('blur',blur);
      hoverState.reset();
    };
  },[canvas,hoverState]);
  useFrame(()=>{if(dragging) hoverState.reset(); hoverState.flush();});
  return null;
}
function Rig({entered,selected,reduced,onDragging,onPanReady}:{entered:boolean;selected:string|null;reduced:boolean;onDragging:(active:boolean)=>void;onPanReady:(ready:boolean)=>void}) {
  const [controller] = useState(() => new CityCameraController());
  const size = useThree(state=>state.size);
  const canvas = useThree(state=>state.gl.domElement);
  const camera = useThree(state=>state.camera);
  const lastReady = useRef(false);
  useEffect(() => {
    // Resolve the actual mounted canvas surface in this renderer, rather than
    // passing a page ref through the separate Canvas reconciliation root.
    const surface=canvas.closest<HTMLElement>('[data-city-surface]');
    if(!surface) throw new Error('The city canvas must be mounted inside its wheel interaction surface.');
    if(!(camera instanceof THREE.PerspectiveCamera)) return;
    const detachWheel=attachCityWheelZoom(surface, (delta,mode,height) => {
      controller.setView(entered,landmarks.find(l=>l.id===selected) ?? null,size.width/size.height);
      controller.zoom(delta,mode,height);
    });
    const detachPan=attachCityPan(surface,camera,controller,onDragging);
    const zoomButton=(event:MouseEvent)=>{
      const button=(event.target as Element|null)?.closest<HTMLButtonElement>('button[data-city-zoom]');
      if(button && surface.contains(button)) controller.zoom(Number(button.dataset.cityZoom));
    };
    surface.addEventListener('click',zoomButton);
    return ()=>{detachPan();detachWheel();surface.removeEventListener('click',zoomButton);};
  }, [controller,entered,selected,canvas,camera,size.width,size.height,onDragging]);
  useFrame(({camera,clock},delta) => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    controller.setView(entered,landmarks.find(l=>l.id===selected) ?? null,size.width/size.height);
    controller.update(camera,delta,clock.elapsedTime,reduced);
    const ready=controller.canPan(camera);
    if(lastReady.current!==ready) {lastReady.current=ready;onPanReady(ready);}
  });
  return null;
}
class SceneBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?this.props.fallback:this.props.children}}
const labelPositions = landmarks.map(item => new THREE.Vector3(item.x, item.h + 2.6, item.z));

function LabelProjection({labels,connectors}:{labels:RefObject<(HTMLButtonElement|null)[]>;connectors:RefObject<(SVGLineElement|null)[]>}) {
  useFrame(({camera,size}) => {
    // Rig runs first, so labels follow the camera at its current-frame position.
    camera.updateMatrixWorld();
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const projected=labelPositions.map(position=>projectCityLabel(position,camera,size.width,size.height));
    const boxes=projected.map((point,index)=>({...point,width:labels.current[index]?.offsetWidth??0,height:labels.current[index]?.offsetHeight??0}));
    // Hover must not reorder or resize DOM hit targets beneath the pointer.
    const layout=layoutCityLabels(boxes,size.width,size.height-(size.width>700?150:16));
    layout.forEach((point,index) => {
      const button = labels.current[index];
      if (!button) return;
      const connector=connectors.current[index];
      if(connector) {
        connector.style.visibility=point.visible?'visible':'hidden';
        connector.setAttribute('x1',String(projected[index].x));
        connector.setAttribute('y1',String(projected[index].y));
        connector.setAttribute('x2',String(point.x));
        connector.setAttribute('y2',String(point.y));
      }
      button.style.visibility = point.visible ? 'visible' : 'hidden';
      if (!point.visible) return;
      button.style.transform = `translate3d(${point.x}px,${point.y}px,0) translate(-50%,-50%) scale(${point.scale})`;
      button.style.zIndex = String(projected[index].zIndex);
    });
  });
  return null;
}

export default function City({entered,selected,reduced,onSelect,logoUrl,weather}:{entered:boolean;selected:string|null;reduced:boolean;onSelect:(id:string)=>void;logoUrl:string;weather:WeatherSettings}) {
  const labels = useRef<(HTMLButtonElement|null)[]>([]);
  const connectors = useRef<(SVGLineElement|null)[]>([]);
  const [hovered,setHovered] = useState<string|null>(null);
  const [hoverState]=useState(()=>new TowerHoverState(setHovered));
  const [dragging,setDragging]=useState(false);
  const [panReady,setPanReady]=useState(false);
  return (
    <SceneBoundary fallback={<div className="scene-fallback">3D rendering is unavailable. Explore every landmark with the navigation below.</div>}>
      <div data-city-surface="" data-hovered={hovered??undefined} data-pan-ready={panReady?'':undefined} data-dragging={dragging?'':undefined} style={{position:'relative',width:'100%',height:'100%'}}>
        <Canvas dpr={[1,1.5]} camera={{position:[32,24,38],fov:43,near:.2,far:180}} gl={{antialias:true,alpha:false,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.12}} fallback={<div className="scene-fallback">Use the city index to explore on this device.</div>}>
          <color attach="background" args={['#081321']}/>
          <hemisphereLight args={['#739bc9','#111c30',.8]}/>
          <ambientLight color="#416a9c" intensity={.28}/>
          <directionalLight position={[-18,35,18]} color="#a9cff5" intensity={2.4}/>
          <directionalLight position={[20,18,-25]} color="#4d8ec4" intensity={1.25}/>
          <Suspense fallback={null}>
            <Stars radius={100} depth={30} count={500} factor={1.5} fade speed={reduced?0:.1}/>
            <WetGround settings={weather} reduced={reduced}/>
            {[-15,-3,15].map(x=><mesh key={x} position={[x,.005,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.07,100]}/><meshBasicMaterial color="#a78753" transparent opacity={.4}/></mesh>)}
            <BackgroundCity/>
            <StreetLights/>
            <SkyAtmosphere reduced={reduced}/>
            {landmarks.map((item,index)=><Building key={item.id} {...{item,index,onSelect,hoverState,reduced}} hover={hovered===item.id}/>)}
            <HoverFeedback hoverState={hoverState} dragging={dragging}/>
            <WeatherEffects settings={weather} reduced={reduced}/>
            <Rig {...{entered,selected,reduced}} onDragging={setDragging} onPanReady={setPanReady}/>
            <SkySignal logoUrl={logoUrl}/>
            <LabelProjection labels={labels} connectors={connectors}/>
          </Suspense>
        </Canvas>
        <div className="city-zoom-controls" role="group" aria-label="City camera zoom">
          <button type="button" data-city-zoom="-160" aria-label="Zoom into the city" title="Zoom in">+</button>
          <button type="button" data-city-zoom="160" aria-label="Zoom out of the city" title="Zoom out">−</button>
        </div>
        {panReady&&!selected&&<div className="city-pan-hint">Drag to explore · Scroll to zoom</div>}
        {/* Keep DOM labels in the page's React tree: no nested ReactDOM roots. */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
          <svg className="city-label-connectors" aria-hidden="true">
            {landmarks.map((item,index)=><line key={item.id} ref={node=>{connectors.current[index]=node}} style={{visibility:'hidden'}}/>)}
          </svg>
          {landmarks.map((item,index)=>(
            <button
              key={item.id}
              ref={node=>{labels.current[index]=node}}
              className={`city-label ${hovered===item.id?'lit':''}`}
              aria-label={`${item.name}: ${item.section}`}
              style={{position:'absolute',top:0,left:0,visibility:'hidden',pointerEvents:'auto'}}
              onPointerEnter={()=>hoverState.enter('label',item.id)}
              onPointerLeave={()=>hoverState.leave('label',item.id)}
              onFocus={()=>hoverState.enter('focus',item.id)}
              onBlur={()=>hoverState.leave('focus',item.id)}
              onClick={()=>onSelect(item.id)}
            >
              {item.name}<small>{item.section}</small>
            </button>
          ))}
        </div>
      </div>
    </SceneBoundary>
  );
}


