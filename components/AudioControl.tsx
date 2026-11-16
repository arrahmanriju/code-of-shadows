'use client';

import {Pause,Play,Volume2,VolumeX} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import './AudioControl.css';

type AudioControlProps={url:string|null};

export default function AudioControl({url}:AudioControlProps){
 const audioRef=useRef<HTMLAudioElement>(null);
 const [playing,setPlaying]=useState(false);
 const [volume,setVolume]=useState(.45);
 const [message,setMessage]=useState(url?'Music paused':'Add public/audio/background.mp3');

 useEffect(()=>{if(audioRef.current)audioRef.current.volume=volume},[volume]);

 async function togglePlayback(){
  const audio=audioRef.current;
  if(!audio||!url)return;
  if(!audio.paused){audio.pause();return}
  try{
   setMessage('Starting music…');
   await audio.play();
  }catch(error){
   setPlaying(false);
   setMessage(error instanceof Error&&error.name==='NotAllowedError'?'Select Play again to allow audio':'Music could not be played');
  }
 }

 function updateVolume(value:number){
  setVolume(value);
  if(message==='Music could not be played')setMessage('Music paused');
 }

 const silent=volume===0;
 return <div className={`audio-control ${url?'':'unavailable'}`}>
  {url&&<audio ref={audioRef} src={url} preload="metadata" loop
   onPlay={()=>{setPlaying(true);setMessage('Music playing')}}
   onPause={()=>{setPlaying(false);setMessage('Music paused')}}
   onError={()=>{setPlaying(false);setMessage('Audio file could not be loaded')}}/>}
  <button type="button" className="audio-toggle" onClick={togglePlayback} disabled={!url}
   aria-label={url?(playing?'Pause background music':'Play background music'):'Background music unavailable'}
   aria-pressed={playing} title={url?(playing?'Pause background music':'Play background music'):'Place your licensed audio at public/audio/background.mp3'}>
   {playing?<Pause size={15}/>:<Play size={15}/>}<span>{playing?'PAUSE':'MUSIC'}</span>
  </button>
  <label className="volume-control" title={url?'Background music volume':'Background music unavailable'}>
   {silent?<VolumeX size={15}/>:<Volume2 size={15}/>}<span className="sr-only">Background music volume</span>
   <input type="range" min="0" max="1" step="0.05" value={volume} disabled={!url}
    onChange={event=>updateVolume(Number(event.target.value))}/>
  </label>
  <output className="audio-status" aria-live="polite">{message}</output>
 </div>
}
