import { hiringFocus } from './hiring';
import type { ChatResponse, Match } from './types';
export function fallback(matches: Match[], reason: ChatResponse['reason'], question: string, errorCode: ChatResponse['errorCode'] = 'NO_CONTEXT'): ChatResponse {
  const bangla = /[\u0980-\u09ff]/.test(question);
  const focus=hiringFocus(question);
  const evidence=matches.map(({document:d})=>{
    if(d.id==='about') return d.content.split(/(?<=\.)\s+/).filter(sentence=>/professional interests|AI\/ML enthusiast/.test(sentence)).join(' ');
    return d.content.split(/(?<=\.)\s+/).slice(0,2).join(' ');
  });
  const hiringAnswer=focus && matches.length ? [
    focus==='positive' ? 'Azizur could be a promising entry-level candidate based on these documented examples:' : focus==='critical' ? 'The portfolio does not establish reasons to reject Azizur or a comparison with other candidates. Assess his fit against your role requirements and an interview; missing documentation is not proof of a weakness. Documented evidence includes:' : 'No specific skill gaps are documented. Compare the role requirements with his demonstrated skills and assess development needs through an interview or practical task. Documented evidence includes:',
    ...evidence.map(text=>`- ${text}`),
    focus==='positive' ? 'These examples suggest technical potential and problem-solving ability; suitability should be assessed against your role requirements and an interview.' : '',
  ].filter(Boolean).join('\n\n') : undefined;
  return {
    answer: hiringAnswer ?? (matches.length
      ? `${bangla ? 'স্থানীয় পোর্টফোলিওর তথ্য (মূল নথি ইংরেজিতে):' : 'Portfolio records:'}\n\n${matches.map(m => `${m.document.title}\n${m.document.content}`).join('\n\n')}\n\n${bangla ? 'এর বাইরে বিস্তারিত তথ্য আমার কাছে নেই।' : 'Additional details are not documented.'}`
      : bangla ? 'এই বিষয়ে আমার কাছে পোর্টফোলিওর তথ্য নেই। আজিজুরের শিক্ষা, দক্ষতা, প্রজেক্ট, আইসিপিসি বা যোগাযোগ সম্পর্কে জানতে পারেন।' : "I don't have that information in Azizur's portfolio. You can ask about his education, skills, projects, ICPC journey, or contact information."),
    sources: matches.map(({document:d}) => ({id:d.id,title:d.title,url:d.sourceUrl})), mode: 'local', source: 'local-fallback', documentIds: matches.map(m=>m.document.id), errorCode, reason,
  };
}
