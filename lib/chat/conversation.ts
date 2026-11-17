import { hiringFocus } from './hiring';
import { normalize, detectIntent, recruiterIntents, tokens } from './retrieval';
import { knowledge } from './knowledge';
import { projects } from '@/data/projects';
import type { ChatResponse, HistoryMessage } from './types';

export type Intent = 'GREETING' | 'SMALL_TALK' | 'GRATITUDE' | 'FAREWELL' | 'PORTFOLIO_QUESTION' | 'HIRING_SUITABILITY' | 'OUT_OF_SCOPE';
const phrases: Partial<Record<Intent, RegExp>> = {
  GREETING: /^(hey|hi|hello|hello there|hey there|good morning|good afternoon|good evening|assalamu alaikum|salam|হ্যালো|হাই)$/, 
  SMALL_TALK: /^(how are you|how are you doing|what s up|whats up|how s it going|hows it going)$/, 
  GRATITUDE: /^(thanks|thank you|thanks a lot|thank you very much|appreciate it|ধন্যবাদ)$/, 
  FAREWELL: /^(bye|goodbye|see you|see you later|take care)$/, 
};
export function conversationalText(question: string) {
  return normalize(question.replace(/[’']/g,' ')).replace(/\./g,' ').replace(/\s+/g,' ').trim();
}
export function stripGreeting(question: string) {
  // Only remove a leading salutation; the remaining request is still classified.
  return conversationalText(question).replace(/^(?:hey|hi|hello|good morning|good afternoon|good evening|assalamu alaikum)\b\s+(?=\S)/,'').replace(/^can you (?:please )?/,'').trim();
}
export function isReference(question: string) {
  return /^(?:tell me|tell me more|more details|what about|and what about)(?: about)? (?:the )?(?:first|second|third|1st|2nd|3rd|last) (?:one|project)$/.test(conversationalText(question)) || /\b(?:its|that project|this project)\b/.test(conversationalText(question));
}
export function classifyIntent(question: string, history: HistoryMessage[] = []): Intent {
  const text=conversationalText(question);
  for(const [intent,pattern] of Object.entries(phrases)) if(pattern.test(text)) return intent as Intent;
  const request=stripGreeting(question);
  if(hiringFocus(request)) return 'HIRING_SUITABILITY';
  if(recruiterIntents(request).length || /^(?:tell me more about that|why that field|what projects)\b/.test(request) || isReference(request)) return 'PORTFOLIO_QUESTION';
  if(detectIntent(request)==='biography') return 'PORTFOLIO_QUESTION';
  if(/\b(?:azizur|aziz|riju|rahman|portfolio|education|cgpa|icpc|codeforces|skills|projects?|internship|research|contact|github|linkedin|degree|university|technical|programming)\b/.test(request) || /শিক্ষা|দক্ষতা|যোগাযোগ|প্রজেক্ট|গবেষণা/.test(request)) return 'PORTFOLIO_QUESTION';
  const terms=new Set(tokens(request));
  if(knowledge.some(d=>tokens(`${d.title} ${d.category} ${d.keywords?.join(' ') ?? ''}`).some(term=>terms.has(term)))) return 'PORTFOLIO_QUESTION';
  if(/\b(?:python|java|sql|docker|supabase|sqlite|streamlit|numpy|pandas|nlp|experience|background)\b/.test(request)) return 'PORTFOLIO_QUESTION';
  if(isReference(request) && history.some(m=>m.role==='user' && classifyIntent(m.content)==='PORTFOLIO_QUESTION')) return 'PORTFOLIO_QUESTION';
  return 'OUT_OF_SCOPE';
}
export function conversationalReply(intent: Intent): ChatResponse {
  const answers: Partial<Record<Intent,string>> = {
    GREETING: "Hey! Welcome to Code of Shadows. I'm SHADOW AI, Azizur's portfolio assistant. What would you like to explore?",
    SMALL_TALK: "I'm doing great! Ready to help you explore Azizur's projects, skills, and experience.",
    GRATITUDE: "You're welcome! Feel free to explore the city or ask me more about Azizur.",
    FAREWELL: 'See you! Thanks for visiting Code of Shadows.',
    OUT_OF_SCOPE: "I don't have that information. I'm here to help with Azizur's professional portfolio—ask me about his projects, education, skills, or ICPC journey.",
  };
  return {answer:answers[intent]!,sources:[],documentIds:[],mode:'local',source:'local-fallback',intent,...(intent==='OUT_OF_SCOPE'?{reason:'no_context' as const,errorCode:'NO_CONTEXT' as const}:{})};
}

// History identifies references only; all factual details still come from records.
export function resolveQuestion(question: string, history: HistoryMessage[]): { query: string; unresolved?: boolean } {
  let query=stripGreeting(question);
  if(hiringFocus(query)) {
    // In this single-owner portfolio, pronouns default to Azizur. Recent user
    // context may select a project/field, but never supplies factual evidence.
    const previous=[...history.slice(-6)].reverse().find(m=>m.role==='user');
    const context=previous?.content ?? '';
    if(/\b(?:him|he|his)\b/.test(query) && !/\b(?:ai|ml|software|full stack)\b/.test(query)) {
      const project=projects.find(p=>context.toLowerCase().includes(p.title.toLowerCase()));
      const field=/\b(?:ai|ml|machine learning|software|full stack)\b/i.exec(context)?.[0];
      query=`${query} Azizur Rahman ${project?.title ?? field ?? ''}`;
    }
    return {query};
  }
  const followup = /^(?:tell me more(?: about (?:that|it))?|why (?:that|this) field|what projects)\.?$/.test(query);
  if(followup) {
    const previous=[...history].reverse().find(m=>m.role==='user' && classifyIntent(m.content)==='PORTFOLIO_QUESTION');
    if(!previous) return {query,unresolved:true};
    const lastAssistant=[...history].reverse().find(m=>m.role==='assistant');
    const mentioned=projects.filter(p=>lastAssistant?.content.toLowerCase().includes(p.title.toLowerCase()));
    if(!/what projects/.test(query) && mentioned.length) return {query:mentioned.map(p=>p.title).join(' ')};
    const context=history.filter(m=>m.role==='user').map(m=>m.content).join(' ');
    if(/what projects/.test(query) && (recruiterIntents(context).some(i=>['career','ml'].includes(i)))) return {query:'AI ML projects'};
    return {query:`${stripGreeting(previous.content)} ${query}`};
  }
  const ordinal=/\b(first|second|third|1st|2nd|3rd|last) (?:one|project)\b/.exec(query);
  if(ordinal && isReference(question)) {
    const lastAssistant=[...history].reverse().find(m=>m.role==='assistant');
    const mentioned=projects.map(p=>({project:p,index:lastAssistant?.content.toLowerCase().indexOf(p.title.toLowerCase()) ?? -1})).filter(p=>p.index>=0).sort((a,b)=>a.index-b.index);
    const index=ordinal[1]==='last'?mentioned.length-1:['first','1st'].includes(ordinal[1])?0:['second','2nd'].includes(ordinal[1])?1:2;
    const chosen=mentioned[index]?.project;
    return chosen ? {query:`${chosen.title} ${query.replace(ordinal[0],'')}`} : {query,unresolved:true};
  }
  if(isReference(question) || /^(?:and |what about |আর )/.test(query)) {
    const previous=[...history].reverse().find(m=>m.role==='user' && classifyIntent(m.content)==='PORTFOLIO_QUESTION');
    if(previous) return {query:`${stripGreeting(previous.content)} ${query}`};
  }
  // Broad project questions need actual project records, not a biography hit.
  if(/\bprojects\b/.test(query) && !/\b(?:ai|ml|research|mental|placement|tesla|question bank)\b/.test(query)) return {query:'software projects'};
  return {query};
}
