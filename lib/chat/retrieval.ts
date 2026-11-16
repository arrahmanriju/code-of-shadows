import { knowledge } from './knowledge';
import type { KnowledgeDocument, Match } from './types';

const stopWords = new Set('a an the is are was what which who how tell me about his her he she you your azizur rahman please does do of in on at for and or to can with has have explain details information project projects'.split(' '));
for (const word of ['did','work','worked','done']) stopWords.add(word);
for (const word of ['তার','তিনি','কি','কী','আমাকে','বলুন','বলো','সম্পর্কে','জানতে','চাই','আজিজুর','রহমান']) stopWords.add(word);
export function normalize(text: string) { return text.normalize('NFKC').toLowerCase().replace(/[’']s\b/g, '').replace(/[^\p{L}\p{M}\p{N}+#.]+/gu, ' ').trim(); }
export function tokens(text: string) { return [...new Set(normalize(text).split(/\s+/).filter(t => t && !stopWords.has(t)))]; }
export interface Retriever { retrieve(question: string, limit?: number): Match[] }

// Anchored patterns deliberately avoid turning every mention of a name into a
// biography query (e.g. "Did Riju work at NASA?" must not become an introduction).
export function detectIntent(question: string): 'biography' | 'lexical' {
  const text = normalize(question).replace(/\.+$/,'').replace(/\bazizur rahman\b|\bazizur\b|\baziz\b|\briju\b/g,'owner');
  return /^(?:(?:please )?(?:about|who is|introduce|tell me about|can you introduce|give me an introduction to) (?:owner|yourself)|owner|tell me about yourself|who are you|introduce yourself|hi|hello|হ্যালো|হাই)$/.test(text) ? 'biography' : 'lexical';
}

// Lexical term overlap with inverse document frequency and title/keyword boosts.
// Replace this interface implementation later to add embeddings; no vector search here.
export class LexicalRetriever implements Retriever {
  constructor(private documents: KnowledgeDocument[]) {}
  retrieve(question: string, limit = 3): Match[] {
    const count = Math.min(3, Math.max(0, limit));
    if (detectIntent(question)==='biography') {
      return ['about','education','icpc'].map((id,index)=>({document:this.documents.find(d=>d.id===id)!,score:100-index})).filter(m=>!!m.document).slice(0,count);
    }
    let query = tokens(question);
    const normalized = normalize(question);
    // Owner aliases are not evidence for arbitrary questions about that person.
    query = query.filter(t=>!['aziz','riju','yourself'].includes(t));
    query = query.map(t=>t.endsWith('.')?t.slice(0,-1):t);
    if (/^software projects?$/.test(normalized)) query.push('software');
    else if (/^projects?$/.test(normalized) || /প্রজেক্ট|প্রকল্প/.test(normalized)) query.push('software', 'research');
    const corpus = this.documents.map(d => new Set(tokens(`${d.title} ${d.category} ${d.content} ${d.keywords?.join(' ') ?? ''}`)));
    const matches = this.documents.map((document, index) => {
      const title = new Set(tokens(`${document.title} ${document.keywords?.join(' ') ?? ''}`));
      let score = 0, hits = 0;
      for (const term of query) {
        if (!corpus[index].has(term)) continue;
        hits++;
        const frequency = corpus.filter(set => set.has(term)).length;
        score += Math.log(1 + this.documents.length / frequency) * (title.has(term) ? 2 : 1);
      }
      // Require coverage as well as a nontrivial match; don't pad with unrelated docs.
      const coverage = hits / Math.max(1, query.length);
      return { document, score: coverage >= .28 && score >= 1.5 ? score : 0 };
    });
    return matches.filter(m => m.score > 0).sort((a,b) => b.score - a.score).slice(0, count);
  }
}
export const retriever: Retriever = new LexicalRetriever(knowledge);
