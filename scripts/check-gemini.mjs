// Terminal-only diagnostic; never imported by an API route or browser bundle.
import nextEnv from '@next/env';
import { GoogleGenAI } from '@google/genai';
nextEnv.loadEnvConfig(process.cwd(), true);
if(process.env.NODE_ENV==='production') throw new Error('Run this diagnostic only in development.');
const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim();
console.log('Provider: Gemini');
console.log('Configured Model:', model || '(missing)');
console.log('API Key Present:', key ? 'Yes' : 'No');
if (!key || !model) {
  console.log('Connection Status: Failed');
  console.log('Cause:', !key ? 'MISSING_API_KEY: configure GEMINI_API_KEY in .env.local.' : 'MISSING_MODEL: configure GEMINI_MODEL in .env.local.');
  console.log('Real API request: Not sent (configuration missing)');
  process.exitCode = 1;
} else {
  try {
    const ai = new GoogleGenAI({ apiKey:key, httpOptions:{timeout:12000,retryOptions:{attempts:1}} });
    const response = await ai.models.generateContent({model,contents:'Reply with exactly: GEMINI_CONNECTION_SUCCESS',config:{maxOutputTokens:100}});
    const success = response.text?.trim() === 'GEMINI_CONNECTION_SUCCESS';
    console.log('Connection Status:', success ? 'Connected' : 'Failed');
    // Do not print arbitrary provider output/errors which could echo sensitive values.
    console.log('Response:', success ? 'GEMINI_CONNECTION_SUCCESS' : '(unexpected or empty response)');
    if(!success) process.exitCode=1;
  } catch(error) {
    const status = Number(error?.status || error?.statusCode || 0);
    const category = status===401 || status===403 || (status===400 && /API.?key/i.test(String(error?.message))) ? 'AUTHENTICATION_FAILED' : status===404 ? 'MODEL_UNAVAILABLE' : status===429 ? 'RATE_LIMITED' : status>=500 ? 'SERVICE_UNAVAILABLE' : /timeout|abort/i.test(String(error?.message)) ? 'TIMEOUT' : status===400 ? 'INVALID_PROVIDER_REQUEST' : 'NETWORK_OR_PROVIDER_ERROR';
    console.log('Connection Status: Failed');
    console.log('Cause:', category, status ? `(HTTP ${status})` : '');
    process.exitCode=1;
  }
}
