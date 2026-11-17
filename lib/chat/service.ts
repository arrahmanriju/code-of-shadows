import { retriever, detectIntent } from './retrieval';
import { fallback } from './fallback';
import { buildPrompt } from './prompt';
import type { ChatResponse, HistoryMessage } from './types';
import { ChatError, errorCode } from './errors';
import { chatDebug } from './debug';
import { classifyIntent, conversationalReply, resolveQuestion } from './conversation';
type Provider = (prompt: string, signal: AbortSignal) => Promise<string>;
export async function answerQuestion(question: string, history: HistoryMessage[], provider: Provider, timeoutMs = 13_000): Promise<ChatResponse> {
  const intent = classifyIntent(question, history);
  if(intent !== 'PORTFOLIO_QUESTION' && intent !== 'HIRING_SUITABILITY') return conversationalReply(intent);
  const resolved = resolveQuestion(question, history);
  if(resolved.unresolved) return {...conversationalReply('OUT_OF_SCOPE'),intent,answer:'Which project do you mean? Please mention its name so I can share the right portfolio details.'};
  // Only resolve short referential follow-ups from the last USER turn; assistant text is never retrieved as evidence.
  const followup = /^(and |what about |আর |এবং )|\b(it|that|this|its)\b|এটি|সেটি/i.test(question) && question.length < 100;
  const previous = history.filter(m => m.role === 'user').at(-1)?.content;
  const direct = retriever.retrieve(resolved.query);
  const contextual = followup && previous && resolved.query===question ? retriever.retrieve(`${previous} ${question}`) : [];
  const matches = contextual.length ? contextual : direct;
  const metadata = { question: '[redacted]', questionLength:question.length, intent, retrievalIntent:detectIntent(resolved.query), retrieved:matches.map(m=>({id:m.document.id,score:m.score})), model:process.env.GEMINI_MODEL || '(missing)' };
  chatDebug({...metadata,event:'retrieval',providerInvoked:matches.length>0});
  if (!matches.length) {chatDebug({event:'complete',geminiCalled:false,geminiSuccess:false,localFallback:true,errorCode:'NO_CONTEXT'});return {...fallback([], 'no_context', question),intent};}
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const answer = await Promise.race([
      provider(buildPrompt(question,history,matches),controller.signal),
      new Promise<never>((_,reject) => { timer = setTimeout(() => {controller.abort(); reject(new ChatError('TIMEOUT'));},timeoutMs); }),
    ]);
    if (!answer.trim()) throw new ChatError('INVALID_PROVIDER_RESPONSE');
    chatDebug({event:'complete',geminiSuccess:true,localFallback:false});
    return {answer,sources:matches.map(({document:d})=>({id:d.id,title:d.title,url:d.sourceUrl})),mode:'gemini',source:'gemini',intent,documentIds:matches.map(m=>m.document.id)};
  } catch (error) { const code=errorCode(error);chatDebug({event:'complete',geminiSuccess:false,localFallback:true,errorCode:code});return {...fallback(matches,'unavailable',question,code),intent}; }
  finally { if(timer) clearTimeout(timer); }
}
