import { answerQuestion } from '@/lib/chat/service';
import { generateAnswer } from '@/lib/chat/provider';
import { limitRequest, requestKey } from '@/lib/chat/rate-limit';
import { readBody, validateInput } from '@/lib/chat/validation';
export const runtime = 'nodejs';
export const maxDuration = 20;
const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') return Response.json({error:'Cross-origin requests are not allowed.',errorCode:'FORBIDDEN',documentIds:[]},{status:403,headers});
  const limit = limitRequest(requestKey(request));
  if (!limit.allowed) return Response.json({error:'Too many questions. Please try again shortly.',errorCode:'RATE_LIMITED',documentIds:[]},{status:429,headers:{...headers,'Retry-After':String(limit.retryAfter)}});
  let input;
  try { input = validateInput(await readBody(request)); }
  catch (error) { return Response.json({error:error instanceof Error ? error.message : 'Invalid request.',errorCode:'INVALID_INPUT',documentIds:[]},{status:400,headers}); }
  const result = await answerQuestion(input.question,input.history,generateAnswer);
  return Response.json(result,{headers});
}
