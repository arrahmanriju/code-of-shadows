export type ChatErrorCode = 'NO_CONTEXT' | 'MISSING_API_KEY' | 'MISSING_MODEL' | 'AUTHENTICATION_FAILED' | 'MODEL_UNAVAILABLE' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'NETWORK_FAILURE' | 'TIMEOUT' | 'INVALID_PROVIDER_RESPONSE' | 'PROVIDER_ERROR' | 'INVALID_INPUT' | 'FORBIDDEN';
export class ChatError extends Error {
  constructor(public code: ChatErrorCode) { super(code); }
}
// Inspect errors locally, return only a fixed safe category. Never expose raw SDK messages.
export function errorCode(error: unknown): ChatErrorCode {
  if (error instanceof ChatError) return error.code;
  const value = error as {status?:number; code?:string; name?:string; message?:string; cause?:{code?:string}} | null;
  const status = value?.status;
  const message = value?.message ?? '';
  if(status===401 || status===403 || /API_KEY_INVALID|API key not valid|UNAUTHENTICATED/i.test(message)) return 'AUTHENTICATION_FAILED';
  if(status===429) return 'RATE_LIMITED';
  if(status===404 || /model.*(not found|not supported)/i.test(message)) return 'MODEL_UNAVAILABLE';
  if(status && status>=500) return 'SERVICE_UNAVAILABLE';
  if(value?.name==='AbortError' || /timeout|timed out/i.test(message)) return 'TIMEOUT';
  if(value?.name==='TypeError' || /fetch failed|network|ECONN|ENOTFOUND/i.test(`${message} ${value?.cause?.code ?? ''}`)) return 'NETWORK_FAILURE';
  return 'PROVIDER_ERROR';
}
