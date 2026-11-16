import type { ChatResponse, Match } from './types';
export function fallback(matches: Match[], reason: ChatResponse['reason'], question: string, errorCode: ChatResponse['errorCode'] = 'NO_CONTEXT'): ChatResponse {
  const bangla = /[\u0980-\u09ff]/.test(question);
  return {
    answer: matches.length
      ? `${bangla ? 'স্থানীয় পোর্টফোলিওর তথ্য (মূল নথি ইংরেজিতে):' : 'From the local portfolio records:'}\n\n${matches.map(m => `${m.document.title}\n${m.document.content}`).join('\n\n')}\n\n${bangla ? 'এর বাইরে বিস্তারিত তথ্য আমার কাছে নেই।' : 'Further details beyond these records are unavailable.'}`
      : bangla ? 'এই বিষয়ে আমার কাছে পোর্টফোলিওর তথ্য নেই। আজিজুরের শিক্ষা, দক্ষতা, প্রজেক্ট, আইসিপিসি বা যোগাযোগ সম্পর্কে জানতে পারেন।' : "I don't have that information in Azizur's portfolio. You can ask about his education, skills, projects, ICPC journey, or contact information.",
    sources: matches.map(({document:d}) => ({id:d.id,title:d.title,url:d.sourceUrl})), mode: 'local', source: 'local-fallback', documentIds: matches.map(m=>m.document.id), errorCode, reason,
  };
}
