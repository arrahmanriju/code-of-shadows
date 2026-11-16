// Explicit opt-in, development only. Never print raw questions, history, prompts,
// errors, or credentials: even a portfolio visitor can submit sensitive text.
export function chatDebug(event: Record<string, unknown>) {
  if(process.env.NODE_ENV==='development' && process.env.CHAT_DEBUG==='true') console.info('[SHADOW AI]', JSON.stringify(event));
}
