import type { HistoryMessage } from './types';
export const MAX_QUESTION = 600;
export const MAX_BODY_BYTES = 12_000;
export function validateInput(value: unknown): { question: string; history: HistoryMessage[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object.');
  const { question, history = [] } = value as Record<string, unknown>;
  if (typeof question !== 'string' || !question.trim() || question.length > MAX_QUESTION) throw new Error('Question must contain 1–600 characters.');
  if (!Array.isArray(history) || history.length > 6) throw new Error('History must contain at most 6 messages.');
  const clean = history.map(item => {
    if (!item || typeof item !== 'object' || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string' || !item.content.trim() || item.content.length > 2000) throw new Error('Invalid history message.');
    return { role: item.role, content: item.content.trim() } as HistoryMessage;
  });
  return { question: question.trim(), history: clean };
}
export async function readBody(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('Expected application/json.');
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw new Error('Request body too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request body.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('Request body too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('Invalid JSON.'); }
}
