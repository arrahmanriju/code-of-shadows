// Bounded spelling correction applies only to recruiter vocabulary, never portfolio facts.
export type HiringFocus = 'positive' | 'critical' | 'development';
function nearWord(a: string, b: string) {
  if(Math.abs(a.length-b.length)>1) return false;
  if(a.length===b.length) {
    const differences=[...a].map((c,i)=>c===b[i]?-1:i).filter(i=>i>=0);
    return differences.length===1 || differences.length===2 && differences[1]===differences[0]+1 && a[differences[0]]===b[differences[1]] && a[differences[1]]===b[differences[0]];
  }
  const shorter=a.length<b.length?a:b, longer=a.length<b.length?b:a;
  let i=0; while(i<shorter.length && shorter[i]===longer[i]) i++;
  return shorter.slice(i)===longer.slice(i+1);
}
export function normalizeHiringQuery(question: string) {
  const vocabulary=['recruit','hiring','candidate','suitable','strengths','applicants','weaknesses','suitability','recruitment'];
  return question.normalize('NFKC').toLowerCase().replace(/[\u2019']/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).map(word=>{
    if(['hrie','hie','hrier','hier'].includes(word)) return 'hire';
    return word.length>=5 ? vocabulary.find(term=>term===word || nearWord(word,term)) ?? word : word;
  }).join(' ');
}
export function hiringFocus(question: string): HiringFocus | undefined {
  const q=normalizeHiringQuery(question);
  const development=/\b(?:skills?|abilities|knowledge)\b.*\b(?:still|need|needs|lack|missing|improve|develop|learn)\b|\b(?:weaknesses|skill gaps|areas for (?:growth|improvement))\b/.test(q);
  const hiring=/\b(?:hire|hiring|recruit|recruiting|recruitment|strengths|suitable|suitability|candidate|evaluate|fit)\b|\b(?:value|contribution)\b.*\b(?:bring|add|offer|company|team)\b|\b(?:choose|pick|select|different|stand out)\b.*\b(?:applicants|candidates|others)\b|\b(?:choose|pick|select)\b.*\b(?:him|azizur|aziz|rahman)\b|\b(?:offer|contribute)\b.*\b(?:team|company)\b|\basset\b/.test(q);
  if(!hiring && !development) return undefined;
  // Keep unrelated hiring advice out of this owner's portfolio evidence.
  if(/\b(?:plumber|babysitter|nanny|contractor|someone else)\b/.test(q)) return undefined;
  if(development) return 'development';
  if(/\b(?:not|never|avoid|risks?|concerns?|downsides?|weaknesses|against)\b|\b(?:shouldn t|wouldn t|don t)\b/.test(q)) return 'critical';
  return 'positive';
}
