'use client';

import {CloudFog,CloudLightning,CloudRain,Moon} from 'lucide-react';
import type {WeatherMode,WeatherSettings} from './weather';
import {WEATHER_MODES} from './weather';
import './WeatherControl.css';

const icons={rainy:CloudRain,storm:CloudLightning,clear:Moon};

export default function WeatherControl({settings,onChange}:{settings:WeatherSettings;onChange:(next:WeatherSettings)=>void}){
 const active=WEATHER_MODES.find(([mode])=>mode===settings.mode)??WEATHER_MODES[0];
 const ActiveIcon=icons[settings.mode];
 const update=(patch:Partial<WeatherSettings>)=>onChange({...settings,...patch});
 return <details className="weather-control">
  <summary aria-label={`Weather controls. Current mode: ${active[1]}`} title="Weather controls">
   <ActiveIcon size={15}/><span>WEATHER</span>
  </summary>
  <div className="weather-menu" role="group" aria-label="City weather">
   <div className="weather-heading"><CloudFog size={14}/><span>ATMOSPHERE</span></div>
   {WEATHER_MODES.map(([mode,label,description])=>{
    const Icon=icons[mode];
    return <button type="button" className={`weather-mode ${settings.mode===mode?'active':''}`} key={mode}
     aria-pressed={settings.mode===mode} onClick={()=>update({mode:mode as WeatherMode})}>
     <Icon size={16}/><span><strong>{label}</strong><small>{description}</small></span>
    </button>;
   })}
   <div className="weather-toggles">
    <label><input type="checkbox" checked={settings.fog} onChange={event=>update({fog:event.target.checked})}/><span>Fog</span></label>
    <label className={settings.mode==='storm'?'':'disabled'}><input type="checkbox" checked={settings.lightning}
     disabled={settings.mode!=='storm'} onChange={event=>update({lightning:event.target.checked})}/><span>Lightning</span></label>
   </div>
  </div>
 </details>;
}
