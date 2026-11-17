'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import {ArrowUpRight,ArrowRight,ArrowLeft,Map,X,ChevronRight,Layers} from 'lucide-react';
import {landmarks,skills,socials} from '@/data/profile';
import ProjectCards from './ProjectCards';
import ContactPanel from './ContactPanel';
import ResumeAction from './ResumeAction';
import BatMark from './BatMark';
import AudioControl from './AudioControl';
import WeatherControl from './WeatherControl';
import ShadowChat from './ShadowChat';
import {DEFAULT_WEATHER_SETTINGS} from './weather';
const City=dynamic(()=>import('./City'),{ssr:false,loading:()=> <div className="loading">INITIALIZING CITY GEOMETRY<span/></div>});
export default function Explorer({resumeUrl,logoUrl,audioUrl}:{resumeUrl:string|null;logoUrl:string;audioUrl:string|null}){const [entered,setEntered]=useState(false);const [selected,setSelected]=useState<string|null>(null);const [flat,setFlat]=useState(false);const [quiet,setQuiet]=useState(false);const [weather,setWeather]=useState(DEFAULT_WEATHER_SETTINGS);const systemReduced=useReducedMotion();const reduced=quiet||!!systemReduced;const closeRef=useRef<HTMLButtonElement>(null);const previousFocus=useRef<HTMLElement|null>(null);
function open(id:string){previousFocus.current=document.activeElement as HTMLElement;setSelected(id);setEntered(true)}
useEffect(()=>{if(!selected)return;closeRef.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setSelected(null);if(e.key==='Tab'){const dialog=document.getElementById('info-panel');const nodes=dialog?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),summary');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key);previousFocus.current?.focus()}},[selected]);
const active=landmarks.find(l=>l.id===selected);
return <main className={reduced?'reduced':''}>
 <div className={`world ${flat?'flat':''}`} aria-hidden={flat}>{!flat&&<City {...{entered,selected,reduced,logoUrl,weather}} onSelect={open}/>}</div><div className="vignette"/><div className="grain"/>
 <header><Link className="brand" href="/" aria-label="Code of Shadows home"><BatMark logoUrl={logoUrl}/><span className="brand-title">CODE <span className="muted">OF SHADOWS</span></span><i> / </i><small>WHERE CODE MEETS THE DARK</small></Link><div className="header-right"><span className="online"><b/> AVAILABLE FOR OPPORTUNITIES</span><ResumeAction url={resumeUrl} compact/></div></header>
 <div className="coordinate"><span>23.80° N &nbsp; 90.40° E</span><span>DHAKA, BANGLADESH</span></div>
 {!entered&&!selected&&<section className="hero"><div className="eyebrow"><span/> WHERE CODE MEETS THE DARK.</div><h1>AZIZUR<br/><span>RAHMAN<span className="period">.</span></span></h1><div className="roles">AI/ML Enthusiast <i/> Software Developer <i/> ICPC Regionalist</div><p>Exploring intelligence, building solutions,<br/>one line of code at a time.</p><button className="enter" onClick={()=>setEntered(true)}>ENTER THE CITY <ArrowRight size={18}/></button><div className="entry-note"><span>07 LANDMARKS</span><b>·</b><span>ONE CURIOUS MIND</span></div></section>}
 {entered&&!selected&&<section className="explore-hint"><div className="eyebrow">EXPLORER MODE / ACTIVE</div><h2>A city of possibilities.</h2><p>Select a landmark to discover what I build.</p><button type="button" className="text-button overview-back inline-flex items-center gap-2" onClick={()=>setEntered(false)}><ArrowLeft size={18} aria-hidden="true"/><span>Back to overview</span></button></section>}
 <aside className="right-rail"><span>CODE OF SHADOWS</span><div/><span>EST. 2026</span></aside>
 <div className="city-caption"><span className="crosshair">+</span><div>CENTRAL DISTRICT<small>YOUR NEXT COLLABORATOR IS HERE.</small></div></div>
 <div className="toolbar"><button onClick={()=>setFlat(!flat)} aria-pressed={flat} title="Toggle 2D city index"><Map size={16}/><span>{flat?'3D VIEW':'2D INDEX'}</span></button><button onClick={()=>setQuiet(!quiet)} aria-pressed={reduced} title="Reduce motion"><Layers size={16}/><span>{reduced?'MOTION OFF':'REDUCE MOTION'}</span></button><WeatherControl settings={weather} onChange={setWeather}/><AudioControl url={audioUrl}/></div>
 {flat&&<section className="flat-index"><div className="eyebrow">THE CITY INDEX</div><h2>Choose your destination.</h2>{landmarks.map(l=><button key={l.id} onClick={()=>open(l.id)}><strong>{l.name}<small>{l.section}</small></strong><ArrowUpRight size={18}/></button>)}</section>}
 <nav className="district-nav" aria-label="Portfolio sections"><div className="nav-intro"><span className="live-dot"/> EXPLORE THE CITY<small>SELECT A LANDMARK</small></div>{landmarks.map(l=><button key={l.id} onClick={()=>open(l.id)} className={selected===l.id?'active':''}>{l.section}<ChevronRight size={12}/></button>)}</nav>
 <footer><span>© {new Date().getFullYear()} AZIZUR RAHMAN</span><span>BUILT WITH CURIOSITY / POWERED BY CODE</span></footer>
 <ShadowChat suspended={!!selected}/>
 <AnimatePresence>{selected&&active&&<motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:.25}} onClick={()=>setSelected(null)}><motion.section id="info-panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" className="info-panel" initial={{x:reduced?0:40}} animate={{x:0}} onClick={e=>e.stopPropagation()}><div className="panel-top"><span>CODE OF SHADOWS / {active.name.toUpperCase()}</span><button ref={closeRef} aria-label="Close and return to city" onClick={()=>setSelected(null)}><X size={20}/></button></div><div className="eyebrow">{active.name}</div><h2 id="panel-title">{active.section}<span className="gold">.</span></h2><PanelContent id={selected} resumeUrl={resumeUrl}/><button type="button" className="back-button" onClick={()=>setSelected(null)}><ArrowLeft size={18} aria-hidden="true"/> BACK TO CITY</button></motion.section></motion.div>}</AnimatePresence>
 </main>}
