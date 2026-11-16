import 'server-only';
import { GoogleGenAI } from '@google/genai';
import { systemInstruction } from './prompt';
import { ChatError } from './errors';
import { chatDebug } from './debug';
export async function generateAnswer(prompt: string, signal: AbortSignal): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim();
  if (!apiKey) throw new ChatError('MISSING_API_KEY');
  if (!model) throw new ChatError('MISSING_MODEL');
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 12_000, retryOptions: { attempts: 1 } } });
  chatDebug({event:'provider_request',geminiCalled:true,model});
  const response = await ai.models.generateContent({
    model, contents: prompt,
    config: { systemInstruction, temperature: .1, maxOutputTokens: 600, abortSignal: signal },
  });
  const text = response.text?.trim();
  if (!text || text.length > 6000) throw new ChatError('INVALID_PROVIDER_RESPONSE');
  // Generated URLs are never trusted. Sources are attached from retrieved records.
  return text.replace(/https?:\/\/\S+|mailto:\S+/gi, '[see sources]');
}
