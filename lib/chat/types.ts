export type KnowledgeDocument = { id: string; title: string; category: string; content: string; sourceUrl?: string; keywords?: string[] };
export type Match = { document: KnowledgeDocument; score: number };
export type HistoryMessage = { role: 'user' | 'assistant'; content: string };
export type ChatSource = { id: string; title: string; url?: string };
export type ChatResponse = { answer: string; sources: ChatSource[]; mode: 'gemini' | 'local'; source: 'gemini' | 'local-fallback'; intent?: import('./conversation').Intent; documentIds: string[]; errorCode?: import('./errors').ChatErrorCode; reason?: 'unavailable' | 'no_context' };