function PanelContent({id,resumeUrl}:{id:string;resumeUrl:string|null}){if(id==='about')return <><p className="lead">Curiosity is my compass.<br/>Code is how I explore.</p><p>I’m Azizur Rahman, an AI/ML enthusiast and software developer at Southeast University, Dhaka. I enjoy exploring intelligence, solving programming challenges, and building useful software.</p><dl><dt>EDUCATION</dt><dd>B.Sc. in Computer Science and Engineering</dd><dt>UNIVERSITY</dt><dd>Southeast University, Dhaka</dd><dt>CGPA</dt><dd>3.56 / 4.00</dd><dt>CURRENT STATUS</dt><dd>Coursework completed; internship in progress</dd></dl><div className="callout">Open to AI/ML Engineer Intern and Software Development opportunities.</div></>;
if(id==='skills')return <>{Object.entries(skills).map(([name,items])=><div className="skill-group" key={name}><h3>{name}</h3><div className="tags">{items.map(s=><span key={s}>{s}</span>)}</div></div>)}</>;
if(id==='projects'||id==='research')return <><p>{id==='projects'?'Applications built around practical problems.':'Explorations in prediction, machine learning, and data.'}</p><ProjectCards type={id==='projects'?'software':'research'}/></>;
if(id==='awards')return <><div className="achievement"><span>2025</span><h3>ICPC Regionalist</h3><p>Qualified for the ICPC 2025 Regional Contest.</p></div>{['ICPC 2024 and 2025 participation','2nd and 3rd place in university programming contests','210+ Codeforces problems solved','Highest Codeforces rating: 866','University chess tournament champion'].map(a=><div className="award" key={a}>{a}</div>)}</>;
if(id==='coding')return <><p>From competitive programming to projects. Find my work and problem-solving profiles below.</p>{socials.filter(s=>s.name!=='LinkedIn').map(s=><a className="social-link" href={s.url} key={s.name} target="_blank" rel="noopener noreferrer">{s.name}<ArrowUpRight size={20}/></a>)}<div className="callout">210+ Codeforces problems solved · Peak rating 866</div></>;
return <ContactPanel resumeUrl={resumeUrl}/>}


