'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bot, Send, Trash2, X, ArrowUpRight, LoaderCircle } from 'lucide-react';
import type { ChatResponse, HistoryMessage } from '@/lib/chat/types';
import './ShadowChat.css';

type Message = HistoryMessage & { result?: ChatResponse; error?: boolean };
const welcome: Message = {role:'assistant',content:"Welcome to SHADOW AI. I’m Azizur’s portfolio assistant. Ask me about his work, skills, education, or ICPC journey."};
const suggestions = [
  ['About Azizur','Tell me about Azizur'], ['AI/ML Projects','What are his AI/ML projects?'],
  ['Technical Skills','What are his technical skills?'], ['ICPC Journey','Tell me about his ICPC journey'],
  ['Contact Information','What is his contact information?'],
];
export default function ShadowChat({suspended = false}: {suspended?: boolean}) {
  const [open,setOpen] = useState(false);
  const [messages,setMessages] = useState<Message[]>([welcome]);
  const [question,setQuestion] = useState('');
  const [busy,setBusy] = useState(false);
  const reduced = useReducedMotion();
  const input = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const pending = useRef<AbortController | null>(null);
  const active = open && !suspended;
  useEffect(() => () => pending.current?.abort(),[]);
  useEffect(() => { if(active) input.current?.focus(); },[active]);
  useEffect(() => { if(active) end.current?.scrollIntoView({block:'nearest'}); },[messages,busy,active]);
  function close() { setOpen(false); launcher.current?.focus(); }
  function clear() { pending.current?.abort(); pending.current=null; setBusy(false); setMessages([welcome]); setQuestion(''); input.current?.focus(); }
  async function send(value: string) {
    const text = value.trim(); if(!text || text.length>600 || pending.current) return;
    const controller = new AbortController(); pending.current=controller;
    const history = messages.slice(1).slice(-6).map(m=>({role:m.role,content:m.content.slice(0,2000)}));
    setMessages(old=>[...old,{role:'user' as const,content:text}].slice(-41)); setQuestion(''); setBusy(true);
    const timer=setTimeout(()=>controller.abort(),18_000);
    try {
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:text,history}),signal:controller.signal});
      const data=await response.json();
      if(!response.ok) throw new Error(response.status===429 ? `Too many questions. Try again in ${response.headers.get('Retry-After') || '60'} seconds.` : data.error || 'Unable to send your question.');
      if(typeof data.answer!=='string' || !Array.isArray(data.sources)) throw new Error('Unexpected response. Please try again.');
      if(pending.current===controller) setMessages(old=>[...old,{role:'assistant',content:data.answer,result:data}]);
    } catch(error) {
      if(pending.current===controller) setMessages(old=>[...old,{role:'assistant',content:controller.signal.aborted ? 'The request timed out. Please try again.' : error instanceof Error ? error.message : 'Connection unavailable. Please try again.',error:true}]);
    } finally {
      clearTimeout(timer);
      if(pending.current===controller) {pending.current=null;setBusy(false);input.current?.focus();}
    }
  }
  return <div className="shadow-chat" hidden={suspended} onPointerDown={e=>e.stopPropagation()} onPointerMove={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onKeyDown={e=>{
    e.stopPropagation();
    if(e.key==='Escape' && active) {e.preventDefault();close();}
    if(e.key==='Tab' && active) {
      const nodes=panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,a[href],[tabindex="0"]');
      if(!nodes?.length) return;
      const first=nodes[0],last=nodes[nodes.length-1];
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    }
  }}>
    <button ref={launcher} className="shadow-launcher" aria-label={active?'Close SHADOW AI':'Open SHADOW AI'} aria-expanded={active} aria-controls="shadow-chat-panel" onClick={()=>active?close():setOpen(true)}><Bot size={18}/><span>SHADOW AI</span><span className="shadow-dot"/></button>
    <AnimatePresence>{active && <motion.section ref={panel} id="shadow-chat-panel" className="shadow-panel" role="dialog" aria-modal="false" aria-labelledby="shadow-chat-title" initial={{opacity:0,y:reduced?0:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:16}} transition={{duration:reduced?0:.2}}>
      <div className="shadow-heading"><div className="shadow-bot"><Bot size={20}/></div><div><h2 id="shadow-chat-title">SHADOW AI</h2><p>AZIZUR’S PORTFOLIO ASSISTANT</p></div><button aria-label="Clear chat" title="Clear chat" onClick={clear}><Trash2 size={16}/></button><button aria-label="Close chat" title="Close chat" onClick={close}><X size={19}/></button></div>
      <div className="shadow-history" role="log" aria-label="Chat history" aria-live="polite" aria-relevant="additions" tabIndex={0}>
        {messages.map((message,index)=><article key={index} className={`shadow-message ${message.role}${message.error?' shadow-error':''}`}><span className="shadow-speaker">{message.role==='user'?'YOU':'SHADOW AI'}</span><p>{message.content}</p>{message.result?.mode==='local' && message.result.reason && <small className="shadow-mode">{message.result.reason==='no_context'?'No matching portfolio information':'Local knowledge · AI unavailable'}</small>}{!!message.result?.sources.length && <div className="shadow-sources" aria-label="Portfolio sources">{message.result.sources.map(source=>source.url?<a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={12}/></a>:<span key={source.id}>{source.title}</span>)}</div>}</article>)}
        {busy && <div className="shadow-loading" role="status"><LoaderCircle size={15}/> Checking portfolio records…</div>}<div ref={end}/>
      </div>
      <div className="shadow-suggestions" aria-label="Suggested questions">{suggestions.map(([label,value])=><button key={label} disabled={busy} onClick={()=>void send(value)}>{label}</button>)}</div>
      <form className="shadow-form" onSubmit={e=>{e.preventDefault();void send(question);}}><label className="sr-only" htmlFor="shadow-question">Ask about Azizur’s portfolio</label><input ref={input} id="shadow-question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={600} placeholder="Ask about Azizur…" autoComplete="off"/><button type="submit" aria-label="Send question" disabled={busy || !question.trim()}><Send size={18}/></button></form>
      <p className="shadow-note">Portfolio facts only. AI can make mistakes.<br/>Messages may be sent to Google. Avoid personal information.</p>
    </motion.section>}</AnimatePresence>
  </div>;
}
