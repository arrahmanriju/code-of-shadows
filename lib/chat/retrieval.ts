import { hiringFocus, normalizeHiringQuery } from './hiring';
import { knowledge } from './knowledge';
import type { KnowledgeDocument, Match } from './types';

const stopWords = new Set('a an the is are was what which who how tell me about his her he she you your azizur rahman please does do of in on at for and or to can with has have explain details information project projects'.split(' '));
for (const word of ['did','work','worked','done']) stopWords.add(word);
for (const word of ['তার','তিনি','কি','কী','আমাকে','বলুন','বলো','সম্পর্কে','জানতে','চাই','আজিজুর','রহমান']) stopWords.add(word);
export function normalize(text: string) { return text.normalize('NFKC').toLowerCase().replace(/[’']s\b/g, '').replace(/[^\p{L}\p{M}\p{N}+#.]+/gu, ' ').trim(); }
const synonyms: Record<string,string> = { internships:'internship', intern:'internship', opportunities:'opportunity', seeking:'seek', sought:'seek', technologies:'technology', frameworks:'framework', languages:'language', skills:'skill', deployed:'deploy', deployment:'deploy', deploying:'deploy', coding:'programming' };
export function tokens(text: string) { return [...new Set(normalize(text).split(/\s+/).filter(t => t && !stopWords.has(t)).map(t=>synonyms[t] ?? t))]; }
export interface Retriever { retrieve(question: string, limit?: number): Match[] }

// Anchored patterns deliberately avoid turning every mention of a name into a
// biography query (e.g. "Did Riju work at NASA?" must not become an introduction).
export function detectIntent(question: string): 'biography' | 'lexical' {
  const text = normalize(question).replace(/\.+$/,'').replace(/\bazizur rahman\b|\bazizur\b|\baziz\b|\briju\b/g,'owner');
  return /^(?:(?:please )?(?:about|who is|introduce|tell me about|can you introduce|give me an introduction to) (?:owner|yourself|him|he)|owner|tell me about yourself|who are you|introduce yourself|hi|hello|হ্যালো|হাই)$/.test(text) ? 'biography' : 'lexical';
}

// Intent routing and synonym expansion augment lexical ranking; no embeddings or vector search.
export function recruiterIntents(question: string): string[] {
  const q = normalize(question);
  const intents: string[] = [];
  const add = (intent: string, pattern: RegExp) => { if(pattern.test(q)) intents.push(intent); };
  add('career', /\b(looking for|seek\w*|opportunit\w*|intern\w*|career|preferred|preference|interested|position|job|role|professionally|future|want|availability|available|salary|join|employed|employment|professional work experience)\b/);
  add('evaluation', /\b(hire|hiring|strengths?|suitable|suit|candidate|evaluate|fit)\b/);
  add('education', /\b(education\w*|academic background|degree|university|cgpa|coursework)\b/);
  add('skills', /\b(skills?|technolog\w*|know|languages?|frameworks?|tools|full stack|fullstack)\b/);
  add('ml', /\b(ai|ml|machine learning|nlp|artificial intelligence|predictive|llm|rag)\b/);
  add('projects', /\b(projects?|applications?|built|build|developed|deploy\w*)\b/);
  add('research', /\b(research|papers?|publications?|dataset)\b/);
  add('competitive', /\b(icpc|codeforces|competitive|contests?|problems solved|rating)\b/);
  add('contact', /\b(contact|reach|email|linkedin|github|social)\b/);
  add('resume', /(?:^|\s)(resume|r\u00e9sum\u00e9|cv)(?=\s|$)/);
  return intents;
}
const intentRecords: Record<string,string[]> = {
  career:['career'], evaluation:['student-placement-prediction','dhaka-tesla-pool','icpc'],
  education:['education'], skills:['skills'], ml:['research-overview','student-placement-prediction','skills'],
  projects:['dhaka-tesla-pool','seu-question-bank','expense-tracker'], research:['research-overview','tiredness-alertness'],
  competitive:['icpc'], contact:['contact'], resume:['resume'],
};
export class LexicalRetriever implements Retriever {
  constructor(private documents: KnowledgeDocument[]) {}
  retrieve(question: string, limit = 3): Match[] {
    const count = Math.min(3, Math.max(0, limit));
    if (detectIntent(question)==='biography') {
      return ['about','education','icpc'].map((id,index)=>({document:this.documents.find(d=>d.id===id)!,score:100-index})).filter(m=>!!m.document).slice(0,count);
    }
    if(hiringFocus(question) && !/\brole\b/.test(normalize(question))) {
      const q=normalizeHiringQuery(question);
      const development=hiringFocus(question)==='development';
      const namedProject=this.documents.find(d=>['software','research'].includes(d.category) && q.includes(normalizeHiringQuery(d.title)));
      const project=namedProject?.id ?? (/\b(?:software|full stack|web)\b/.test(q) ? 'dhaka-tesla-pool' : 'student-placement-prediction');
      // One profile/skills record, one practical project, one achievement record:
      // breadth beats three highly overlapping project chunks.
      const ids=development ? ['skills','career',project] : ['about',project,'icpc'];
      return ids.flatMap((id,index)=>{
        const document=this.documents.find(d=>d.id===id);
        return document ? [{document,score:100-index}] : [];
      }).slice(0,count);
    }
    const normalized = normalize(question).replace(/full[ -]stack/g,'full stack');
    const intents = recruiterIntents(normalized);
    const query = tokens(question).filter(t=>!['aziz','riju','yourself'].includes(t)).map(t=>t.replace(/\.$/,''));
    const specific = this.documents.filter(d=>['software','research'].includes(d.category) && normalized.includes(normalize(d.title)));
    // Named projects outrank broad intent boosts. Unknown project names get no generic project boost.
    const broadProjects = /(?:what|which|his|software|best|ml|ai|these|those) projects?|^(?:projects?|has he deployed applications|can he build full stack applications)/.test(normalized);
    const routedIntents = intents.includes('evaluation') && !/\brole\b/.test(normalized) ? ['evaluation'] : intents.includes('ml') && intents.includes('projects') ? ['ml'] : intents;
    const selected = specific.length ? [] : routedIntents.flatMap(intent=> intent==='projects' && !broadProjects ? [] : intentRecords[intent] ?? []);
    const corpus = this.documents.map(d => new Set(tokens(`${d.title} ${d.category} ${d.content} ${d.keywords?.join(' ') ?? ''}`)));
    return this.documents.map((document,index)=>{
      const title = new Set(tokens(`${document.title} ${document.keywords?.join(' ') ?? ''}`));
      let score = 0, hits = 0;
      for(const term of query) {
        if(!corpus[index].has(term)) continue;
        hits++;
        score += Math.log(1 + this.documents.length / corpus.filter(set=>set.has(term)).length) * (title.has(term)?2:1);
      }
      const rank = selected.indexOf(document.id);
      const boost = specific.includes(document) ? 100 : rank>=0 ? 40-rank : 0;
      // Intent evidence bypasses lexical coverage, but arbitrary owner questions still require coverage.
      const lexical = hits/Math.max(1,query.length)>=.28 && score>=1.5 ? score : 0;
      return {document,score:boost + lexical};
    }).filter(m=>m.score>0 && (specific.length ? specific.includes(m.document) : selected.length ? selected.includes(m.document.id) : true))
      .sort((a,b)=>b.score-a.score).slice(0,count);
  }
}
export const retriever: Retriever = new LexicalRetriever(knowledge);
